# AGENTS.md — Process Flow Explorer (MVP)

This file guides coding agents working in this repo. It explains how to run, test, and extend the app, and highlights conventions and caveats that will save you time.

## Agent Quickstart
- Overview: Minimal Process Flow Explorer with click‑to‑expand reveal from START and a single central canvas. Base rendering uses built‑in React Flow edges; decoupled overlays use a custom bundled edge with labels and arrowheads. MiniMap intentionally removed.
- Tech: Vite + React + TypeScript; React Flow; Zustand; Tailwind; Vitest (unit) + Playwright (E2E). Node 18/20 recommended.
- Data: In‑memory synthetic events at `src/data/sampleEvents.ts`. Optional precomputed files at `public/data/permit.small.*.json`.
- Graph build: `src/lib/graph.ts` (`buildGraph`, `START_NODE_ID`). Nodes = activities + synthetic START. Edges = START → first activity per case + consecutive same‑case transitions; each edge has `count` and `traversals { caseId, startTs, endTs, durationMs }` plus derived stats (`meanMs`, `p90Ms`, …).
- Layout: `src/lib/layout.ts` (`computeLayout`) does simple BFS layering from START.
- Reveal: `src/lib/visible.ts` (`computeVisibleFromExpanded`) computes visibility from expanded nodes; START auto‑expands on load. Variants-based reveal supported via `src/lib/traces.ts`.
- State: `src/state/store.ts` (Zustand) — `graph`, `layout`, `expanded`, `selection`, `variants`, `activeVariantId`, `decouples`, `decoupleView`, `getVisible()`, `setNodePosition()`; `init()` wires sample/precomputed data + layout and mines top variants.
- UI: `src/components/FlowCanvas.tsx` (built‑in default edges + custom `BundledEdge` overlay, auto‑fit on changes, `Background`, `Controls`); `ProcessNode.tsx` (keyboard a11y + hidden handles); `ContextMenu.tsx` (Decouple/Undo, Collapse, Expand); `EdgeTooltip.tsx`; `LegendBar.tsx`; `VariantsPanel.tsx`.
- Tests: Unit in `src/lib/*.spec.ts` and `src/state/*.spec.ts`; E2E in `tests/*.spec.ts` (smoke + screenshots, dev server auto‑started by Playwright config).
- Commands: `npm install`; dev `npm run dev`; unit `npm run test`; E2E `npx playwright install chromium` then `npm run test:e2e`; lint/format `npm run lint` / `npm run format`.
- Gotchas: Base edges use built‑in rendering; decoupled overlays use a custom edge with its own label background. Auto‑fit uses `setTimeout(0)` after element updates; ensure label backgrounds remain readable on the light theme.

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
  - Base edges use `type: 'default'`; decoupled overlays use `edgeTypes.bundled` with curved bundling and draggable bend handle.
  - Auto‑fits on element changes (`fitView({ padding: 0.2 })`) and on window resize.
  - Vertical flow orientation (top → bottom): nodes set `sourcePosition: Bottom`, `targetPosition: Top`.
  - Includes `Background` grid and `Controls`; right‑click opens context menu; hover shows edge tooltip.
  - Edge width scales subtly with count (log‑scaled); decoupled colors map duration (gentle green→red, relative per base edge).
- `src/components/ProcessNode.tsx`
  - Custom node with keyboard a11y. Includes invisible left/right `Handle`s to ensure edge anchoring.
- `src/components/BundledEdge.tsx`
  - Custom edge used for decoupled overlays; supports bundled lanes, per‑group labels, and a draggable midpoint handle to adjust bend.
- `src/components/LegendBar.tsx` / `src/components/VariantsPanel.tsx`
  - Legend indicates Thickness = #cases; Color = duration (green→red, relative per transition).
  - Variants panel shows Top N paths; selecting one reveals that exact path.
- `src/components/ContextMenu.tsx` / `src/components/EdgeTooltip.tsx`
  - Context menu: Decouple by Person/Undo (node‑local), Collapse following, Expand from node. A downstream reset exists in store and tests and may be surfaced in UI.
  - Edge tooltip shows mean/p90 duration on hover.
- `src/state/store.ts`
  - Zustand store with `graph`, `layout`, `expanded`, `selection`, `variants`, `activeVariantId`, `decouples`, `decoupleView`, and `getVisible()`.
  - Reveal starts from `START`; left‑click expands nodes. Selecting a variant reveals that exact path.
  - Data model simplified to resource (person) only; department/other attributes removed from UI logic.
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
  - `src/lib/*.spec.ts` + `src/state/*.spec.ts`: unit tests for pure utils and store actions (expand/collapse, decouple, downstream reset).
  - `tests/*.spec.ts`: Playwright smoke and screenshots (context menu, decouple/undo/reset, edge bend).

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
  - Smoke test asserts DOM edges exist; screenshot tests capture context menu, decouple/undo/reset, and edge bending.
 - Visual verification (always): review `test-results/*.png` after UI/layout changes to confirm arrows, labels, spacing, and color mapping render correctly.

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
- On load, START auto‑expands to show initial transitions; click nodes to reveal more.
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
- Use built‑in React Flow edges for base rendering; decoupled overlays use the custom `BundledEdge` already present.
 - Ensure edges remain readable on the light theme (stroke/label bg) and auto‑fit on step changes.
- Test pure utilities with Vitest and keep the Playwright smoke stable and quick.
