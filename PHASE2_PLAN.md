# Phase 2 Plan — Process Flow Explorer

## A. Summary & Scope
Phase 2 demonstrates how a Process Flow Explorer adds decision-making value on a realistic public-sector Permit Application process. We will load a richer synthetic event log that captures real-world variants (payment issues, documentation churn, staff reassignment, escalations, SLA breaches, outcomes). Users can incrementally reveal the flow from START, then steer the reveal by selecting newly exposed states. They can right‑click to decouple transitions by department/person, collapse subflows into meta-nodes, and open a cases table for any state/edge. Global controls let users reveal the full flow or filter to the top X% of complete paths.

Non-goals (Phase 2 only):
- No CSV upload/back end persistence (still in-memory data). 
- No advanced layout engines (keep BFS-ish deterministic layout; do not integrate ELK/dagre).
- No probabilistic simulation/what-if or forecasting.
- No multi-project selector or multi-tab comparisons.
- No theming overhaul; keep dark UI with modest visual extensions only.

## B. Data Design
### Event schema (final)
TypeScript interface for synthetic log rows:
```ts
type ISO = string; // ISO-8601 timestamp
type CaseId = string;

type Event = {
  caseId: CaseId;
  activity: string;                 // state name
  timestamp: ISO;                   // event time
  resource: string;                 // person/worker id
  department: string;               // e.g., Intake, Finance, Legal
  attributes?: {
    amountDue?: number;
    amountPaid?: number;
    docsCount?: number;
    docQuality?: 'low'|'medium'|'high';
    channel?: 'online'|'in-person';
    priority?: 'normal'|'priority';
    notes?: string;
  };
};
```

### Activities / states catalog
Representative states for a permit case (superset; not all cases traverse all):
- START (synthetic)
- Intake: Submit Application (Online/In‑person), Intake Review
- Payment: Payment Due, Payment Received, Payment Underpaid, Payment Late, Payment Corrected
- Docs: Docs Check, Request More Docs, Re-Upload Docs, Resubmission Review, Scan/Quality Check
- Assignment: Assign To Staff, Reassign Staff
- Processing: Initial Review, Rework, Second Review
- Escalation: Escalate to Supervisor, Escalate to Legal
- SLA: SLA Breach (marker state)
- Decision: Approved, Rejected, Withdrawn, Cancelled, Appeal, Appeal Review
- DONE (terminal synthetic if needed)

Mapping from events to states: `state = event.activity` (enumerated above). START is attached to the first real activity per case; terminal states are {Approved, Rejected, Withdrawn, Cancelled, Appeal Review→(Approved/Rejected)}.

### Transitions and stats
- Transitions: For each case, sort its events by timestamp; add `START → firstActivity`; for each consecutive pair `(a→b)`, add directed edge `(a,b)`.
- Per-edge stats maintained incrementally:
  - count
  - durations: `Δ = time(b) - time(a)`
  - mean, median, min, max, p90
  - uniqueResources (|{resource across traversals}|)
  - uniqueDepartments (|{department across traversals}|) using the source event’s department (or both via a tuple if needed)

Pseudocode (edge aggregation):
```ts
for case in groupBy(events, e => e.caseId):
  sort(case.events by timestamp)
  addTraversal(START, case.events[0])
  for i in [0..n-2]:
    a = case.events[i]
    b = case.events[i+1]
    Δ = time(b)-time(a)
    edge = getOrMakeEdge(a.activity, b.activity)
    edge.count++
    edge.durations.push(Δ)
    edge.resources.add(a.resource)
    edge.departments.add(a.department)
// finalize stats per edge: mean/median/min/max/p90
```

### Complete paths (“traces”)
- For each case, `trace = [START, a1, a2, ..., terminal]` where terminal ∈ {Approved, Rejected, Withdrawn, Cancelled} (or last observed activity if incomplete).
- Build frequency map `freq[traceKey] += 1` where `traceKey = activities.join('>')`.
- Top X% coverage algorithm (minimal-ish set):
  1) Compute `freq` and total cases `N`.
  2) Sort traces by frequency desc, then by lexical for stability.
  3) Accumulate until `covered/N ≥ X%`.
  4) Return the selected trace keys and coverage stats (selectedCount, coverage%).
  - Note: This is a greedy cover by frequency; exact minimal set is NP-hard under constraints, but greedy is practical and expected for reporting.

## C. UX & Interaction Spec
### Left-click (refined stepwise reveal)
- Start state: only START visible, no edges at step 0.
- When the user clicks “Next step” or increases step from 0 → 1: reveal immediate neighbors of START.
- Left-click on any newly revealed node N sets N as the “frontier root”, revealing only onward states reachable from N in subsequent steps. Previous reveals remain visible unless explicitly collapsed.
- Re-clicking a previously selected node moves frontier to that node.

