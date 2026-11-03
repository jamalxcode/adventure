# Adventure: The Lost Chalice

A standalone, original, browser-based fantasy action-adventure inspired by the exploration and emergent item play of the Atari classic. Stylized rounded-block **3D** characters and scenery, not Atari-sized pixels.

## Current release: v0.2 playable prototype

The repository now contains a **playable, procedural 20-location adventure prototype** with keyboard and experimental touch controls. Explore Golden Garden, the Whispering Forest, White Castle, Ancient Mines and Black Castle. Collect keys and tools, meet Yorgle, Grundle, Rhindle and Blinky, discover clues, overcome three seals, recover the Enchanted Chalice and choose among three endings.

The prototype uses generated low-poly meshes and short synthesized sound cues. It is not the finished polished 80–100 room game with authored animated GLB characters and full soundtrack. See [implementation status](docs/IMPLEMENTATION_STATUS.md) for feature-by-feature accuracy.

## Run locally

Node 22 is recommended.

```bash
npm install --no-audit --no-fund
npm run dev
```

Open the URL printed by Vite. Validate before release:

```bash
npm test
npm run build
npm run preview
```

Controls: WASD/arrows move, Shift sprint, E interact, Q drop, J attack while carrying sword, F map, H help, M mute, Escape pause. Move mouse/touch on canvas to orbit camera. On touch devices, use the virtual stick and action buttons.

[How to play and solve the prototype](docs/PLAY_GUIDE.md)

## Specifications and production

- [Full story, gameplay and technical design](docs/GAME_DESIGN_SPEC.md)
- [Detailed combat, item, enemy and save rules](docs/GAMEPLAY_RULES_V1_1.md)
- [Consistency and state machine fixes](docs/CONSISTENCY_AUDIT_V1_2.md)
- [Visual, sound and interface bible](docs/ART_AUDIO_UI_BIBLE.md)
- [20-room prototype plan and acceptance criteria](docs/PRODUCTION_ACCEPTANCE_V1_1.md)
- [What's actually implemented](docs/IMPLEMENTATION_STATUS.md)
- [QA checklist](docs/ACCEPTANCE_TESTS.md)

## Code structure

- `src/main.js`: original procedural 3D scene, input, quests, objects, creatures, HUD and play loop.
- `src/rules.mjs`: pure, testable story ending, trust and inventory invariants.
- `tests/game.test.mjs`: automated rules and project smoke tests.
- `src/style.css`: responsive game UI.
- `index.html`: game canvas and controls.
- `assets/`: asset inventories, with final GLB and audio production still pending.

Development uses Babylon.js, Vite, HTML, CSS and JavaScript. GitHub Pages deployment runs `npm test` and `npm run build` prior to publishing.

## Persistence and caveats

Current prototype stores saves in localStorage in this browser and may lose progress if browser storage is cleared. The specification calls for versioned IndexedDB and JSON export/import for the full game.

This game uses original designs and does not incorporate Roblox or Atari copyrighted game assets.
