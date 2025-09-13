# Phase 2 Plan — Person‑Centric, Light‑Theme UI

This plan replaces prior Phase‑2 content. It aligns to docs/visuals.md and the clarified product goals.

## A. Summary & Scope
- Data model stripped to essentials: { caseId, activity, timestamp, resource }.
- Right‑click menu (nodes only):
  - Decouple by Person / Undo decouple by Person (node‑local only; no downstream propagation).
  - Collapse (fold all following transitions from that node).
  - Expand All (reveal all following nodes/edges from that node, without decoupling).
- Terminal nodes: grey, no hover emphasis, no context menu; small label shows total processes and total time to reach.
- Edge labels and style: base “(#count/μdays)” where days uses mean duration; when decoupled, add a second line with a person icon, name, and a colored duration bar. Thickness ∝ count (log scaled), color ∝ mean duration (clamped, perceptually uniform).
- Friendly state names via a mapping table (short, readable labels, safe truncation).
- Screen composition (vertical): title at top, minimal legend at bottom, diagram centered. Variants panel (Top 6) floats in canvas top‑right gap between START and first layer.

## Plan Status
- ~~B. Visual Design~~
- ~~E.5 Edge Labels and Color Scale~~
- ~~E.7 Layout & Screen Composition~~
- ~~E.2 Node‑local Decouple by Person~~
- ~~E.3 Collapse / Expand All (basic)~~
- ~~E.1 Data Simplification (resource‑only)~~
- ~~E.4 Terminal Nodes~~
- ~~E.6 Friendly State Names~~
- ~~E.8 Variants Panel (Top‑6)~~
- E.9 Tests & Docs — ongoing

### Implementation Notes vs Plan
- Decoupled rendering is implemented with a custom bundled edge (`BundledEdge`) including a draggable bend handle for manual tuning.
- Legend and light theme are implemented; edge color maps duration per transition (green→red) relative to local range.
- Variants panel mines top paths and allows one‑click reveal; app auto‑selects the most common variant on load.
- Store includes `resetDecouplesDownstream(nodeId)` and `undoDecoupleByPathDownstream(nodeId, path)`. The context menu currently exposes node‑local Decouple/Undo and Collapse/Expand; downstream reset is verified in tests and may be surfaced in the menu later.

## B. Visual Design (from docs/visuals.md, adapted)
Status: Completed

- Theme: light, minimal, modern. Diagram remains primary. Title centered.
- Typography: Inter/Segoe/Roboto/Arial; labels ~10–12px, headings ~18px; semibold for emphasis.
- Colors:
  - Background: white/light gray; text dark gray; subtle borders and soft shadows.
  - Nodes: neutral (white, subtle border); selected node light blue tint.
  - Edges: thickness = volume (log 0.3–3px). Base edges neutral gray; decoupled edges use a gentle pastel green→yellow→red scale.
  - Decoupled edge colors are relative per transition: within each decoupled bundle, fastest = greener, slowest = redder (based on local min/max mean duration).
- Context Menu: white card, rounded, soft shadow, simple items (icon + label), no submenus.
- Legend: fixed footer strip; “Thickness = #cases; Color = duration (green→red, relative per transition)”.
- Interaction: subtle, smooth animations (~200ms), soft hovers, clear focus ring (keyboard only).
- Arrowheads: smaller/thinner, ~11×11, `orient: auto`.
- Centering: diagram re‑fits to remain centered on viewport resize.

Note: visuals.md suggests color for variants; we instead use color for duration per product requirement. Variants are accessed via the Top‑6 panel (not yet implemented).

## C. Data Design
### Event schema (final)
```ts
type ISO = string;
type CaseId = string;
type Event = { caseId: CaseId; activity: string; timestamp: ISO; resource?: string };
```

### Graph and stats
- Build START → first edges and consecutive transitions per case.
- Per‑edge: count, traversals, mean duration (for color).
- Per‑node: total processes reaching the node; total time‑to‑reach (sum across cases’ first arrivals).
- Traces: compute complete paths, rank by frequency; keep top 6.

## D. UX & Interaction
- Left‑click node: expand that node (append its outgoing transitions). Vertical orientation top→bottom.
- Right‑click node:
  - Decouple by Person / Undo decouple by Person (only when the node has resource data; node‑local only).
  - Collapse (fold all following transitions into a meta node).
  - Expand All (reveal all following transitions; ignores decouples).
- Terminal nodes: rendered grey; no hover or context menu; small label “N cases • μT” (process count is sum; time is mean).
- Edge label & style:
  - Base: “(#count/Σdays)”.
  - Decoupled: second line with person icon + name + colored bar (color = mean duration). Thickness = log(count).
- Variants panel (Top 6): subtle buttons in the gap area. Selecting a variant reveals its full path (no decouple). User edits (expand/decouple/collapse) unpress the active button. On load, auto‑select the most common variant.

## E. Implementation Plan (steps and acceptance)
1) Data Simplification (resource‑only)
   - Remove department, channel, priority, docQuality everywhere (types, normalizers, sample, precompute/scripts, store).
   - Acceptance: build/tests green; UI still loads with simplified data.

2) Node‑local Decouple by Person
   - Replace composite/downstream decouple with node‑local grouping by `resource` for that node’s outgoing transitions.
   - Toggle “Undo decouple by person” per node. Enable only if ≥2 resources among that node’s outgoing traversals.
   - Acceptance: unit + E2E verifying split and undo on clicked node only.