State diagram (simplified):
```
[Idle]
  └─ step++ or Show Full Flow → [RevealFrom(roots=[START])] → show neighbors
        └─ left-click node N → set roots=[N] → [RevealFrom(roots=[N])]
              └─ left-click node M → roots=[M] (accumulate visibility; do not hide older unless collapsed)
```

### Right-click context menu
Targets: Node or Edge. Menu opens on right-click or keyboard (Shift+F10/Menu key).

Menu items (enablement rules):
- Decouple by Department (enabled if target has traversals across ≥2 depts and not already decoupled on that target)
- Decouple by Person (enabled if target has ≥2 resources and not already decoupled)
- Collapse from here (Node only; enabled if node has outgoing edges; disabled on terminal)
- Expand (Node only; enabled on a collapsed meta-node)
- Show cases here (Node or Edge; enabled if target has ≥1 traversal/case)

Context menu outcomes:
- Decouple: splits outgoing transition(s) of a node (or the given edge) into groups per dimension; draws separately labeled edges with their own counts/durations.
- Collapse from here: folds downstream subgraph into a single meta-node with aggregate counts/durations; edge label shows a badge `+k nodes / +m edges` collapsed. “Expand” restores.
- Show cases here: populates the right panel with a table of cases at the node or traversing the edge.

### Wireframes (ASCII)
Default view (no decouple, no collapse):
```
┌──────── Controls (left) ────────┐  ┌──────────── Canvas (center) ────────────┐  ┌───── Details (right) ─────┐
│ [Show full flow]                │  │  START → A → B → C → Decision           │  │ [Cases table empty]       │
│ Top X% slider: [====|---] 80%   │  │          ↘ D → Review → Decision        │  │ (updated via context menu)│
└─────────────────────────────────┘  └──────────────────────────────────────────┘  └───────────────────────────┘
```

After decoupling by Department (at node B):
```
…  B ──Finance──▶ C
     └─Intake ───▶ D
     └─Legal  ───▶ Escalation
(separate edges w/ counts, durations)
```

After collapsing from node C:
```
C ──▶ [Collapsed ▼]
      (Σcounts, μ/med/min/max/p90)
      (+7 nodes, +12 edges)
```

Cases table panel (invoked via “Show cases here”):
```
Details — Cases at: B (Department: Finance)
┌────────┬──────────────┬──────────────┬───────────┬─────────────┬──────────────────────┐
│ caseId │ enteredAt    │ exitedAt     │ duration  │ dept/person │ anomalies           │
├────────┼──────────────┼──────────────┼───────────┼─────────────┼──────────────────────┤
│ C-102  │ 2025-01-03   │ 2025-01-04   │ 1.2d      │ Fin / u123  │ underpaid, resubmit │
│ …      │ …            │ …            │ …         │ …           │ …                    │
└────────┴──────────────┴──────────────┴───────────┴─────────────┴──────────────────────┘
```

### Panel behavior changes
- Remove Phase‑1 left-click details updates. The right panel updates only via “Show cases here”.
- Selecting nodes/edges via left-click still highlights, but does not change the panel.

## D. Visualization & Layout
### Duration encoding on edges (two options)
Option 1 — Length-proportional (layout-weighted spacing):
- Idea: Place targets farther to the right for longer mean durations; normalize per layer.
- Pros: Direct mapping, intuitive for timelines; good when paths are mostly left→right.
- Cons: Layout instability as data or filters change; can cause overlaps/crossings; compresses short edges making labels crowded.

Option 2 — Style encoding (recommended default):
- Keep deterministic BFS layout for positional stability.
- Encode mean duration via color ramp (e.g., cool→warm) and optional dash animation speed (longer = slower, subtle); keep thickness mapped to count (log‑scaled).
- Pros: Stable layout, readable labels, preserves mental map; simple to compute; performant.
- Cons: Indirect mapping; requires legend; color perception varies (choose accessible palette).

Default choice: Option 2. Use width = f(count) [log scale], color = f(mean duration) [perceptually uniform ramp, e.g., blue→orange], and small label showing μ or p90 where space permits.

### Other visual affordances
- Hover: lighten stroke + raise z-order; Selection: accent color outline.
- Collapsed meta-node: pill with badge `+nodes/edges`; dashed outline to indicate fold.
- Decoupled edges: group labels like `Finance`, `Legal` under the edge count; muted connector dots for group origin.

### Performance considerations
- Expected demo sizes: 30–60 nodes, 60–150 edges pre-decouple; decouple can 2–4× edges locally.
- Memoize computed views (visibility, decouples, collapses).
- Avoid re-layout on every interaction; recompute only when duration-encoding option/layout weights change.
- Limit DOM: avoid heavy SVG filters; keep labels short; virtualize cases table.

