# Phase 2 Plan — Person‑Centric, Light‑Theme UI

This plan replaces prior Phase‑2 content. It aligns to prompts/visuals.md and the clarified product goals.

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

## B. Visual Design (from prompts/visuals.md, adapted)
- Theme: light, minimal, modern. Diagram remains primary.
- Typography: Inter/Segoe/Roboto/Arial; labels 12–14px, headings ~18px; semibold for emphasis.
- Colors:
  - Background: white/light gray; text dark gray; subtle borders and soft shadows.
  - Nodes: neutral (white, subtle border); selected node light blue tint.
  - Edges: thickness = volume (2–6px); color encodes duration (we reserve color for edges). Non‑selected edges may fade.
- Context Menu: white card, rounded, soft shadow, simple items (icon + label), no submenus.
- Legend: fixed footer strip; minimal text explaining “thickness = volume, color = time”.
- Interaction: subtle, smooth animations (~200ms), soft hovers, clear focus ring.

Note: visuals.md suggests color for variants; we instead use color for duration per product requirement. Variants are accessed via the Top‑6 panel.

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
   - Base label “(#count/μdays)” (days = mean); add color scale by mean duration (clamped); keep thickness log(count).
   - Decouple view shows person line with icon + color bar.
   - Acceptance: unit for color mapping; E2E screenshot assertions.

6) Friendly State Names
   - Add mapping table (e.g., INFO_REQUEST → “Request info to applicant”), with truncation.
   - Acceptance: unit for mapping; UI shows friendly labels.

7) Layout & Screen Composition
   - Title at top (short description), legend at bottom, diagram centered; maintain vertical flow. Switch to light theme per visuals.md.
   - Acceptance: E2E screenshots show layout and legend.

8) Variants Panel (Top 6)
   - `traceMining.ts`, store for active variant and “dirty” flag; overlay UI at top‑right gap.
   - Acceptance: unit for top‑6; E2E selecting variant, then unpress on manual edits.

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
