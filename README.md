# Adventure: The Lost Chalice

**Domain:** https://adventure.sala.company  
**Type:** Browser 3D third-person action-adventure  
**Status:** Preproduction specification and GitHub Pages deployment scaffold, **not the finished game**.

The complete story, rules, art direction, enemy AI, gameplay, sound, browser/performance targets and architecture are in [the game design specification](docs/GAME_DESIGN_SPEC.md).

Supporting files include [deployment](docs/DEPLOYMENT.md), [acceptance tests](docs/ACCEPTANCE_TESTS.md), [asset inventory](assets/models/ASSET_MANIFEST.csv), [sound list](assets/audio/SOUND_CUES.csv) and [game text](src/text.json).

## Developer preview

```bash
npm install --no-audit --no-fund
npm run dev
```

Build: `npm run build`.

The preview uses procedural placeholder meshes. It is **not** complete gameplay. 3D assets and music must be produced separately. After the first install, commit `package-lock.json` and switch the workflow from `npm install` to `npm ci` for reproducible deployments.

## Detailed implementation specifications (reviewed 2026-11-03)

- [Gameplay rules, creature AI, object recovery, endings and save schema](docs/GAMEPLAY_RULES_V1_1.md)
- [Visual art, animation, audio, UI and localization bible](docs/ART_AUDIO_UI_BIBLE.md)
- [Vertical slice scope, production roadmap and acceptance tests](docs/PRODUCTION_ACCEPTANCE_V1_1.md)

These documents define how to implement the game. The current scene is a technology preview, not a completed game. Gameplay tuning values are provisional and require player testing.


## Second design audit (v1.2)

- [Consistency and implementation addendum v1.2](docs/CONSISTENCY_AUDIT_V1_2.md) resolves endgame state ordering, dragon-trust conditions, object transfers, finale checkpoints, random seed solvability, player feedback and preview limitations. This addendum supersedes conflicting earlier clauses.