## E. Architecture & Implementation Plan
### Impacted Phase‑1 modules
- `src/types/` — extend types for department/resource/attributes; edge stats.
- `src/lib/graph.ts` — build edges with stats; track unique resources/departments.
- `src/lib/step.ts` — reveal from dynamic roots; support “Show full flow”.
- `src/lib/layout.ts` — optional duration‑weighted spacing (if Option 1 is toggled).
- `src/state/store.ts` — expanded state/actions for reveal roots, decouple, collapse, cases panel, top X% traces, global controls.
- `src/components/FlowCanvas.tsx` — new interactions (click/ctxmenu), edge coloring, collapsed meta-node rendering.
- `src/components/ControlsPanel.tsx` — replace with Show Full Flow + Top X% slider.
- `src/components/DetailsPanel.tsx` — repurpose as Cases Table panel.

### New utilities (pure functions)
- `traceMining.ts`
  - `mineTraces(events) -> Map<traceKey, {count, cases: CaseId[]}>`
  - `topPercentTraces(freqMap, pct) -> {selected: Set<traceKey>, coveragePct: number, selectedCount: number}`
- `stats.ts`
  - `quantiles(arr:number[], q:[0.5,0.9])`, `mean/min/max`
- `decouple.ts`
  - `decoupleByDimension(graph, target, dim:'department'|'resource') -> graphPatch`
- `collapse.ts`
  - `collapseFrom(graph, nodeId) -> {metaNode, patch, collapsedSet}`
- `visible.ts`
  - `computeVisibleFromRoots(graph, roots:Set<NodeId>, step:number) -> {nodes, edges}`

Pseudocode — reveal from selectable roots:
```ts
function computeVisibleFromRoots(g, roots, step):
  dist = bfsFromRoots(g, roots)
  visible = {nodes:Set(roots), edges:Set()}
  for e in g.edges:
    if dist[e.target] != null && dist[e.target] <= step:
      visible.edges.add(e.id)
      visible.nodes.add(e.source); visible.nodes.add(e.target)
  return visible
```

### State management (Zustand)
Shape additions:
```ts
type Decouple = { dim:'department'|'resource'; targets:Set<string> };
type Collapse = { from: string; nodes:Set<string>; edges:Set<string>; metaId:string };
type CasesPanel = { target:{type:'node'|'edge', id:string}|null; rows: CaseRow[] };

state = {
  graph, layout,
  step, maxStep,
  roots: Set<NodeId>,            // current reveal frontier roots
  revealed: { nodes:Set, edges:Set },
  decouples: Map<string, Decouple>,
  collapses: Map<string, Collapse>,
  showFullFlow: boolean,
  topPercent: number,            // 0–100
  topTraceSet: Set<traceKey>,
  casesPanel: CasesPanel,
  ctxMenu: { open:boolean, pos:{x,y}, target:{type:'node'|'edge', id:string}|null },
}
```
Actions (high-level):
- `revealFrom(nodeId)` → `roots=[nodeId]`, step++/fit.
- `showFullFlow()` → toggles `showFullFlow=true` and reveals all.
- `setTopPercent(p)` → recompute `topTraceSet` and filter view.
- `decouple(target, dim)` → apply group split view.
- `collapseFrom(nodeId)` / `expand(nodeOrMeta)`.
- `showCases(target)` → populate panel rows.
- `openCtxMenu(target, pos)` / `closeCtxMenu()`.

### Context menu architecture
- Render via a portal anchored to the app root; absolute position near pointer; flip to stay onscreen.
- A11y: `role="menu"` with `role="menuitem"`, keyboard open (Shift+F10/Menu), arrow navigation, ESC to close, focus trap.
- Click outside/blur closes; context menu does not hijack left-click.

### Testing strategy
- Unit (Vitest):
  - `stats.quantiles`, `traceMining` (trace counts, stable ordering), `topPercentTraces`.
  - `computeVisibleFromRoots` correctness; `decoupleByDimension` grouping; `collapseFrom` aggregation counts/durations.
- Component tests (Testing Library):
  - Context menu enable/disable per target; menu actions dispatch correct store updates.
  - Cases table renders expected rows given a known target.
- E2E (Playwright):
  - Flow: decouple (dept) → collapse from node → show cases (edge) → top X% slider filters graph; assert counts/labels update and panel shows cases.

### Dependencies
- No new libraries required. Implement quantiles in `stats.ts`. Keep React Flow built‑in edges. Use existing Zustand/Tailwind. Optional: tiny `floating-ui` for menu positioning (only if custom positioning becomes complex), but default plan avoids it.

## F. Milestoned Task List
1) Data model + stats groundwork
   - Goal: Extend types and graph build to include department/resource/attributes and edge stats (mean/median/min/max/p90, unique counts).
   - Acceptance: Unit tests pass for stats and graph aggregation; UI still builds unchanged.
   - Code: `src/types/*`, `src/lib/graph.ts`, `src/lib/stats.ts`(new), tests.
   - Tests: stats unit tests; graph edges expose stats; unique dept/resource counts.
   - Demo: Run unit tests; log a sample edge’s stats in test.

