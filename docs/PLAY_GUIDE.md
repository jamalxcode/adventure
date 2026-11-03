# Adventure: The Lost Chalice — Play Guide

## Current playable prototype (v0.2)
This is a lightweight, original, procedural 3D game rather than the finished bespoke-asset 100-room release. It has **20 named interconnected outdoor/room zones**, three simple animated dragon creatures, Blinky, three collectible keys, sword strikes, optional discoveries, the Sorcerer's three seals, a recoverable Chalice and three endings. Save data is kept in the current browser's localStorage. Production-quality GLB models, detailed interiors, animation rigs, advanced navigation meshes and cinematic audio remain to be created.

## Controls
- WASD or arrow keys: move; Shift: move faster.
- Drag mouse/touch on 3D view: orbit camera; wheel: zoom.
- E or Interact button: pick up, examine, use nearby object, open gate or activate puzzle.
- Q or Drop button: put down the one carried item.
- J or Sword button: attack a nearby dragon when holding the sword.
- F or Map button: read the 5-by-4 kingdom map.
- H or Help button: controls and objective.
- Escape: pause; M: toggle simple synthesized sound.
- On touch screens use the movement joystick and action buttons. Touch control is experimental; this is not a fully mobile-optimized release.

## Guided route to the Chalice
1. Golden Garden: pick up gold key. Move to Golden Castle and interact near the gold gate.
2. Golden Castle: activate sanctuary at its pedestal.
3. Yorgle's Nest: examine collar for first story clue. Optional: carry treasure to collar interaction to earn Yorgle trust.
4. Blinky's Watchtower: pick up white key. If Blinky steals an object, look for it here.
5. White Gate / White Castle: use white key at castle gate or investigate cracked wall near White Gate. Examine mural.
6. Mirror Hall: rotate mirrors to free Grundle if alive.
7. Stone Archive: read Chalice blueprint. Ancient Forge: restore forge for the United Kingdom ending.
8. Mine Entrance: collect black key. Shadow Road and Black Gate: activate two seals.
9. Black Castle: use black key at castle gate, confront Sorcerer to disable third seal, then take Chalice from pedestal.
10. On the way home, if you have blueprint and Chalice, interact near the Rhindle symbol in Black Gate to earn his trust, provided he is alive.
11. Bring Chalice back to Golden Castle pedestal and pick a story ending.

## Endings
Old Kingdom available when Chalice arrives; Age of Dragons needs blueprint; United Kingdom needs blueprint + forge + all three dragon trust flags. Defeating a dragon makes that dragon's trust unavailable in that run. Start a new adventure from pause menu to try different outcomes.

## Current limitations
Dragon pursuit is local and simplified, not a complete navigation-mesh AI. Castle gates are interaction objectives but not fully modeled as enclosed 3D interiors. Story content is conveyed through the status text, not voice-acted cutscenes. Sword hit is a short proximity action, not final animation-based combat. World save is localStorage, while versioned IndexedDB is still the production requirement. The future Adventure Chaos seeded mode and polished soundtracks are not implemented. The ending is playable as UI, not an authored 3D epilogue. Browser compatibility and frame rates must be verified on real target devices.
