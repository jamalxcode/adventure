# ADVENTURE: THE LOST CHALICE
## Game Design and Technical Specification v1.2 — 3 November 2026

**Status:** Preproduction design. The scaffold in this repository is a 3D technology preview, not the complete adventure.

### 1. Vision and experience
A family-friendly, standalone, third-person, stylized 3D browser game inspired by the exploration and emergent item interactions of 1980 Atari Adventure. Visuals use original smooth low-poly, Roblox-like proportions, expressive animation, readable objects and cheerful fantasy scenery rather than large pixels. No official Roblox software or assets are required. Players control a customizable adventurer across one persistent connected kingdom. The core goal is to recover the Enchanted Chalice and choose how to restore the kingdom. Discovery, tension, playful mischief, cleverness and mastery are the central emotional pillars.

**Platforms:** Chrome/Edge/Firefox/Safari current stable, Windows/macOS and desktop Linux where WebGL2 is supported; mobile Safari on iOS and Chrome on Android with reduced visual settings. Keyboard/mouse first; touch and gamepad before full launch. No install, login, subscription, advertising or in-game purchases in v1.

**Game length targets:** first completion 2–4 hours, optional chaos run 15–25 minutes; 80–100 connected rooms/areas for full release, about 20 for prototype. These are aspirations to validate with testers, not claims about an existing build.

### 2. World and lore
The Kingdom of Atheon was once guarded by an Enchanted Chalice. A royal magician bound three dragons to defensive towers to establish peace. Their loss of freedom was hidden for generations. The king's guardian later removed the Chalice, hoping to free the dragons, destabilizing gates, castles and old magic. Branded the Shadow Sorcerer, he withdrew to the Black Castle with the artifact. The player begins at the locked Golden Castle, believing the Chalice was stolen, and gradually learns the real history from dragon collars, murals, records and the Sorcerer's companion bat.

**Act I, Missing Chalice:** unlock Golden Castle; activate home sanctuary; find the pedestal symbol; learn Yorgle's collecting habits in the forest; recover a broken collar from his nest by combat, distraction or stealth; discover Blinky's hoard and the white key; approach the White Castle while Grundle guards its entrance.

**Act II, Broken Kingdom:** solve mirror labyrinth, obtain Crystal of Truth, expose the dragon-binding mural; defeat or free Grundle; reopen the mine using a route accessible regardless of that choice; repair the forge; defeat, disable or bypass the Stone Guardian; obtain the Chalice blueprint and the possibility of freeing dragons without disabling protection; follow Blinky's collected objects to the Sorcerer's trail.

**Act III, Kingdom's Choice:** evade Rhindle across the Black Castle approaches; navigate shifting maze and safeguards; discover the guardian's flawed attempt to save the dragons; face a three-stage confrontation based on identifying illusions, redirecting environmental magic and securing the Chalice; escape a collapsing fortress with limited carrying capacity; face Rhindle's final pursuit; return across changed familiar routes to the Golden Castle; choose an ending.

**Ending A, Old Kingdom:** replace Chalice unmodified; the realm stabilizes, but dragons remain magically bound. Always available.
**Ending B, Age of Dragons:** use discovered blueprint to break controlling enchantment; dragons are free while protections weaken.
**Ending C, United Kingdom:** restore forge, use blueprint and earn all three dragons' trust; forge a non-coercive magical pact and protect the kingdom with free dragons. Ending flags persist. A short playable epilogue displays actual consequences. Blinky attempts to steal the Chalice in an optional final comic beat.

**Seamlessness rules:** no mandatory long narrative cutscenes; discoveries follow physical evidence, not arbitrary quest markers; side activities connect to Chalice, dragons, Sorcerer or pathways; locations can be approached in multiple orders while soft guidance keeps required clues reachable.