2) Reveal-from-selection (roots) engine
   - Goal: Compute visibility from dynamic roots; preserve previously revealed elements.
   - Acceptance: Unit tests for `computeVisibleFromRoots`; store exposes `roots` and `revealFrom` action (no UI wiring yet).
   - Code: `src/lib/visible.ts`(new), `src/state/store.ts` slice, tests.
   - Demo: Unit tests show correct visibility as roots change.

3) Context menu shell (accessible)
   - Goal: Implement portal-based menu with keyboard support and enablement rules (no actions wired yet).
   - Acceptance: Component tests for open/close, focus, and disabled states.
   - Code: `src/components/ContextMenu.tsx`(new), minimal styles; store `ctxMenu` state.
   - Tests: RTL component tests.
   - Demo: Dev: right-click shows menu; items appear disabled/enabled appropriately.

4) Decouple by Department
   - Goal: Right-click → “Decouple by Department” splits outgoing edges/groups.
   - Acceptance: E2E validates distinct department edges/labels and counts; unit tests validate grouping logic.
   - Code: `src/lib/decouple.ts`, store actions, canvas rendering branch.
   - Tests: unit (grouping), E2E step.
   - Demo: Right-click node with mixed departments; see split edges.

5) Decouple by Person
   - Goal: Add “Decouple by Person”.
   - Acceptance: Similar to dept; hides duplicates when single-resource.
   - Code: extend decouple; store flags; canvas tweaks.
   - Tests: unit + E2E.
   - Demo: Right-click → person split visible.

6) Collapse subgraph from node
   - Goal: “Collapse from here” folds downstream; “Expand” restores.
   - Acceptance: Collapsed meta-node shows aggregates and badge; expand restores previous layout.
   - Code: `src/lib/collapse.ts`, store, canvas meta-node component.
   - Tests: unit (aggregation math), E2E.
   - Demo: Collapse from C; see meta-node and counts.

7) Cases table panel via context menu
   - Goal: Right-click → “Show cases here” populates right panel with cases at node/edge.
   - Acceptance: Panel shows rows with required columns; left-click no longer updates panel.
   - Code: store `casesPanel`, `DetailsPanel` repurpose; target selection handling.
   - Tests: component test for table; E2E open panel.
   - Demo: Show cases for B or edge B→C.

8) Global controls: Show full flow + Top X% slider
   - Goal: Replace left controls; implement full flow and top X% trace filtering.
   - Acceptance: Slider filters to greedy top trace set; coverage % + trace count shown.
   - Code: `traceMining.ts`, store fields/actions, `ControlsPanel` redo.
   - Tests: unit for top% selection; E2E slider interaction.
   - Demo: Move slider; graph filters; counters update.

9) Duration encoding finalize
   - Goal: Implement Option 2 (color ramp + optional dash speed). Provide toggle to compare Option 1 in dev-only flag.
   - Acceptance: Legend shows duration mapping; edges recolor; labels readable.
   - Code: canvas styling hooks; legend snippet in controls.
   - Tests: visual assertions (DOM classes); unit for color scale mapping.
   - Demo: Toggle to view encoding; inspect edges.

10) Polish & docs
   - Goal: Update README/AGENTS with Phase 2 features; add screenshots/gifs; ensure tests are green.
   - Acceptance: Lint clean; CI green; docs merged.
   - Code: docs only.
   - Tests: n/a.
   - Demo: Build/run/tests; share GIF.

## G. Risks & Alternatives
- Edge length vs. layout stability: literal-length mapping can destabilize the layout. Mitigation: keep Option 2 as default; gate Option 1 behind a dev toggle.
- Decouple combinatorics: splitting by person can explode edges for busy nodes. Mitigation: cap by top K resources + “Other” bucket; show a warning badge.
- Collapse semantics: aggregating durations across branches can skew stats. Mitigation: compute aggregates per inbound edge separately where needed; clearly label as “aggregate”.
- Performance: Large graphs after decouple/collapse could slow React Flow. Mitigation: memoize transforms; throttle interactions; hide minor paths when Top% < 100.
- Accessibility: Context menu complexity. Mitigation: focus management, ARIA roles, keyboard triggers; keep menu items succinct.

## Next 3 Step Options (for approval)
- Approve Milestone 1: Data model + stats groundwork.
- Approve Milestone 2: Reveal-from-selection (roots) engine.
- Approve Milestone 3: Context menu shell (accessible) before wiring actions.
# Phase 2 Plan — Process Flow Explorer (Permit Application)

## A. Summary & Scope
Phase 2 showcases the Process Flow Explorer on a realistic public‑sector Permit Application scenario with rich variants and visible bottlenecks. We will load a synthetic but realistic event log (tax payment, documentation churn, reassignment, escalations, outcomes) sized for demos and source control. We start very small (2–3 illustrative cases) and will scale complexity incrementally. Interactions include stepwise left‑click expansions with faint “stub” hints, aided “Top N paths” and “Expand All”, decoupling transitions by department/person (propagates downstream so each person/department owns a full path to terminal), collapsing downstream complexity, and inspecting cases via context menus. The left pane is redesigned for these controls while keeping the dark, fast, minimal UX.

