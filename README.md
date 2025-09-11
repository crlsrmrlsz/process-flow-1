# Process Flow Explorer (MVP)

Minimal web app to explore a process graph by expanding nodes directly on the canvas.

## Stack
- Vite + React + TypeScript
- React Flow for canvas (built-in edges)
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
- `src/components` – Flow canvas and context menu; custom node components
- `src/state` – Zustand store (graph, layout, expanded nodes, selection, decouples)
- `src/lib` – pure utilities: event‑log → graph, visibility, layout, stats
- `src/data/sampleEvents.ts` – hardcoded synthetic event log

## Data Model
Event schema:
```
{ caseId: string; activity: string; timestamp: string; resource?: string }
```
We derive a directed graph with a synthetic `START` node, transitions per consecutive same‑case events, and simple traversal durations.

## MVP Features
- Single central canvas
- Click any node to expand its outgoing transitions (START is always visible)
- Built‑in edges with labels + arrowheads; hover emphasis; subtle width scaled by count
- Context menu on nodes/edges: decouple by Department/Person/Channel/Priority/Doc Quality, undo decouple downstream, reset decouples downstream; expand/collapse (per-node) and reset expansion
- Keyboard: tab to focus nodes/edges, Enter selects

## Phase 2 Roadmap Hooks
- Contextual reveal polish: stubs/terminal markers; expand all
- Bottleneck coloring/width mapping: plug into edge draw style and node classes
- Per‑worker split: extend event schema and graph builder to decorate node/edge labels by resource
- CSV upload/persistence: replace sample data source; keep pure utils for processing

## Notes
- Layout is a simple BFS layering; dagre/ELK intentionally omitted for MVP.
- Utilities are tested; UI has smoke E2E.
