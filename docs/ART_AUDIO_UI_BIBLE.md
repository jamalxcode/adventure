# Visual, Sound and User Experience Bible v1.1

## Visual direction
Original smooth stylized low-poly 3D with rounded/blocky humanoid proportions reminiscent of accessible sandbox adventure games, but not copied Roblox assets. **No large square pixel art.** Bright inviting outside environments; atmospheric but readable interiors. Main visual priorities: clear navigation, expressive character silhouette, interactive highlights and consistency.

Region palette: Golden Castle warm sandstone/gold/green; Forest layered rich greens and brown; White Castle cream stone and cool blue magic; Watchtower purple-brown bat hoard; Mines ochre/timber/amber machinery; Black Castle slate/violet with readable danger cues. No important mechanic indicated by color alone.

Hero scale about 1.8m, large recognizable hands, expressive face, readable one-item carrying pose. Yorgle stocky golden and treasure-loving, Grundle broad green/enchanted collar, Rhindle angular red/large wings, Blinky small purple-black/large ears, Sorcerer tall robed guardian. Each dragon identifiable by silhouette in grayscale.

## Model and animation contract
Source assets original or properly licensed. Export .glb glTF2 in metres with documented forward/up axes, stable named roots, separate collision meshes and authored animation names. Sprite replacements not acceptable for major 3D characters.
Hero: idle, walk, sprint, jump, land, pick up, drop, sword strike, dodge, hurt, celebrate.
Yorgle: sniff, roam, grab, guard, distract, chase, defeat, unbind.
Grundle: patrol, warning, charge, impact, chain-break, friendly.
Rhindle: fly, land, investigate, stalk, attack, roar, accept trust.
Blinky: flap, hover, dive, grab, carry, drop, taunt.
Sorcerer: idle, illusions, shield, cast, concede. Guardian: stomp, awaken, stunned.
For every clip record duration, loop, attack hit-frame and whether root motion applies. Avoid high bone-count rigs for mobile. Provisional triangle budgets: hero 4k–10k, each dragon 8k–20k, typical prop 0.1k–3k. Profile before treating as hard limits. Reuse 1k material atlases, reserve 2k for visible focal models, instance forest props and apply LOD. Target prototype initial compressed asset transfer under ~35MB, tune by measured cold-load and device class.

## Camera and accessibility
Third-person orbit camera with wall clipping correction, indoor zoom, smooth damping and optional reduced camera motion. Adjustable FOV/sensitivity, high contrast object outlines, subtitles, large scalable UI, input remapping, touch UI, keyboard-operable menus. Critical keys use symbol plus color. Avoid intense flashing. Ensure hero and dragon warnings are visible in low graphics mode.

## UI screens and HUD
Start, new game, continue, slot selector, settings, pause, map, journal, game result, ending choice, credits. HUD shows 3 hearts, carried object, context action, discreet objective hint and optional compass. Dialogue short, skippable and captioned. Opening text: "THE CHALICE IS LOST. THE KINGDOM IS FALLING. BRING IT HOME." Critical discovery text short and grounded in environmental evidence. Avoid long cutscenes.

## Audio and sound map
Adaptive themes: menu, home, forest, White Castle, mines, Black Castle, pursuit, Sorcerer, return, endings. Sound cues: pickups, drops, locks, lever, magic, sword, surface footsteps, dragon warnings, Blinky theft, secret, sanctuary, victory. Distinct warning sounds for each dragon and bat grab, each captioned ("[Rhindle roars nearby]", "[Blinky grabs your key]"). Browser audio starts only after explicit user gesture. Master/Music/Effects/Ambience/UI sliders; mute and dynamic range option. Spatial attenuation only for noncritical audio. Support OGG and tested MP3 fallback, limit simultaneous sources and keep music quieter under speech.

## Localization
Centralize stable string IDs, interpolate placeholders safely, and separate UI copy from engine logic. English v1. Plan future Arabic RTL, including font coverage, mirrored navigation where suitable, and bidirectional number handling. No hardcoded world text that cannot be translated.

## Production gate
Every asset gets author, licensing proof, usage scope, source file and export version. Every interactive object needs icon, highlight color, collision, pick-up anchor and readable animation. No unlicensed music, stock watermarks or borrowed character models.
