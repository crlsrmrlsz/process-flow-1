# AGENTS.md — Process Flow Explorer (MVP)

This file guides coding agents working in this repo. It explains how to run, test, and extend the app, and highlights conventions and caveats that will save you time.

## Agent Quickstart
- Overview: Minimal Process Flow Explorer with click‑to‑expand reveal from START and a single central canvas. Uses built‑in React Flow edges with labels + arrowheads; MiniMap intentionally removed.
- Tech: Vite + React + TypeScript; React Flow (built‑in edges); Zustand; Tailwind; Vitest (unit) + Playwright (E2E). Node 18/20 recommended.
- Data: In‑memory synthetic events at `src/data/sampleEvents.ts`.
- Graph build: `src/lib/graph.ts` (`buildGraph`, `START_NODE_ID`). Nodes = activities + synthetic START. Edges = START → first activity per case + consecutive same‑case transitions; each edge has `count` and `traversals { caseId, startTs, endTs, durationMs }`.
- Layout: `src/lib/layout.ts` (`computeLayout`) does simple BFS layering from START.
- Reveal: `src/lib/visible.ts` (`computeVisibleFromExpanded`) computes visibility from expanded nodes; START always visible.
- State: `src/state/store.ts` (Zustand) — `graph`, `layout`, `expanded`, `selection`, `getVisible()`, `setNodePosition()`; `init()` wires sample/precomputed data + layout.
- UI: `src/components/FlowCanvas.tsx` (built‑in edges, auto‑fit, Background); `ProcessNode.tsx` (keyboard a11y + hidden handles); `ContextMenu.tsx` (decouple/undo/reset downstream, expand/collapse, reset expansion); `EdgeTooltip.tsx`.
- Tests: Unit in `src/lib/*.spec.ts`; E2E in `tests/*.spec.ts` (dev server auto‑started by Playwright config).
- Commands: `npm install`; dev `npm run dev`; unit `npm run test`; E2E `npx playwright install chromium` then `npm run test:e2e`; lint/format `npm run lint` / `npm run format`.
- Gotchas: Reveal always from START (no contextual reveal); built‑in edges only; ensure dark‑theme edge readability; auto‑fit uses `setTimeout(0)` after element updates.

- Minimal web app to explore a process graph by clicking nodes to reveal transitions.
- Tech: Vite + React + TypeScript, React Flow (built‑in edges), Tailwind, Zustand, Vitest, Playwright.
- Data: spec‑driven synthetic event log for Restaurant Operating Permit process. Primary storage: JSONL.GZ events, with precomputed `graph.json` for fast load.
- Interactions: left‑click expands a node; right‑click context menu supports decouple by attribute with downstream propagation (and undo/reset); per‑node collapse; reset expansion. Edge hover tooltip shows mean/p90 duration.

## Common Bash Commands
- Install: `npm install`
- Dev server: `npm run dev` → http://localhost:5173
- Build: `npm run build`
- Preview (serve dist): `npm run preview`
- Lint: `npm run lint`
- Format: `npm run format`
- Unit tests: `npm run test`
- Playwright E2E (Chromium):
  - First‑time: `npx playwright install chromium`
  - Linux deps: `sudo npx playwright install-deps chromium`
  - Run: `npm run test:e2e`

## Core Files and Utilities
- `src/components/FlowCanvas.tsx`
  - React Flow canvas wrapped in `ReactFlowProvider`.
  - Uses built‑in `type: 'default'` edges with label and arrow marker for reliability.
  - Auto‑fits on step changes (`fitView({ padding: 0.2 })`).
  - Nodes set `sourcePosition: Right`, `targetPosition: Left`.
  - Includes `Controls` and a `Background` grid; right‑click opens context menu; hover shows edge tooltip.
  - Edge width scales subtly with count (log‑scaled) for readability on dark theme.
- `src/components/ProcessNode.tsx`
  - Custom node with keyboard a11y. Includes invisible left/right `Handle`s to ensure edge anchoring.
- Removed: `DetailsPanel.tsx` and `ControlsPanel.tsx` in current UI.
- `src/components/ContextMenu.tsx` / `src/components/EdgeTooltip.tsx`
  - Context menu with decouple actions (Department/Person/Channel/Priority/Doc Quality), clear/reset decouples.
  - Edge tooltip shows mean/p90 duration on hover.
- `src/state/store.ts`
  - Zustand store with `graph`, `layout`, `expanded`, `selection`, and `getVisible()`.
  - Reveal always starts from `START` in MVP; left‑click expands nodes.
  - Loads precomputed data when present: `/data/permit.small.graph.json` and `/data/permit.small.events.json` (fallback to bundled sample).