### 3. Rules and controls
- WASD or arrows move. Mouse orbit/zoom and camera-follow mode. Shift sprint, Space jump, E interact/pick up, Q drop, mouse click or controller input use equipped object; Esc pause. Provide remapping, readable prompts and touch alternatives.
- Player carries **one major object at a time** (key, sword, bridge, magnet, Chalice, cloak or crystal as appropriate). Knowledge, discoveries and small story evidence are recorded separately, not carried as blocking objects. Objects remain where dropped, subject to explicit creature interaction.
- No permanent loss of quest items. A bat theft, death, fall, respawn or collision must have a solvable recovery route; use last-resort sanctuary recovery only if simulation would softlock.
- Sword combat centers on aiming, positioning, readable enemy telegraphs and dodge windows. Defeating a dragon is optional where narrative permits.
- Physics-lite object classes: magnetic, reflective, movable, breakable, flammable, attractive, triggerable. Combine simple rules for chain reactions without unpredictable player-blocking behavior.
- Keys match recognizable shapes/symbols as well as color. Golden, White and Black castles each have an explicit primary key route and an optional environmental alternative.
- Sanctuaries become permanent checkpoints. Dying returns the player to the last active sanctuary, preserving discovered shortcuts and story flags. Dropped major objects remain recoverable.
- Tutorials are playable and optional; never stop control for long blocks of narration.

### 4. Main missions and outcomes
1. Locate gold key and open Golden Castle; activate sanctuary.
2. Discover Yorgle's nest and broken enchanted collar.
3. Follow Blinky to retrieve white key and map fragment.
4. Enter White Castle via key or creative route.
5. Solve Mirror Labyrinth; gain Truth Crystal and reveal murals.
6. Defeat or free Grundle; unlock mine route either way.
7. Restore ancient forge through interacting components.
8. Overcome Stone Guardian; retrieve blueprint.
9. Discover Sorcerer's trail in Blinky's workshop.
10. Evade Rhindle and reach Black Castle.
11. Explore Black Castle and reach Chalice chamber.
12. Overcome Sorcerer's three magical defenses.
13. Escape collapsing castle and resolve red dragon pursuit.
14. Bring Chalice home and choose old/free/united ending.
15. Explore playable epilogue and optional secrets.

Main missions are narrative beats, not rigid level order. Multiple routes and environmental solutions are required where noted.

### 5. Character behavior (deterministic, legible simulation)
**Yorgle (yellow):** shiny-object detection → collect to nest → defend hoard → chase if threatened → lose interest at range. Can be fought, distracted, lured or outsmarted.
**Grundle (green):** territorial patrol → warnings → wall-breaking charge → magical restraint pain response; after free state, acts as optional ally opening routes. Death cannot lock progression.
**Rhindle (red):** patrol → line-of-sight detection → pursuit across adjacent zones → last-seen search → de-escalation; some routes change under pursuit, no omniscient tracking, clear hiding and escape opportunities. Cannot permanently prevent a win.
**Blinky (bat):** fly routes, detect eligible objects, grab and move one object, occasionally taunt, drop or trade, use workshop hoard as anchor. Visible flight clues help retrieval. Rate-limit quest-critical theft to avoid repetition; theft cannot happen on every finale attempt.
**Shadow Sorcerer:** an ambiguous protector, not a generic villain; environmental puzzle confrontation of illusion, defense and reach. Stage feedback must be readable, with no precision-only solution.
**Stone Guardian:** protects archive; can be trapped, disabled or bypassed.
**NPC allies:** freed miners, Grundle and sanctuary keepers alter routes and final journey.

The persistent simulation should update nearby active zones and use lightweight abstract state for distant areas to minimize CPU/GPU load. A world event director can suggest an interesting nearby discovery after long inactivity, without forcibly teleporting objects.

### 6. Locations and art direction
- **Golden Castle:** warm limestone, gold flags, garden courtyards, bright beacon, readable home pedestal.
- **Whispering Forest:** rounded colorful trees, landmarks, streams, hidden nest, ruins and inviting winding routes.
- **White Castle:** pale stone, bluish reflective halls, mirrors, light paths, magic collar mechanism.
- **Watchtower:** bat roost, cluttered hoard and broken Sorcerer workshop.
- **Ancient Mines:** timber, rails, pressure plates, waterwheel, forge and stone guardian.
- **Black Castle:** dramatic towers, dark magenta barriers, magical labyrinth, Sorcerer chamber.
- **Secret Ruins:** optional treasure puzzles, challenge arenas, tribute room.

