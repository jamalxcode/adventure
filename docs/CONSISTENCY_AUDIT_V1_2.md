# Specification Consistency & Implementation Addendum v1.2
Date: 2026-11-03. This addendum supersedes conflicting v1.1 rules. It defines design contracts, not already implemented functionality.

## Critical fix: ending state transitions
The finale MUST use this order:
SORCERER_RESOLVED -> CHALICE_RECOVERED -> FORTRESS_ESCAPED -> CHALICE_AT_GOLDEN_PEDESTAL -> ENDING_SELECTED -> GAME_COMPLETED.
The old v1.1 CHALICE_RETURNED flag is ambiguous: it must not be required before the ending choice is shown. Arrival at the pedestal unlocks choice; choosing and applying an ending marks completion. Epilogue state applies exactly once.

Eligibility:
- RESTORE_OLD: always available once Chalice arrives.
- FREE_DRAGONS: requires BLUEPRINT_FOUND.
- UNITED_KINGDOM: requires BLUEPRINT_FOUND, FORGE_RESTORED, YORGLE_TRUST, GRUNDLE_TRUST and RHINDLE_TRUST.
Dragon death makes that dragon's trust unavailable but never blocks the baseline ending. Save before choice and after atomic selection. Unavailable choices show non-spoiler explanations based on discoveries.

## Explicit dragon trust contracts
Yorgle: find collar clue, remove binding while alive, and return stolen nest treasure. Grundle: free his chain with White Castle mirror mechanism while alive. Rhindle: retrieve blueprint, confront him in designated safe encounter after Sorcerer, show modified Chalice rune, survive and allow him to recognize it without killing him. Each trust action has at least two discoverable environmental clues and a journal milestone. All three trust routes remain optionally accessible before final pedestal choice. The Free Dragons ending requires only the blueprint because it is fundamentally different from voluntary protection by trusted dragons.

## Atomic item ownership
Every world item has unique persistent ID and exactly one owner state: WORLD, PLAYER, CREATURE, MECHANISM or RECOVERY. Ownership transitions are atomic: validate destination, release prior owner, assign new owner and transform, notify quest system, save at stable boundary. Failure restores previous state. No duplicate or missing quest item after pick-up, bat theft, death, load, region unload or object swap. Dropped items snap to valid reachable floor. Recover quest-critical objects from a documented anchor only if path validation fails, and provide a visible clue rather than silent teleportation.

## Bat and finale rules
Blinky must telegraph carried-item theft with response opportunity, may not steal within sanctuary, menu, respawn grace, cutscene or ending selection, and may not hold more than one quest-critical item at a time. Minimum theft cooldown 90 seconds, 30-second retrieval grace. At most one Chalice theft during return journey.
After Sorcerer and Chalice pickup create BLACK_CASTLE_ESCAPE_START checkpoint; after fortress escape create RETURN_JOURNEY_START checkpoint. Failure in finale must never require replaying the full Sorcerer confrontation. All collapsing passage closures have a second reachable exit and visible route cues. Chalice recovery is from nearby reachable location, not a distant quest reset.

## State-graph solvability, not merely room connectivity
Every mandatory puzzle defines preconditions, interactable clues, allowed objects, alternate path, flags, failure reset and completion message. Generator validates object ownership, single-object carry, key-before-gate placement, optional creature defeat branches, return travel with Chalice, irreversible shortcuts, and save-reload invariants. Reject generated maps where a critical object is behind its own lock or where the route home depends on carrying two major objects simultaneously.

## UI feedback and player clarity
Interactions must succeed or say why: hands full, matching rune key required, bridge not aligned, too far, blocked path. Do not silently ignore E or item-use buttons. Provide optional graduated hint after repeated failure, without forced answer. Objective markers can be reduced in Legend mode, but never conceal essential item recovery after loss. Pause menus and keyboard focus cannot allow hero movement. Game visibility loss clears held keys and pauses simulation; resume audio requires a user interaction.

## Scope consistency
First playable vertical slice is 20 rooms with **three optional secrets** (not one), two dragons, Blinky, two castles, one sanctuary, two entry routes, key/door and item loop, one chain reaction, one nonviolent solution, save/reload, and a short TEST Chalice quest. This test Chalice is not the canonical story item found in Black Castle. Use an explicit prototype-only flag or prefab.

## Actual preview limitations
The current procedural 3D preview is NOT a playable game. It has no world collision, object interaction, puzzles, combat, saving, creature AI or finished character animation. Its movement is not camera-relative, its keyboard state does not clear on tab blur, and character mesh parenting must be normalized to local coordinates. Implement a fixed-step gameplay loop, interior camera obstacle correction, scene lifetime cleanup and WebGL context recovery. Use modular systems rather than adding all mechanics to src/main.js.

## Dependency/build verification
Current package.json uses npm semver ranges and has no committed lockfile. Confirm installed Babylon.js version exists and APIs compile, generate package-lock.json on a verified fresh install, and switch CI to npm ci. A successful GitHub Pages deploy is not proof gameplay has been implemented. Browser audio, device GPU availability and offline storage vary; test explicit fallbacks.

## Acceptance gates
1. All 3 ending conditions above pass truth-table tests.
2. No object duplication or loss over 50 consecutive swap, theft, respawn and save-load trials.
3. Randomly generated world seeds complete from spawn through final return in a stateful validator.
4. Finale death resumes at an escape or return checkpoint without replaying Sorcerer.
5. Each trust option is visible and reachable before final choice.
6. All critical interactions display success or actionable failure.
7. First playable slice has exactly 20 authored rooms and 3 discoverable optional secrets.
8. Actual implementation verified in supported desktop/mobile browsers separately from document completeness.

This document takes precedence over v1.1 wherever descriptions conflict.
