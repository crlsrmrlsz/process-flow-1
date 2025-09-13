# Process Flow Explorer

Minimal web app to explore a process graph by expanding nodes directly on the canvas.

## Stack
- Vite + React + TypeScript
- React Flow for canvas (built‑in default edges + custom decoupled edges)
- Zustand for state
- Tailwind CSS for styling
- Tests: Vitest (+ RTL) and Playwright (smoke + screenshots)

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

Note: Playwright may require `npx playwright install chromium` to download browsers.

## Project Structure
- `src/components` – Flow canvas, context menu, custom node, decoupled edge, variants panel, legend
- `src/state` – Zustand store (graph, layout, expanded, selection, decouple layers, variants)
- `src/lib` – pure utilities: event‑log → graph, visibility, layout, stats, traces, friendly labels

## Data
- Single source dataset: `public/data/permit.prod.*`
  - `public/data/permit.prod.events.json` — normalized event log array
  - `public/data/permit.prod.graph.json` — precomputed graph with traversals and stats
- Generate and precompute from the canonical definition:
  - Generate: `node scripts/generate_from_definition.mjs --def docs/process.definition.json --out data/permit.prod.events --cases 10000 --temperature 0.8`
  - Precompute: `node scripts/precompute_graph.mjs --in data/permit.prod.events.jsonl --outdir public/data --name permit.prod`

## Data Model
Event schema:
```
{ caseId: string; activity: string; timestamp: string; resource?: string }
```
We derive a directed graph with a synthetic `START` node, transitions per consecutive same‑case events, and traversal durations. Graph edges include derived stats (`meanMs`, `medianMs`, `p90Ms`, `minMs`, `maxMs`, `uniqueResources`).

## Features
- Expand on click: reveal outgoing transitions from any visible node (START auto‑expanded).
- Base edges: built‑in edges with labels `(#count/μdays)`, arrowheads, and subtle width by log(count).
- Decoupled overlay: node‑local “Decouple by Person” groups immediate outgoing edges by `resource` using custom bundled edges with per‑group labels and a gentle green→red color scale (relative per base edge). Each decoupled edge has a draggable bend handle.
- Terminal nodes: styled grey and show “N cases • μT” time‑to‑reach; disabled context menu.
- Variants panel: top paths (by frequency) with quick reveal; selecting a variant sets visibility to that exact path.
- Context menu: Decouple by Person / Undo (node‑local), Collapse following, Expand from node. A downstream reset action exists in store and tests; UI exposure may change.
- Edge tooltip: hover shows mean and p90 duration.
- Keyboard: nodes are focusable; Enter sets selection.

## Notes
- Layout is a simple BFS layering from START; diagram auto‑fits on changes and resizes.
- MiniMap is omitted; React Flow `Controls` are shown.
- App loads only `public/data/permit.prod.*`. There are no fallbacks.
