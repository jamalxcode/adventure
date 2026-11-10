# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

**The Three Dragons** is an original low-poly 3D fantasy adventure game that runs in the browser, live at
https://adventure.sala.company. The player explores 20 connected areas of the kingdom of Atheon, solves puzzles, deals
with Karl the Kameleon (a near-invisible thief), and fights or befriends three dragons before a Shadow Sorcerer boss
and one of three endings. Tech: vanilla JavaScript ES modules + [Babylon.js](https://www.babylonjs.com/)
(`@babylonjs/core`), bundled with Vite. No framework, no backend.

## Commands

Node 22 is recommended (CI uses Node 22). There is no lockfile; CI uses `npm install`.

```bash
npm install --no-audit --no-fund
npm run dev            # Vite dev server (--host 0.0.0.0)
npm test               # node --test tests/*.test.mjs  (unit tests for the pure .mjs modules)
npm run build          # vite build -> dist/
npm run preview        # serve dist/ (default http://localhost:4173/)
npm run check          # npm test && npm run build
npm run test:browser -- http://localhost:4173/   # Playwright full-story playtest (needs playwright + Chromium; run preview first)
```

Run a single test by name: `node --test --test-name-pattern="Mirror" tests/game.test.mjs`.
There is no linter configured.

## Architecture

- `index.html` – shell with the `<canvas id="game">`, HUD, prompt/status regions, touch buttons (`interact`, `attack`,
  `dodge`, `drop`, `map`, `help`), the analog `stick`, and the `overlay` dialog. Loads `/src/main.js`.
- Pure, DOM-free, unit-tested modules (`.mjs`):
  - `src/world.mjs` – 5x4 grid of rooms (`CELL = 18`), doors and lock conditions (`doorOpen`), walls, river, props,
    hiding spots, room-to-room pathing (`roomPath`, `navWaypoint`), line-of-sight segment tests.
  - `src/physics.mjs` – circle-vs-box collision with sliding (`moveCircle`).
  - `src/ai.mjs` – dragon and Karl state machines (sight cone, hearing sprint, chase, windup, strike, return, friendly).
    `stepDragon` returns a velocity and events; the caller applies movement with collision.
  - `src/puzzles.mjs` – Mirror Hall beam tracing and forge lever order (order is derived from a per-save seed).
  - `src/rules.mjs` – endings, trust, inventory consistency, current objective.
- Rendering / runtime (`.js`, not unit-tested):
  - `src/models.js` – procedural comic-style characters built from Babylon meshes, with jointed-limb animation.
  - `src/main.js` (~1100 lines) – Babylon scene, game loop, interactions, boss fight, castle escape, HUD, input
    (keyboard/mouse/touch), audio, saving. Exposes `window.__td` (game state hooks) which `tests/browser-playtest.cjs` drives.
- `src/text.json` – placeholder for future localisation; player-facing text currently lives in `src/main.js`.
- `src/style.css` – imported from `main.js`.

Non-obvious behavior:
- **Saves**: `localStorage` key `three-dragons-save-v3`, with a periodic backup at `three-dragons-save-v3-backup`
  (written at most once per minute). Changing the save format likely needs a key bump.
- **Music**: MP3s in `src/audio/` are discovered via `import.meta.glob('./audio/*.mp3')` and grouped by mood from the
  filename (`explore_N`, `danger_N`, `boss_N`, `ending`; case-insensitive). With no files, built-in synthesized music
  is used. See `src/audio/README.md`.
- `tests/game.test.mjs` also checks project files: `index.html` must contain all control IDs listed above, and
  certain old prototype names must not appear in `src/main.js`, `src/ai.mjs`, `src/world.mjs`, `src/rules.mjs`, `index.html`.
- `docs/` holds the play guide (spoilers), implementation status and deployment notes; `docs/archive/` is old design specs.
  `assets/` holds CSV manifests (sound cues, model list), not runtime assets.

## Deployment

`.github/workflows/pages.yml` runs on every push to `main` (and manual dispatch): `npm install`, `npm test`,
`npm run build`, then uploads `dist/` and deploys with GitHub Pages via Actions. **Pushing to `main` deploys live**
(a failing test blocks the deploy). The custom domain comes from `public/CNAME` (`adventure.sala.company`), which Vite
copies into `dist/`. `vite.config.js` uses `base: '/'` because the site is served at the domain root. More detail in
`docs/DEPLOYMENT.md`.

## Conventions / gotchas

- Keep game logic in the pure `.mjs` modules so it stays testable with `node --test`; add tests in `tests/game.test.mjs`.
- All characters, names, art and story are original; do not reintroduce names from the old prototype (a test enforces this).
- No analytics snippet is present in this repo.
- Mobile: touch controls (analog stick, on-screen buttons, pinch zoom) and adaptive quality are part of the game; keep
  `viewport-fit=cover` and the touch button IDs intact.
- Static hosting only: do not add server-side code or commit secrets (`.env*` is gitignored).
