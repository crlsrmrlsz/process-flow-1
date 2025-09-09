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
- Hardcoded synthetic event log (~30 events across ~6 activities).
- Event: { caseId: string; activity: string; timestamp: string; resource?: string }
- Add a synthetic START node; transitions between consecutive events of the same case; per‑transition durations.

MVP Features
- 3‑pane layout: left controls, center canvas, right details panel; dark theme.
- Stepwise reveal from START via slider and “Next step” button.
- Selection & details: node (top case visits + latest ts), edge (count + min/avg/max duration).
- Keyboard a11y: nodes/edges Tab‑focusable; Enter selects.

Important implementation choices
- Use React Flow built‑in `type: 'default'` edges with labels and arrowheads.
- Give nodes `sourcePosition: Right`, `targetPosition: Left`, and include invisible `Handle`s.
- Style edges visibly on dark background (stroke ≥ 3, zinc‑400/500); add hover emphasis via CSS.
- Auto‑fit on step change (fitView({ padding: 0.2 })) after nodes/edges update; wrap in ReactFlowProvider.
- Step 0 shows no edges; Step ≥ 1 reveals transitions.

Layout & State
- Simple BFS layout from START.
- Zustand store: graph, layout, step, maxStep, selection, getVisible(). Reveal always from START (no contextual reveal in MVP).

Tests
- Unit: graph build + step filtering.
- Playwright smoke: after “Next step”, assert transitions visible count > 0 and at least one DOM edge exists; selecting node updates details.

Acceptance
- Build succeeds; dev loads quickly; dark UI with visible edges + labels; auto‑fit works; tests pass.