Non‑Goals (to control scope in Phase 2):
- No CSV upload or backend persistence (keep in‑memory synthetic data).
- No advanced layout engines (keep deterministic BFS‑style layout with optional duration‑aware extension; no ELK/dagre).
- No forecasting/simulation, conformance checking, or multi‑dataset comparison.
- No theming overhaul; minimal visual additions only.
- No granular role‑based access or auth.
- No SLA state modeling (omitted to keep the event log compact).

## B. Data Design
### Final event schema (TypeScript)
```ts
type ISO = string;
type CaseId = string;

type Event = {
  caseId: CaseId;
  activity: string;                 // state name
  timestamp: ISO;                   // ISO-8601
  resource?: string;                // person/worker id
  department?: string;              // e.g., Intake, Finance, Legal
  attrs?: {
    amountDue?: number;
    amountPaid?: number;
    docsCount?: number;
    docQuality?: 'low'|'ok'|'high';
    channel?: 'online'|'in-person';
    priority?: 'normal'|'priority';
  };
};
```

### Activities / states and mapping (state machine sketch)
Superset catalog (per case traverses a subset):
- START (synthetic)
- Intake: Submit Application (Online/In‑person), Intake Review
- Payment: Payment Due, Payment Received, Payment Underpaid, Payment Late, Payment Corrected
- Docs: Docs Check, Request More Docs, Re‑Upload Docs, Resubmission Review, Scan/Quality Check
- Assignment: Assign To Staff, Reassign Staff
- Processing: Initial Review, Rework, Second Review
- Escalation: Escalate to Supervisor, Escalate to Legal
- Decision: Approved, Rejected, Withdrawn, Cancelled, Appeal, Appeal Review

Mapping rule: `state = activity` (direct); attach `START → firstActivity` for each case. Terminal states: {Approved, Rejected, Withdrawn, Cancelled} (Appeal → Appeal Review → Approved/Rejected terminal).

Dataset sizing & complexity (demo‑friendly)
- Initial dataset: 2–3 cases illustrating: (1) one staff taking much longer than others, (2) some internal rework loop, (3) document re‑request (asked twice), (4) workload anomaly where a single person handles disproportionately many cases. Add a few more cases later to show “top paths” without exploding size.

### Transitions and duration stats
- Sort events within each case by timestamp; for each consecutive pair `(a→b)`, add directed edge `(a.activity, b.activity)` with traversal `(caseId, a.timestamp, b.timestamp, Δ)`.
- Per‑edge aggregation:
  - count
  - durations array: Δ = time(b) − time(a)
  - mean, median, min, max, p90
  - uniqueResources (count of distinct `a.resource`)
  - uniqueDepartments (count of distinct `a.department`)
- Loops/rework: edges where source == target or where cycles exist are allowed; stats accumulate normally.

Pseudocode:
```ts
for (case of groupBy(events, e=>e.caseId)) {
  sort(case.events, by timestamp)
  addEdge(START, e0.activity, {Δ:0, caseId})
  for i in 0..n-2 {
    a = events[i]; b = events[i+1]
    Δ = t(b) - t(a)
    edge = getOrMakeEdge(a.activity, b.activity)
    edge.count++
    edge.durations.push(Δ)
    if (a.resource) edge.resources.add(a.resource)
    if (a.department) edge.departments.add(a.department)
  }
}
for each edge: finalize stats = {mean, median, min, max, p90}
```

### Complete paths and Top N ranking
- Complete path (“trace”): ordered list of states from START to a terminal for a given case.
- Build frequency map `freq[traceKey]` where `traceKey = states.join('>')`.
- Rank paths by frequency desc (stable tie‑break: lexical of key).
- Select Top N: first N keys; compute coverage = (sum of their frequencies) / total cases.

Pseudocode:
```ts
traces = map()
for (case of cases) traces[key(case.states)]++
sorted = sortBy(traces.entries, (-count, key))
topN = take(sorted, N)
coverage = sum(count(topN)) / totalCases
```

## C. UX & Interaction Spec
### Manual navigation (left‑click)
- Step 0: only START visible; no edges.
- First expansion: left‑click START (or press Enter when focused) → reveal its outgoing neighbors + edges.
- Subsequent expansions: left‑click any newly revealed node to append its reachable next states/edges into the current view, repeating until a terminal is reached.
- Terminal mark: nodes with no outgoing transitions in dataset show an end‑cap badge (e.g., ◦ or ⦿ with “terminal”).
- Expandability hints: if a node has further transitions not yet expanded, draw faint short “stub” segments (light lines) emanating towards each hidden neighbor.

State diagram (manual expansion):
```
[Idle]
  └─ click START → [Expand(S)] → show neighbors of S + edges
        └─ click node N → [Expand(N)] → append neighbors of N (keep previous visible)
              └─ if N has no outgoing → mark terminal
```