Style: stylized low-poly with smoothed silhouettes, no pixel blocks, readable fantasy materials and vibrant but coherent palettes. Characters use friendly rounded-block humanoid proportions, not official Roblox meshes. No unlicensed third-party IP. Build recognizable dragon silhouettes, distinct wings, horns and movement rhythms. Camera third-person with wall occlusion correction, reduced-shake mode, adjustable sensitivity and interior automatic framing.

**Asset format:** glTF 2.0 binary .glb with compressed textures where browser compatibility verified. Use LODs and instancing; prefer small atlases and texture compression. First-load compressed assets target below ~35 MB for prototype, then stream additional sections. Target 60fps midrange desktop and 30fps supported mobile after measurement. Optimize render resolution, shadow count, material count, mesh instances and animations on mobile. Include low/medium/high presets.

### 7. Rewards and pacing
Player-facing goals should appear from observations, inscriptions and world events. Rough pacing aspirations: interesting clue/interaction every 1–2 minutes, minor victory every 3–5, memorable change every 8–12, significant revelation every 20–30. Avoid repetitive fetches or artificially scheduled surprises. Celebrate key discoveries with brief animation and distinct sound, not prolonged noninteractive screens.

Scoring recognizes treasure, secrets, environmental solutions, enemy avoidance and run completion. Offer a noncompetitive summary of total time, optional objectives, rescues, deaths, endings and new tactics. Mini-challenges remain optional: Maze Sprint, Dragon Dodge, Magnet Madness, Treasure Chase and Mirror Mayhem. Unlock randomized 20-room **Adventure Chaos** after completion, with shareable seeds, seed solvability validation and no monetized or compulsive retention systems.

### 8. Audio design
All sounds original or correctly licensed. Deliver layered ambience and adaptive music themes for home, forest, White Castle, mines, Black Castle, pursuit, Sorcerer fight and ending. Distinct warning sounds for Grundle charge and Rhindle roar; satisfying item pickup, key unlock, sanctuary, secret and short victory stingers; Blinky's mischievous theft cue; surface-based footsteps. Separate music/SFX/ambience volumes, mute option, subtitles/captions for major sounds. Audio starts only after user gesture to comply with mobile/browser autoplay rules. Prefer .ogg with .mp3 fallback and short compressed clips.

### 9. UI text and menus
Opening: “THE CHALICE IS LOST. THE KINGDOM IS FALLING. BRING IT HOME.”
Menus: New Adventure, Continue, Settings, Credits, Exit to Menu.
Tutorial prompts: Move with WASD. Press E to interact. Carry one major object at a time. Press Q to drop. Explore symbols and creature behavior.
Discovery: “These aren't ordinary collars. Someone made the dragons obey.”
Blueprint: “The Chalice can protect the kingdom without binding the dragons.”
Ending options: Restore the old magic / Free the dragons / Build a new pact.
Final screen: “ADVENTURE COMPLETE”.
All UI strings centralized for translation; do not include exposition every time the player enters a room.

### 10. Technology and data
Host as static site on **GitHub Pages** at **https://adventure.sala.company**. Runtime: HTML5, CSS, JavaScript ES modules, Babylon.js (pinned to tested release at final launch), WebGL2 baseline, optional WebGPU after device checks, Vite build with base '/'. Use glTF/GLB for assets; shader effects limited on mobile; Web Audio through browser gesture. No backend necessary for initial offline-style single-player experience. GitHub Pages does not provide Node server/database. Cloud saves, multiplayer, leaderboards or anti-cheat require external service later.

Source modules recommended: app bootstrap; renderer/camera; movement/controls; interaction/physics rules; inventory and item registry; stateful creatures; quest event graph; puzzles; save/version migration; UI/audio; region asset loader; accessibility/settings; quality scaler; seed generator/validator. Prefer data-driven scene definitions and scripted event flags rather than giant monolithic switch statements.

