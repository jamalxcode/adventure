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