### Aided navigation (global controls)
- Expand All: reveals the full graph (all nodes/edges) in one action.
- Top N most common complete paths: reveals only edges/nodes participating in the Top N traces; each path labeled with its coverage % in the left pane list. Manual expansions and collapses can be performed subsequently without resetting.

### Decoupling transitions (right‑click context menu)
- Default view aggregates transitions across departments/persons.
- Right‑click on a state (or a pertinent edge) to open menu:
  - Decouple by Department
  - Decouple by Person
- Effect (propagating scope): split outgoing transitions into grouped edges per chosen dimension and propagate that grouping downstream to terminals. From the decouple origin onward, each department/person sees a full, separate path until terminal (upstream remains aggregated). Each group shows its own counts/durations along the entire downstream path.
- Visual decoupling cue: nodes/edges that are eligible show a small “stacked” dot badge.

Enable/disable rules:
- Decouple by Department: enabled if ≥2 departments observed among traversals; disabled otherwise.
- Decouple by Person: enabled if ≥2 resources observed; disabled otherwise.
- On edges: options enabled if the traversals of that specific edge meet criteria.

### Collapse to reduce complexity (right‑click)
- Node menu: “Collapse Following Transitions” → fold all reachable downstream nodes/edges into a single collapsed meta‑node with aggregated stats (Σ counts, μ/med/min/max/p90). The collapsed node shows badge “+k nodes / +m edges”.
- Collapsed node menu: “Expand” restores the original subgraph.
- Collapsing affects visualization only; raw data unchanged.

### Case inspection via context menu
- Remove Phase‑1 left‑click table behavior.
- New menu item “Show cases here” on state/edge updates the right panel with a table of cases at the state (enteredAt from first arrival; exitedAt from first departure) or traversing the edge (enteredAt = source ts, exitedAt = target ts). Columns: caseId, enteredAt, exitedAt, duration, department/person, anomalies (e.g., underpaid, missing/wrong docs, low quality).

### Left pane redesign (controls)
- Expand All (button)
- Top N paths (slider/input): N with per‑path coverage list and total coverage %
- Optional toggle (proposal): “Use coverage threshold instead of N” (if UX proves useful in demos)

### Wireframes (ASCII)
Default view with faint stubs:
```
┌ Left Pane ───────────────┐  ┌──────────── Canvas ────────────────────────────────┐  ┌ Right Panel ──────────┐
│ [Expand All]             │  │   START                                             │  │ [Cases (context-driven)]│
│ Top N: [==|-----] 3      │  │     ├─ A ──• (stub to B, C)                         │  │                         │
│                           │  │     └─ D (terminal ◦)                              │  │                         │
└───────────────────────────┘  └────────────────────────────────────────────────────┘  └─────────────────────────┘
```

After decoupling by department:
```
B
├─(Finance)──▶ C    (count μ)
├─(Intake) ──▶ D    (count μ)
└─(Legal)  ──▶ Escalation (count μ)
```

After “Collapse Following Transitions” from C:
```
C ──▶ [Collapsed ▼]  (+7 nodes, +12 edges)
       Σcount  μ/med/min/max/p90
```

Cases table panel:
```
Cases at: Edge B→C (Dept=Finance)
┌────────┬────────────────┬────────────────┬──────────┬─────────────┬───────────────────┐
│ caseId │ enteredAt      │ exitedAt       │ duration │ dept/person │ anomalies         │
├────────┼────────────────┼────────────────┼──────────┼─────────────┼───────────────────┤
│ P‑102  │ 2025‑01‑09 10: │ 2025‑01‑10 14: │ 1.2d     │ Fin / u123  │ underpaid         │
└────────┴────────────────┴────────────────┴──────────┴─────────────┴───────────────────┘
```

Aided “Top N paths” view + manual expansions:
```
Left Pane: Top N=3 →
  1) START>A>B>C>Approved (42%)
  2) START>A>B>Rework>B>C>Approved (28%)
  3) START>A>DocsCheck>ReqMore>Re‑Upload>C>Rejected (12%)
Total coverage: 82%
Canvas: only edges/nodes from these paths shown; user can still right‑click a node to Decouple or Collapse, or left‑click to expand stubs into less common branches.
```

## D. Visualization & Layout
### Duration encoding (visual emphasis; compact by default)
Default (recommended): Color scale for duration + width for throughput
- Keep deterministic BFS layout. Map counts → stroke width (log‑scaled). Map mean duration → color ramp from green (faster) to red (slower). Provide a small legend.
- Edge labels: show count as primary label (as today). On hover, show a tooltip with duration stats (mean and p90; optionally min/max) and unique dept/person counts.

Optional (toggle): Duration‑weighted spacing (edge length ∝ mean)
- As an alternative view, allow turning on duration‑weighted layer spacing (see technique below) for demos that benefit from physical length cues.

