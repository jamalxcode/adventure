# Implementation status (v0.3)

| Area | Status | Notes |
|---|---|---|
| World | Done for prototype | 20 rooms, walls and doorways, 3 gated castles, cracked wall, light seal, river and bridge |
| Collision | Done | Hero, dragons and Karl collide with walls, props, trees, river; hero can't walk through dragons. No jumping or falling yet |
| Camera | Done | Orbit/zoom, smooth follow, walls and trees between camera and hero fade out |
| Hero | Done | Comic-strip style jointed model (dragons, Karl and the Sorcerer match), walk/sprint/attack/dodge animations, carried item shown in hand |
| Dragons | Done | Sight cone, hearing, line of sight, hiding in grass, chase across rooms, telegraphed strikes, stun, 3-hit defeat, return home, friendship |
| Karl the Kameleon | Done | Camouflage, stalking, stealing, stashing at lookout, revealed by crystal, sword makes him drop items |
| Puzzles | Done | Mirror beam (2 solutions), forge levers (order per save), river bridge, cracked wall via Green Dragon |
| Story | Done | Objectives, mural, blueprint, seals, Sorcerer boss, crown, collapse escape with Red Dragon pursuit, 3 endings, 3 secrets |
| Saving | Basic | localStorage with backup copy; no multiple slots or export yet |
| Audio | Basic | Synth effects and generative music; drop-in support for custom music files |
| Touch | Basic | Analog stick, action buttons; needs testing on real phones |
| Performance | Basic | Adaptive resolution and glow; not yet measured on real phones |
| Tests | Done | 24 unit tests; full-story browser playtest script |

## Not done yet

- Detailed authored 3D models (characters are built from shapes)
- More rooms (target 80-100), interiors, stairs, jumping
- Multiple save slots, export/import, control remapping, subtitles beyond the message bar
- Real-phone performance testing
