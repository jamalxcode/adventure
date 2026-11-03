> **Archived design notes** from the v0.1–v0.2 prototype (names updated to The Three Dragons). Parts of this no longer match the game; see the [README](../../README.md), [play guide](../PLAY_GUIDE.md) and [implementation status](../IMPLEMENTATION_STATUS.md) for what is actually built.

# Production Roadmap and Quality Gates v1.1

This is a build plan, not a claim that systems are already implemented.

## First playable vertical slice
Twenty interconnected rooms: Golden gardens (4), Sun Castle (4), Forest (6), Frost Castle perimeter (4), Watchtower (2). Deliver third-person movement and camera, collisions, keys and doors, one-item pick-up/drop/swap, Gold Dragon and Green Dragon patrols, Karl the Kameleon object theft and recovery, sanctuary autosave and reload, one environmental puzzle, a secret, a non-combat route and a short prototype Dragon Crown recovery. The prototype Dragon Crown appears early as a test objective; in the actual story it is retrieved at Shadow Castle.

## Implementation modules
App state, scene loading, third-person camera, input mapping, movement, object registry, interaction, inventory, quest event graph, creature AI/navigation, puzzles, save schema/migrations, UI, audio, graphics quality settings, seed generator and solvability validator. Use modular JavaScript and data-driven JSON with stable identifiers. The existing src/main.js procedural preview must be replaced or refactored, not mistaken for completed gameplay.

## World authoring contract
Each region provides a unique ID, named connected exits, player entry locations, collision meshes, walkable areas, interactables, creature waypoints, quest triggers, clues, environmental hazards, secrets, and object recovery anchors. Each mandatory puzzle has at least one solution requiring no optional item and one fallback if a creature was defeated.

## Acceptance criteria
- Fresh desktop player can complete tutorial and first objective without manual.
- Keys remain obtainable after theft, dropping, death, and region unload.
- Green Dragon freed and defeated branches both reach mines.
- Sorcerer encounter is completable without Crystal of Truth.
- Old ending always available; Free requires blueprint; United requires blueprint, forge, and trust of all three dragons.
- Save and load retain player, doors, creatures, object holders, location, inventory and narrative choices.
- Seeded Chaos placement passes reachability validation.
- Browser focus loss clears held inputs.
- Menus keyboard accessible and important sound warnings captioned.
- Check desktop Chrome, Firefox, Edge, Safari and selected iOS Safari/Android Chrome hardware.
- Measure frame time and load size; tune toward 60fps desktop, 30fps mobile rather than assuming it.
- Imported game models and sounds have ownership or license records.

## Milestones
A: Buildable 3D preview and working camera.
B: Fully playable twenty-room slice, save/load and recoverable items.
C: Full interconnected kingdom, three dragons, Sorcerer and final journey.
D: Three endings, epilogue and optional Chaos mode.
E: Sound, polished assets, touch/gamepad, accessibility and complete testing.

## Playtesting
Observe unfamiliar players without hints. Measure onboarding completion, puzzle confusion, frequency of repeated death or theft, alternate solutions discovered, navigation errors, frame drops and willingness to replay. Fix genuine friction before expanding world size.

## Definition of done
Each mechanic requires actual running implementation and documented test evidence. Writing a specification does not count as gameplay completion.


## v1.2 clarification
The [v1.2 consistency audit](CONSISTENCY_AUDIT_V1_2.md) supersedes older ambiguities. First playable slice requires three optional secrets, even though an earlier vertical-slice paragraph mentions one. Endgame has separate arrival, choice and completion states. Finale checkpoints, trust prerequisites, item ownership and seeded-world solvability must be tested according to v1.2.