Technique (optional): Duration‑weighted layer spacing with local edge targets
- Within each layer transition (L→L+1), compute desired horizontal gap `d_e = map(μ_e, μ_min..μ_max → [d_min, d_max])`. Place targets to satisfy `x_t ≥ x_s + d_e` with greedy conflict resolution and clamps.
- Trade‑offs: pros—perceptual proportionality; cons—potential widening/crossings. Keep off by default.

### Bottleneck mappings and affordances
- Thickness: log(count) within [0.8, 4.0] px (throughput).
- Color: green→red ramp by mean (or p90) duration.
- Hover: lighten + raise z‑order; Selection: accent outline; Terminal: end‑cap badge; Stubs: faint, short, non‑interactive lines.
- Labels/tooltips: always show count on edge; tooltip on hover shows μ and p90 (and optionally min/max) duration.

### Performance & React Flow notes
- Target size: ~40–70 nodes, 80–200 edges; decoupling can locally 2–4× edges.
- Memoize visible graph derivations (roots, Top N, decouple, collapse). Throttle fitView.
- Avoid expensive SVG effects; shorten labels; consider virtualized cases table.

## E. Architecture & Implementation Plan
### Impacted Phase‑1 modules
- `src/types/*`: extend types for department/resource/attrs; edge stats.
- `src/lib/graph.ts`: enrich aggregation (durations, quantiles, uniques).
- `src/lib/step.ts`: generalize to visibility from dynamic roots and “Expand All”.
- `src/lib/layout.ts`: duration‑aware layer spacing (opt‑in toggle) and clamps.
- `src/state/store.ts`: new slices for manual expansion, aided selection, decouple, collapse, cases panel, and context menu.
- `src/components/FlowCanvas.tsx`: click/ctxmenu interactions, stubs, terminal badges, edge styling hooks.
- `src/components/ControlsPanel.tsx`: replace with Expand All + Top N.
- `src/components/DetailsPanel.tsx`: repurpose to cases table (context‑driven only).

### New utilities (pure)
- `stats.ts`: mean, median, p90, min/max.
- `traceMining.ts`: `mineTraces(events)`; `topNTraces(freqMap, N)` → {selected:Set, coverage%, perPath list}.
- `visible.ts`: `computeVisibleFromExpanded(graph, expanded:Set<NodeId>)` and stubs computation.
- `decouple.ts`: `decoupleByDimension(graph, target, dim, scope:'downstream')` returns a segmented view that propagates grouping from target to all reachable downstream edges/nodes, producing per‑group paths to terminals.
- `collapse.ts`: `collapseFollowing(graph, nodeId)` aggregates downstream into a meta‑node and reversible patch.
- `durationLayout.ts`: `applyDurationSpacing(graph, stats)` computing x‑positions with clamps (optional view toggle).

### State (Zustand) — shape & actions
```ts
type Target = { type:'node'|'edge'; id:string };
state = {
  graph, layout,
  expanded: Set<NodeId>,          // nodes expanded via left-click
  visible: { nodes:Set, edges:Set, stubs: Stub[] },
  decouples: Map<string, {dim:'department'|'person', scope:'downstream', groups:Set<string>}>,
  collapses: Map<string, {metaId:string, nodes:Set, edges:Set}>,
  topN: number, topNSet: Set<TraceKey>, topNCoverage: number,
  showFull: boolean,
  ctxMenu: {open:boolean, pos:{x,y}, target:Target|null},
  casesPanel: { target:Target|null, rows: CaseRow[] },
}
actions = {
  expand(nodeId), expandAll(), setTopN(n),
  decouple(target, dim, scope='downstream'), collapseFrom(nodeId), expandCollapsed(metaId),
  showCases(target), openCtxMenu(target,pos), closeCtxMenu(),
  recomputeVisible(), applyDurationLayout(enabled:boolean),
}
```

### Context menu architecture
- Portal anchored to root; absolute positioning near cursor; flip to viewport.
- A11y: `role="menu"` and `role="menuitem"`, keyboard open (Shift+F10/Menu), arrow keys, ESC to close, focus trap.
- Menu enables/disables items per target stats (decouple availability, terminal nodes, collapsed nodes).

### Testing Strategy
- Unit: `stats` (quantiles), `traceMining` (ranking/coverage), `visible` (stubs & terminal detection), `decouple` (downstream propagation grouping), `collapse` (aggregation correctness), `durationLayout` (gap mapping/clamps; only if toggle on).
- Component: context menu open/close; enablement logic per node/edge; terminal badges; stubs presence for expandable nodes.
- E2E (Playwright): manual expand → decouple (dept/person, downstream propagation) → collapse from node → show cases (edge) → adjust Top‑N slider; assert DOM edges/labels (counts always visible; hover tooltip shows duration) / panel rows and coverage list update as expected.

### Dependencies
- Default: no new deps required.
- Optional (if positioning becomes complex): `@floating-ui/dom` for robust context menu placement (justify only if needed).
- Optional (tooltip): use lightweight custom tooltip or simple title attribute; avoid new dep unless necessary.