3) Collapse / Expand All (from node)
   - Implement collapse to a meta node of all reachable downstream; implement expand‑all reveal from node.
   - Acceptance: unit aggregation tests; E2E collapse/expand.

4) Terminal Nodes
   - Compute terminals within current visibility; render grey, disable hover/menu; add “N cases • ΣT” label.
   - Acceptance: unit for terminal detection; E2E visual.

5) Edge Labels and Color Scale
   - Base label “(#count/μdays)” (days = mean); base edges remain neutral gray; thickness log(count).
   - Decoupled view shows person line with icon + color bar; color palette is a gentle pastel green→yellow→red and is relative per transition (local min/max of mean times).
   - Acceptance: unit for color mapping; E2E screenshot assertions (including relative scaling correctness).

6) Friendly State Names
   - Add mapping table (e.g., INFO_REQUEST → “Information Request”), with safe truncation + title tooltip.
   - Acceptance: UI shows friendly labels (truncated where needed), full text on hover.

7) Layout & Screen Composition
   - Title at top (centered), legend at bottom, diagram centered and re‑fits on resize; maintain vertical flow. Light theme per visuals.md.
   - Acceptance: E2E screenshots show centered layout and legend; resizing keeps diagram centered.

8) Variants Panel (Top 10)
   - `lib/traces.ts` mines top‑10 paths; store keeps `variants` and `activeVariantId`; overlay UI at top‑right.
   - Selecting a variant shows that exact variant only (independent of previous diagram state). Manual edits (expand/collapse/decouple) unselect the active variant. Auto‑select most common on load.
   - Buttons display as “<percent>% cases” (not state sequence). The rank is shown as a small badge.
   - Acceptance: visual — panel renders top‑10; clicking a variant shows only that variant; subsequent manual edits clear selection.

9) Tests & Docs
   - Update unit/E2E for the new model and interactions; update README and AGENTS.md.
   - Acceptance: all tests pass; docs current.

## F. Risks & Mitigations
- Edge color scale ambiguity: include minimal legend; clamp ranges; use perceptually uniform palette.
- Variant overlay overlap: position responsively; hide on small canvases if necessary.
- Expand‑all on large subgraphs: memoize, throttle fit, and keep edges lightweight.

## G. Deliverables Checklist
- Simplified data model and generators; person‑only decouple; collapse/expand‑all; terminal styling.
- Edge labels (#count/Σdays) and duration color scale; friendly node labels.
- Light theme per visuals.md; title and legend; variants panel.
- Tests updated; docs (README, AGENTS, this plan) aligned.
