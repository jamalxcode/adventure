# The Three Dragons

An original low-poly 3D fantasy adventure that runs in the browser. Explore the kingdom of Atheon, solve puzzles,
outwit Karl the Kameleon, and decide the fate of the Gold, Green and Red Dragons: fight them, or win their trust.

**Play:** https://adventure.sala.company

## Current release: v0.3 playable

- **20 connected areas** with solid walls, doorways, locked castle gates, a river you bridge, a cracked wall and a light-sealed door.
- **Three dragons** that see (they look where they face), hear you sprint, chase you between rooms, warn before striking (yellow then red marker), give up when you hide in tall grass, and can be fought (3 hits) or befriended.
- **Karl the Kameleon**, a nearly invisible thief who steals what you carry and runs to his lookout. The Crystal of Truth reveals him.
- **Real puzzles:** a Mirror Hall light-beam puzzle (two solutions), forge levers whose order changes per save, a river crossing, and luring the Green Dragon into the cracked wall.
- **Finale:** a Shadow Sorcerer boss (dodge shadow orbs, break three pylons), a castle-collapse escape with the Red Dragon in pursuit, and three endings.
- Comic-strip style characters: big round heads, dot eyes, expressive brows and mouths, dark outlines.
- Dodge roll, sword combat with animation, interaction prompts, sanctuary checkpoint, three secrets.
- Saves in the browser with automatic backup; touch controls with analog stick; quality adapts to slower devices.
- Optional music files (for example made with Suno) in `src/audio/`; see [src/audio/README.md](src/audio/README.md).

See [what's implemented](docs/IMPLEMENTATION_STATUS.md) and the [play guide](docs/PLAY_GUIDE.md) (spoilers).

## Controls

| Action | Keyboard | Touch |
|---|---|---|
| Move / sprint | WASD or arrows / Shift | Stick (push fully to sprint) |
| Interact | E | USE |
| Sword | J | SWORD |
| Dodge | Space | DODGE |
| Drop | Q | DROP |
| Look around / zoom | Drag mouse / wheel | Drag the scene / pinch |
| Map, help, sound, pause | F, H, M, Esc | MAP, HELP |

## Develop

Node 22 recommended.

```bash
npm install --no-audit --no-fund
npm run dev
```

Before pushing:

```bash
npm test
npm run build
```

Optional real-browser playtest (needs Playwright with Chromium): run `npm run preview` in one terminal, then:

```bash
npm run test:browser -- http://localhost:4173/
```

Pushing to `main` runs the tests and deploys to GitHub Pages ([deployment notes](docs/DEPLOYMENT.md)).

## Code structure

| File | What it does |
|---|---|
| `src/world.mjs` | Map: rooms, doors, walls, river, props, hiding spots, room-to-room navigation |
| `src/physics.mjs` | Circle-vs-box collision with sliding |
| `src/ai.mjs` | Dragon and Karl state machines (sight, hearing, chase, windup, strike, return, friendly) |
| `src/puzzles.mjs` | Mirror beam tracing and forge lever order |
| `src/rules.mjs` | Endings, trust, inventory and objective rules |
| `src/models.js` | Procedural characters with jointed limbs and animation |
| `src/main.js` | Babylon.js scene, game loop, interactions, boss, escape, HUD, saving, input |
| `tests/game.test.mjs` | Unit tests for all the pure modules (`.mjs` files) |
| `tests/browser-playtest.cjs` | Plays through the whole story in a real browser |

All characters, names, art and story are original to this project.