## F. Milestoned Task List (one‑step‑at‑a‑time)
1) Data & stats enrichment
   - Goal: Extend graph build with edge stats (mean/median/min/max/p90), unique dept/resource; finalize types.
   - Acceptance: Unit tests validate stats and uniques; app still builds unchanged.
   - Code: `src/types/*`, `src/lib/graph.ts`, `src/lib/stats.ts` (new), tests.
   - Tests: stats functions; sample edge exposes correct stats.
   - Demo: run unit tests; inspect logged sample in tests.

2) Visibility engine for manual expansion + stubs
   - Goal: Compute visible nodes/edges from `expanded` set; compute stubs & terminal flags.
   - Acceptance: Unit tests for `computeVisibleFromExpanded` on small graphs.
   - Code: `src/lib/visible.ts` (new), store slice.
   - Tests: multiple expansion sequences; stubs present where expected.
   - Demo: run unit tests.

3) Context menu foundation (accessible)
   - Goal: Portal menu component with keyboard, store wiring, enable/disable logic (no actions yet).
   - Acceptance: Component tests pass; right‑click opens; ESC closes; items disabled appropriately.
   - Code: `src/components/ContextMenu.tsx` (new), store additions.
   - Tests: RTL component tests.
   - Demo: dev: right‑click shows menu; traverse via keyboard.

4) Decouple by Department
   - Goal: Implement grouping view and render split edges.
   - Acceptance: Unit grouping tests; E2E validates separate edges/labels and counts.
   - Code: `src/lib/decouple.ts`, store action, canvas rendering branch.
   - Tests: unit + E2E step.
   - Demo: decouple a node with mixed departments.

5) Decouple by Person
   - Goal: Extend decouple for resources; avoid noise for single‑resource.
   - Acceptance: Unit tests; E2E verifies split.
   - Code: extend decouple; store flags; canvas tweaks.
   - Tests: unit + E2E.
   - Demo: right‑click → person split visible.

6) Collapse Following Transitions
   - Goal: Collapse downstream into meta‑node; show badge; support Expand.
   - Acceptance: Unit aggregation tests; E2E collapse/expand.
   - Code: `src/lib/collapse.ts`, store, meta‑node rendering.
   - Tests: unit + E2E.
   - Demo: collapse from C; expand back.

7) Cases panel via context menu
   - Goal: “Show cases here” populates right panel with table; remove left‑click detail updates.
   - Acceptance: Component test renders rows; E2E opens panel from node and edge.
   - Code: store `casesPanel`; update details component.
   - Tests: component + E2E.
   - Demo: show cases for B→C.

8) Left pane controls: Expand All + Top N
   - Goal: Replace controls; implement Top N ranking and reveal.
   - Acceptance: Coverage list and total coverage displayed; coexist with manual expansions.
   - Code: `traceMining.ts`; store fields; controls component.
   - Tests: unit for topN; E2E slider interaction.
   - Demo: adjust slider; verify coverage and visible edges.

9) Duration encoding finalize (color default; optional length mapping)
   - Goal: Implement color ramp (green→red) by duration with legend; keep count‑by‑width; add optional duration‑weighted spacing toggle.
   - Acceptance: Counts visible on edges; tooltip shows μ/p90; color ramp applied; optional toggle switches layout without severe overlap.
   - Code: canvas styling hooks; legend; optional `durationLayout.ts` and toggle in store.
   - Tests: component assertions for color classes; unit for color scale mapping; layout tests only if toggle on.
   - Demo: inspect edges: high duration = redder; hover shows μ/p90.

10) Polish, performance, docs
   - Goal: Tune clamps/legend, memoization; update README/AGENTS; ensure tests all pass.
   - Acceptance: Lint clean; test suite green; docs include Phase 2 features.
   - Code: docs, minor tweaks.
   - Tests: existing.
   - Demo: run full tests and a short screencast.

## G. Risks & Alternatives
- Edge length proportionality vs readability: weighted spacing can widen and cross edges. Mitigation: clamp ranges, per‑layer normalization, fallback style encoding toggle.
- Decouple combinatorics: splitting by person may explode edge count. Mitigation: cap by top‑K resources with “Other” bucket; show info badge.
- Collapse aggregation semantics: mixing branches can skew durations. Mitigation: present aggregates clearly; optionally per‑inbound edge aggregation within meta‑node tooltip.
- Performance: big visible subgraphs after Expand All + decouple/collapse. Mitigation: memoize transforms, defer fitView, limit label churn.
- A11y/menu complexity: context menus need careful focus management. Mitigation: role semantics, keyboard triggers, and tests.

## Next 3 Step Options
- Approve Milestone 1: Data & stats enrichment.
- Approve Milestone 2: Visibility engine for manual expansion + stubs.
- Approve Milestone 3: Context menu foundation (accessible).