**Save model:** versioned IndexedDB snapshots (localStorage only for tiny settings/fallback) of hero position, active zone, inventory object ID, world object transforms, unlocked gates, removed restraints, story flags, sanctuary and RNG seed. Use atomic saves and migration schema. Autosave at sanctuaries and significant milestones; allow save-slot export/import as JSON. Include recovery on invalid state. No user account needed.

**Security/privacy:** no secrets in static code, no third-party tracking in initial version, no untrusted HTML injection, CSP reviewed for build, dependency/version and asset license inventories. GitHub Pages is public hosting, not a place for private credentials.

### 11. Accessibility and control
Adjustable controls, mouse sensitivity, separate music/ambient/effects volume, readable scalable fonts, high-contrast object highlights, color-and-symbol key recognition, reduced motion/flashes, subtitles for critical sound cues, keyboard operable menus, pause and resume, touch joysticks and action buttons. Camera collision must never hide the hero during indoor play. Test landscape mobile, short-screen devices and browser page-visibility handling.

### 12. Browser matrix and testing
Test latest Chrome, Edge, Firefox, Safari on desktop and latest iOS Safari/Android Chrome with capable GPU. Hardware capability varies by device and browser; do not imply every phone supports the full 3D world. Provide clear WebGL unavailable message. Feature detect WebGL, input, storage and audio; offer lower resolution and disable expensive shadows. Smoke tests: initial page load, movement, camera, return after background tab, no stuck inputs, sound opt-in, saved progress retrieval, no quest item softlock.

### 13. Production stages
**Stage A:** 20-room playable prototype, Golden + White castles, Yorgle/Grundle/Blinky, six interactive objects, key/door/Chalice loop and three secrets.
**Stage B:** persistent object world, creature AI and multiple solution puzzle systems, save/recovery.
**Stage C:** mines, Black Castle, Rhindle, Sorcerer and returning-home climax.
**Stage D:** three endings, epilogue, optional challenge events and Adventure Chaos.
**Stage E:** art/audio polish, mobile UX, performance, tests, QA, deployment verification.

Acceptance: a first-time tester can play without reading the design document; quest items cannot become permanently inaccessible; each required quest stage is completable; outcomes reflect dragon choices; randomized worlds are checked; game builds on fresh checkout and works at configured HTTPS domain.

### 14. Licensing
Atari Adventure serves as historical inspiration. Do not copy copyrighted artwork, proprietary Roblox assets, soundtrack, character models or third-party game level maps. Original kingdom, character designs, names, sound recordings and assets must be owned or suitably licensed before public distribution.


### 15. Implementation addendum (2026-11-03)
The following documents are normative for implementation and resolve gaps in this overview:
- [Gameplay rules](GAMEPLAY_RULES_V1_1.md): player movement, one-object ownership, creature state machines, theft/recovery grace, quests and ending eligibility, save schema and mandatory puzzle fallbacks.
- [Art/audio/UI bible](ART_AUDIO_UI_BIBLE.md): 3D visual language, model and animation deliverables, sound triggers, UI, accessibility and localization.
- [Production acceptance](PRODUCTION_ACCEPTANCE_V1_1.md): vertical slice, architecture, test gates and measured performance.

**Conflict resolution:** when this introductory overview is less specific, follow the v1.1 implementation addenda. In particular, United Kingdom requires BLUEPRINT_FOUND, FORGE_RESTORED and trust of **all three** dragons. The early playable prototype Chalice is an isolated short test quest; the full story retrieves the real Chalice in the Black Castle. All numerical gameplay balancing values are provisional until tested.


### 16. Second audit and conflict resolution (v1.2)
Read [Consistency and implementation addendum v1.2](CONSISTENCY_AUDIT_V1_2.md) as the highest-priority ruleset where this overview or v1.1 addenda conflict. In particular, Chalice arrival at the Golden pedestal happens **before** ending selection; selection marks completion, not the reverse. The 20-room first playable prototype contains **three** optional secrets. All critical items need atomic ownership and reachable recovery. These are specification decisions, not claims about shipped mechanics.
