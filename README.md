# Process Flow Explorer (MVP)

Minimal web app to explore a process graph step-by-step with an inspectable details panel.

## Stack
- Vite + React + TypeScript
- React Flow for canvas
- d3-shape for smooth curved edges
- Framer Motion for subtle edge fade-in
- Zustand for state
- Tailwind CSS for styling
- Tests: Vitest (+ RTL) and one Playwright smoke test

## Run
```
npm install
npm run dev
```

## Test
```
npm run test          # unit (Vitest)
npm run test:e2e      # e2e (Playwright)
```

Note: Playwright may require `npx playwright install` to download browsers.

## Project Structure
- `src/components` – 3‑pane UI, custom node/edge components
- `src/state` – Zustand store (step, selection, toggles)
- `src/lib` – pure utilities: event‑log → graph, step filtering, layout
- `src/data/sampleEvents.ts` – hardcoded synthetic event log

## Data Model
Event schema:
```
{ caseId: string; activity: string; timestamp: string; resource?: string }
```
We derive a directed graph with a synthetic `START` node, transitions per consecutive same‑case events, and simple traversal durations.

## MVP Features
- 3‑pane layout (left controls, center canvas, right details)
- Stepwise reveal via slider and Next button
- Optional: continue reveal from selected node
- Node/edge selection updates right details panel
- Smooth curved edges with subtle fade‑in
- Keyboard: tab to focus nodes/edges, Enter selects

## Phase 2 Roadmap Hooks
- Bottleneck coloring/width mapping: plug into edge draw style and node classes
- Per‑worker split: extend event schema and graph builder to decorate node/edge labels by resource
- CSV upload/persistence: replace sample data source; keep pure utils for processing

## Notes
- Layout is a simple BFS layering; dagre/ELK intentionally omitted for MVP.
- Utilities are tested; UI has one smoke E2E.

