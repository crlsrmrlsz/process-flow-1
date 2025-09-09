# Process Flow Explorer — Initial Prompt (Simple)

Build a minimal “Process Flow Explorer” web app that reveals a process step‑by‑step and shows an inspectable details panel. Keep the codebase tiny, idiomatic, and well‑commented.

Tech (fixed)
- Vite + React + TypeScript
- React Flow for nodes/edges + interactions
- Tailwind CSS for styling
- Zustand for state
- framer-motion for subtle fades
- Tests: Vitest + @testing-library/react (unit), Playwright (one smoke E2E)
- Tooling: ESLint + Prettier

Data
- Hardcoded synthetic event log (~30–36 events across ~6 activities).
- Event: { caseId: string; activity: string; timestamp: string; resource?: string }
- Add a synthetic START node; transitions between consecutive events of the same case; per‑transition durations.

MVP Features
- 3‑pane layout: left controls, center canvas, right details panel; dark theme.
- Stepwise reveal from START via slider and “Next step” button.
- Controls show “Transitions visible: N” and a small legend.
- Selection & details: node (top case visits + latest timestamp), edge (count + min/avg/max duration and sample traversals).
- Keyboard a11y: nodes/edges Tab‑focusable; Enter selects.
- Step 0 shows no edges by design; step ≥ 1 reveals transitions.

Important implementation choices
- Use React Flow built‑in `type: 'default'` edges with labels and arrowheads for reliability.
- Give nodes `sourcePosition: Right`, `targetPosition: Left`, and include invisible left/right `Handle`s to anchor edges.
- Style edges for dark UI (zinc palette); enable hover emphasis; ensure labels stay readable.
- Edge widths scale subtly with count (log‑scaled) to hint throughput while keeping visuals calm.
- Auto‑fit on step change via `fitView({ padding: 0.2 })` after nodes/edges update (use a `setTimeout(0)`), wrapped in `ReactFlowProvider`.
- Include React Flow `MiniMap`, `Controls`, and a `Background` grid on the canvas.

Layout & State
- Simple BFS layout from START for deterministic positions.
- Zustand store: `graph`, `layout`, `step`, `maxStep`, `selection`, and `getVisible()`. Reveal always from START (no contextual reveal in MVP).

Tests
- Unit: graph build + step filtering utilities.
- Playwright smoke: after “Next step”, assert transitions visible count > 0 and at least one DOM edge exists; selecting a node updates details.

Acceptance
- Build succeeds; dev loads quickly; dark UI with visible edges + labels; auto‑fit works; tests pass.