- `src/lib/graph.ts`
  - Build graph from event log. Adds synthetic `START` node and per‑transition traversals/durations.
- `src/lib/step.ts`
  - Step filtering utilities and `maxDepth`.
- `src/lib/layout.ts`
  - Simple BFS layering for deterministic positions.
- `src/data/sampleEvents.ts`
  - Synthetic dataset (~30 events) across ~6 activities.
- `docs/permit_process_spec.json`
  - Declarative spec for Restaurant Operating Permit process (states, transitions, resources, durations, capacities).
- `scripts/generate_from_spec.mjs`
  - Spec‑driven generator that emits JSONL(.gz) events.
- `scripts/precompute_graph.mjs`
  - Precomputes `public/data/permit.small.graph.json` and `public/data/permit.small.events.json` from JSONL for fast UI.
- Tests
  - `src/lib/*.spec.ts`: unit tests for pure utils.
  - `tests/e2e.spec.ts`: Playwright smoke (edges computed + DOM edges exist + details update).

## Code Style Guidelines
- TypeScript strict mode; avoid `any` unless necessary.
- Keep components small and focused; pure logic goes in `src/lib`.
- Prefer React Flow built‑in edges for MVP. If adding custom edges later, ensure they render above background and anchor correctly.
- Tailwind CSS for styling; keep classlists readable and consistent (zinc/indigo palette).
- No extra dependencies beyond the listed stack without discussion.
- Conventional commits are preferred (e.g., `feat:`, `fix:`, `chore:`).

## Testing Instructions
- Unit (Vitest):
  - `npm run test` (uses jsdom; setup at `src/setupTests.ts`).
- E2E (Playwright):
  - Install browser: `npx playwright install chromium`.
  - Linux: `sudo npx playwright install-deps chromium` if the browser won’t launch.
  - Run: `npm run test:e2e` (starts dev server via Playwright config).
  - The smoke test asserts both the computed visible transitions and DOM edge elements.
  - Screenshot test captures context menu and decoupled canvas.

## Repository Etiquette
- Branch names:
  - `feat/<short-topic>` for features
  - `fix/<short-topic>` for bug fixes
  - `chore/<short-topic>` for tooling/infra
  - `test/<short-topic>` for tests
  - `docs/<short-topic>` for docs
- PRs: keep them small and focused. Include what/why, and screenshots/gifs when UI changes.
- Merge strategy: prefer “Squash and merge” to keep history tidy.
- Rebase vs merge in branches: rebase locally for clean history if comfortable; otherwise merge is fine. Avoid large, long‑lived branches.

## Developer Environment Setup
- Node.js: 18.x or 20.x recommended (use `nvm` if you can).
- Package manager: `npm` (already used by scripts/lockfile).
- Playwright:
  - Install browsers with `npx playwright install`.
  - On Linux CI/WSL, install OS deps via `sudo npx playwright install-deps chromium`.
- Editor: VS Code recommended, with ESLint and Tailwind IntelliSense.

## Unexpected Behaviors / Warnings
- Step 0 shows no edges by design; use step ≥ 1 to reveal transitions.
- Edge visibility: using built‑in edges avoids layering issues seen with some custom edge implementations.
- Auto‑fit relies on a `setTimeout(0)` after nodes/edges update so React Flow can recalc internals before fitting.
- Precomputed files in `public/data` are preferred when present. For other datasets, ensure server serves JSON (avoid `.gz` without `Content-Encoding: gzip`).
- ESLint 9+ conflicts with `@typescript-eslint` v7 peer deps. This project pins ESLint 8.x in devDependencies.
- Playwright may fail to launch without OS libs on Linux — install deps if you see the warning banner.

## Phase‑2 Hooks / Future Work
- Contextual reveal from a node: planned via a right‑click “Show next step” interaction; requires BFS roots = selected node, step clamp, and view fit.
- Bottleneck coloring/width mapping: add edge/node style mapping based on durations/counts.
- Per‑worker splits: extend data model and adapt graph/labels.
- CSV upload: replace in‑memory data source; keep pure utils for processing.

## Things the Agent Should Remember
- Keep the codebase tiny and idiomatic; don’t add deps unless necessary.
- Use built‑in React Flow edges for reliability in MVP.
- Ensure edges are visible on dark background (stroke color/width) and auto‑fit on step changes.
- Test pure utilities with Vitest and keep the Playwright smoke stable and quick.
