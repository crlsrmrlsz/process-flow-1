You are a senior front-end + data-viz engineer.

Goal (Phase 1 / MVP):
Build a minimal “Process Flow Explorer” web app that demonstrates step-by-step process flow reveal and an inspectable details panel. Keep the codebase tiny, idiomatic, and well-commented.

Non-goals (defer to later phases):
– Bottleneck coloring/width mapping
– Per-worker edge split (“decouple transition”)
– File upload, persistence, or backend

Tech (keep defaults/simple):
- Vite + React + TypeScript
- React Flow for nodes/edges + interactions (zoom/pan/selection)
- d3-shape for smooth curved edges
- Framer Motion for subtle UI transitions (no heavy animations)
- Zustand for minimal state management
- Tailwind CSS for styling
- Tests: Vitest + @testing-library/react (unit), Playwright (one smoke E2E)
- Tooling: ESLint + Prettier + simple npm scripts

MVP features (must ship):
1) Canvas & Layout
   - 3-pane layout: left control panel, center React-Flow canvas, right details panel.
   - Dark theme by default; responsive; fast initial load.

2) Stepwise reveal
   - Load a tiny in-memory toy dataset (hardcoded) representing a process as an event log.
   - Derive a directed graph (states = nodes, transitions = edges).
   - A “step” slider and “Next step” button reveal the process from the start state, one hop at a time.
   - Optional: If a state is selected, a “Continue from selected state” toggle limits the reveal to paths that actually follow that state.

3) Selection & details
   - Clicking a node shows a table in the right pane: top case IDs visiting that node, timestamps, simple counts.
   - Clicking an edge shows the cases that traversed that transition with basic stats (count, min/avg/max duration if present).

4) Data model (hardcoded sample only)
   - Define a minimal event schema:
     { caseId: string; activity: string; timestamp: string; resource?: string }
   - Include ~20–50 synthetic events spanning ~5–7 activities so the UI is meaningful.
   - Derive per-transition durations if two consecutive events share the same case.

5) Quality & DevEx
   - Clear folder structure: src/components, src/state, src/lib (graph builders), src/data/sampleEvents.ts.
   - Clean, documented utilities: event-log → graph (nodes/edges), step-filtering, selection helpers.
   - Unit tests for pure utilities (graph build, step filter).
   - One Playwright smoke test: app loads, slider reveals more edges, selecting a node updates details table.
   - README explaining how to run, test, and how Phase 2 will plug in (bottlenecks, per-worker split, CSV upload).

Style & UX
- Edges are smooth curves; hovered/selected node/edge is emphasized.
- Subtle enter/exit/opacity transitions for edges as steps increase.
- Keyboard a11y: tab to focus nodes/edges, Enter selects.

Constraints & workflow
- Keep PR-sized commits per task; show diffs at each step.
- After each task, print a checklist of what’s done + next 2–3 options, then pause for approval.
- No extra deps beyond the list unless strictly necessary.

Deliverables for Phase 1
- Working app with stepwise reveal + details panel
- Sample data file
- Tests passing (unit + one E2E)
- README with short architecture note and Phase-2 roadmap hooks

Think a lot
