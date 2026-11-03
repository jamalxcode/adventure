# Adventure: The Lost Chalice — Gameplay Rules v1.1
Updated 2026-11-03. **All values are provisional design targets, not implemented or playtested.**

## Core loop
Explore → observe clues/creatures → choose an object or route → act → consequence changes world → discover shortcut, story or treasure. Major quests are not a rigid checklist. Three acts: Missing Chalice, Broken Kingdom, Kingdom's Choice.

## Movement and interaction
3D world: X east, Y up, Z north. Hero height ~1.8m, collision radius 0.35m. Walk 4m/s, sprint 6m/s, jump ~0.85m. Tunable fixed 60Hz movement simulation. Third-person camera 5m behind with automatic obstacle handling, adjustable orbit/zoom and sensitivity. WASD/arrows move, Shift sprint, Space jump, E interact, Q drop, mouse click use, Escape pause. Touch and gamepad required before full release. Interaction default range 2.2m and line-of-sight; focus highlights object with verb prompt.

## Physical object rules
Exactly one major held object: sword, bridge, key, magnet, cloak, Crystal of Truth, Chalice. Knowledge and story evidence are journal flags, never blocking inventory. Each object: unique ID, prefab, region, position, state WORLD|PLAYER|CREATURE|PLACED|RECOVERING, holder ID, questCritical, recovery anchor. No duplicate holders. Drop onto valid walkable location; no invisible irrecoverable objects. All gates stay open after unlock. Matching keys use symbols as well as colors. Major object swapping is deliberate. The player may set Chalice down but must never auto-drop it.

## Enemy state machines and provisional tuning
Shared: IDLE/PATROL → NOTICE → INVESTIGATE → PURSUE → ATTACK_WARNING → ATTACK → RECOVER; distraction, stun, flee, ally and defeated variants. Real LOS, hearing cues and reachable navigation paths; no omniscient tracking. Warnings must precede attacks.
- **Yorgle (yellow):** attracted to shiny items within ~9m, defends nest ~6m, forgets hidden hero after ~5s. Fight, sneak, distract, or trade. Trust: discover collar rune, nonlethally unbind Yorgle and return a nest treasure.
- **Grundle (green):** guards White Castle, ~1.2s warning before charge, breaks marked weak walls. Trust: free his binding chain with mirrors; if defeated, an independent mine shaft remains accessible.
- **Rhindle (red):** ~14m sight range and ~100° forward cone, searches last sighting ~7s, cannot see through cover. Must permit hiding and escape. Trust: recover blueprint and demonstrate reformed Chalice symbol during an encounter without killing him.
- **Blinky (bat):** steals eligible loose or carried items with an audible/visible tell; flies real accessible routes, leaves trail and deposits at discoverable hoard/drop point. Min 90s between steals, 30s grace after recovery, no safe-sanctuary theft, no more than one quest-critical theft at a time, and max one Chalice steal in finale. Always provide object retrieval or failsafe sanctuary recovery.
- **Sorcerer:** three-stage confrontation: distinguish illusions, disable defenses, retrieve Chalice. All stages have at least one solution independent of optional powers.
- **Stone Guardian:** dodge, lure into hazard, disable machinery or bypass.
Values are tuning starting points.

## Health and recovery
Initial proposal: 3 hit points; normal hit = 1 damage, temporary invulnerability = 1s; refill at sanctuary. Death respawns at last sanctuary, keeps unlocks/lore/choices, and deposits carried object at reachable location. No long mandatory corpse run. Browser pause/blur releases held input. Two snapshot generations for save recovery.

## Mandatory puzzle design
Each required puzzle has visible clue, interactable feedback, at least one no-optional-item solution, reset or recovery, completion event, persistent flag.
- Golden Castle: gold key OR tutorial environmental bypass.
- White Castle: white key OR Grundle cracked-wall charge OR forest tunnel.
- Mirrors: orient beams OR secret bypass; reveal mural and Crystal.
- Mines: restore forge components; magnet is shortcut, not mandatory.
- Stone Guardian: deactivate, defeat indirectly or bypass.
- Black Castle: black key OR Blinky workshop route OR hidden wall route.
- Sorcerer: observation, environmental reflection, reach Chalice without optional Crystal.
- Return: always traversable carrying Chalice, even if all dragons were defeated.

## Quest truth and ending eligibility
Events are idempotent, no double rewards: GOLDEN_SANCTUARY, COLLAR_FOUND, BLINKY_WORKSHOP, WHITE_CASTLE_ENTERED, MURAL_FOUND, GRUNDLE_FREED/DEFEATED, FORGE_RESTORED, BLUEPRINT_FOUND, YORGLE_TRUST, GRUNDLE_TRUST, RHINDLE_TRUST, BLACK_CASTLE_ENTERED, SORCERER_RESOLVED, CHALICE_RECOVERED, CHALICE_RETURNED.
- **Old Kingdom:** CHALICE_RETURNED; always unlocked.
- **Age of Dragons:** CHALICE_RETURNED + BLUEPRINT_FOUND.
- **United Kingdom:** CHALICE_RETURNED + BLUEPRINT_FOUND + FORGE_RESTORED + all 3 dragon TRUST flags.
Dragon death blocks its trust for the run but does not block basic completion. A trust opportunity must be discoverable before the final choice. Ending selector only appears at Golden Castle pedestal; locked choices visibly explain how knowledge/decisions led to availability. Persist choice for playable epilogue.

## Save schema
IndexedDB, versioned and validated, autosave at sanctuary/objective/region transitions, JSON export/import, 2 rollback snapshots. Representative format:
```json
{"schemaVersion":1,"slotId":"slot-1","seed":12345,"mode":"adventurer","hero":{"region":"golden_garden","position":[0,0,0],"health":3,"heldObjectId":null},"sanctuary":"golden","questFlags":[],"objectStates":{},"creatureStates":{},"doorStates":{},"shortcuts":[],"ending":null}
```
On invalid state, prefer last valid snapshot; preserve quest-critical ownership and reachable transforms. Local browser data can be lost when cleared.

## Replay and tests
Adventure Chaos is a seeded 20-room remix, target 15–25 minutes, only after main victory. Seed generator must prove required keys/routes reachable. Test: save-reload unlocked door; key theft-recovery; drop/respawn object; Grundle defeat still allows mines; 3 White Castle approaches; Sorcerer without Truth Crystal; all ending conditions; return without allies; background tab input reset; randomized seed solvability.
