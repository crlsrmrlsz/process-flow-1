# AGENTS.md — Process Flow Explorer (MVP)

This file guides coding agents working in this repo. It explains how to run, test, and extend the app, and highlights conventions and caveats that will save you time.

## Quick Summary
- Minimal web app to explore a process graph step‑by‑step with an inspectable details panel.
- Tech: Vite + React + TypeScript, React Flow, Tailwind, Zustand, framer‑motion (light), Vitest, Playwright.
- MVP intentionally simple: reveal from START only; no contextual/branch‑specific reveal.

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
  - Includes `MiniMap`, `Controls`, and a `Background` grid.
  - Edge width scales subtly with count (log‑scaled) for readability on dark theme.
- `src/components/ProcessNode.tsx`
  - Custom node with keyboard a11y. Includes invisible left/right `Handle`s to ensure edge anchoring.
- `src/components/DetailsPanel.tsx`
  - Shows node visit summary or edge traversal stats.
- `src/components/ControlsPanel.tsx`
  - Step slider, “Next step”, small legend, and a “Transitions visible: N” sanity counter.
- `src/state/store.ts`
  - Zustand store with `graph`, `layout`, `step`, `maxStep`, `selection`, and `getVisible()`.
  - Reveal always starts from `START` in MVP.
- `src/lib/graph.ts`
  - Build graph from event log. Adds synthetic `START` node and per‑transition traversals/durations.
- `src/lib/step.ts`
  - Step filtering utilities and `maxDepth`.
- `src/lib/layout.ts`
  - Simple BFS layering for deterministic positions.
- `src/data/sampleEvents.ts`
  - Synthetic dataset (~30 events) across ~6 activities.
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
