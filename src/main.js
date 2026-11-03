import './style.css';
import {
  Engine, Scene, ArcRotateCamera, HemisphericLight, DirectionalLight, Vector3, Color3, Color4,
  MeshBuilder, Mesh, ShadowGenerator, GlowLayer, Ray
} from '@babylonjs/core';
import {
  rooms, roomAt, local, DOORS, doorPoint, doorOpen, buildWalls, riverBoxes, RIVER, PROPS, HIDING,
  isHidden, segmentHitsBox, navWaypoint, WALL_H, CELL
} from './world.mjs';
import { moveCircle } from './physics.mjs';
import { DRAGONS, newDragon, stepDragon, hitDragon, KARL, stepKarl } from './ai.mjs';
import { MIRRORS, startingMirrors, traceBeam, toggleMirror, RUNES, leverOrder, pullLever } from './puzzles.mjs';
import { endingEligibility, mayEarnTrust, inventoryConsistent, currentObjective, ENDINGS } from './rules.mjs';
import { makeKit, makeHero, animateHero, makeDragon, animateDragon, makeKarl, animateKarl, makeSorcerer } from './models.js';

/* The Three Dragons: an original low-poly 3D adventure.
   Pure rules live in world/physics/ai/puzzles/rules (.mjs, unit-tested). This file renders and runs them. */

const $ = id => document.getElementById(id);
const canvas = $('game'), hud = $('hud'), notice = $('status'), promptEl = $('prompt');
const SAVE_KEY = 'three-dragons-save-v3';
const HERO_R = 0.45, DRAGON_R = 1.05, KARL_R = 0.5;
const SANCTUARY_POINT = local(1, 0, -4.5), START_POINT = local(0, 0, 0);
const PEDESTAL = local(1, 0, -1.5);

const ITEMS = [
  { id: 'sunkey', label: 'Sun Key', room: 0, lx: -4, lz: -3, color: '#FFC93C', type: 'key' },
  { id: 'sword', label: 'Sword', room: 5, lx: 2, lz: -2, color: '#D6E2EE', type: 'sword' },
  { id: 'frostkey', label: 'Frost Key', room: 7, lx: -3, lz: -2, color: '#9FE7FF', type: 'key' },
  { id: 'bridge', label: 'Bridge Plank', room: 11, lx: -3, lz: 3, color: '#B07A45', type: 'bridge' },
  { id: 'shadowkey', label: 'Shadow Key', room: 12, lx: 4, lz: 4, color: '#8A5CF0', type: 'key' },
  { id: 'treasure', label: 'Dragon Gold', room: 15, lx: 0, lz: 3, color: '#FFD24D', type: 'treasure' },
  { id: 'crystal', label: 'Crystal of Truth', room: 14, lx: 4.5, lz: 3.5, color: '#6FF0FF', type: 'crystal', hiddenUntil: 'MIRRORS' },
  { id: 'crown', label: 'Dragon Crown', room: 19, lx: 0, lz: -0.5, color: '#FFE066', type: 'crown', hiddenUntil: 'BOSS_DONE' }
];
const itemDef = id => ITEMS.find(i => i.id === id);
const PYLONS = [local(19, -6, -4), local(19, 6, -4), local(19, 0, -6.5)];
const SORCERER_POINT = local(19, 0, 2.2);
const SEALS = { SEAL1: local(17, 0, 0), SEAL2: local(18, -4, 4) };
const SECRETS = [
  { flag: 'SECRET1', at: local(4, 6, 6), text: 'SECRET: an ancient druid stone hums with old magic.' },
  { flag: 'SECRET2', at: local(10, -6, -2), text: 'SECRET: a royal crest glints under the water.' },
  { flag: 'SECRET3', at: local(15, -5, -4), text: 'SECRET: a forgotten garden, untouched for a hundred years.' }
];
const LEVERS = [local(13, -4, -2), local(13, 0, -2), local(13, 4, -2)];
const RUNE_COLORS = ['#FFC93C', '#7FE3FF', '#B98CFF'];
const TABLET = local(16, 0, 3), LECTERN = local(16, -3, -2.5), MURAL = local(9, 2.3, 0);
const BRIDGE_SPOT = local(RIVER.room, RIVER.bridgeLX, RIVER.lz + 2.4);
const mirrorPos = m => local(14, -6 + m.i * 3, -6 + m.j * 3);
const CRACK_DOOR = DOORS.find(d => d.crack);

// ---------- State & saving ----------
const fresh = () => ({
  v: 3, hero: { ...START_POINT, health: 3 }, held: null, items: {}, flags: {}, score: 0,
  seed: 1 + Math.floor(Math.random() * 9999), visited: [0], mirrors: startingMirrors(), levers: [],
  pylons: [false, false, false], dragons: {}, karl: null, ending: null, playSeconds: 0
});
let state = fresh();
function save() {
  try {
    if (!inventoryConsistent(state.items, state.held)) { console.warn('Inventory mismatch; save skipped'); return; }
    state.dragons = Object.fromEntries(Object.entries(dragons).map(([id, d]) => [id, { x: d.x, z: d.z, hp: d.hp, defeated: d.state === 'defeated' }]));
    state.karl = { x: karl.x, z: karl.z, stolen: karl.stolen || null };
    const json = JSON.stringify(state);
    localStorage.setItem(SAVE_KEY, json);
    if (!save.backupAt || performance.now() - save.backupAt > 60000) { localStorage.setItem(SAVE_KEY + '-backup', json); save.backupAt = performance.now(); }
  } catch (e) { /* storage blocked: keep playing */ }
}
function readSave() {
  for (const key of [SAVE_KEY, SAVE_KEY + '-backup']) {
    try {
      const s = JSON.parse(localStorage.getItem(key) || 'null');
      if (s && s.v === 3 && s.hero && s.flags && s.items) return s;
    } catch (e) { /* try backup */ }
  }
  return null;
}
const flag = k => !!state.flags[k];
let solidsVersion = 0;
function setFlag(k, points = 100) {
  if (flag(k)) return false;
  state.flags[k] = true; state.score += points; solidsVersion++; save(); return true;
}

// ---------- Sound: tiny synth for effects + gentle generative music ----------
let audio = null, muted = false, musicTimer = 0, danger = 0;
function ac() {
  try { audio ||= new (window.AudioContext || window.webkitAudioContext)(); if (audio.state === 'suspended') audio.resume(); } catch (e) { audio = null; }
  return audio;
}
function tone(freq, dur = 0.2, type = 'sine', vol = 0.06, slideTo = 0, delay = 0) {
  const a = ac(); if (!a || muted) return;
  const t = a.currentTime + delay, o = a.createOscillator(), g = a.createGain();
  o.type = type; o.frequency.setValueAtTime(freq, t);
  if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t + dur);
  g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + 0.015);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g); g.connect(a.destination); o.start(t); o.stop(t + dur + 0.02);
}
const SFX = {
  pick: () => { tone(520, 0.12); tone(780, 0.14, 'sine', 0.05, 0, 0.07); },
  drop: () => tone(300, 0.14, 'triangle', 0.05, 200),
  unlock: () => { [523, 659, 784, 1046].forEach((f, i) => tone(f, 0.2, 'triangle', 0.05, 0, i * 0.08)); },
  win: () => { [523, 659, 784, 988, 1046].forEach((f, i) => tone(f, 0.3, 'sine', 0.06, 0, i * 0.1)); },
  hurt: () => tone(220, 0.3, 'sawtooth', 0.06, 90),
  swing: () => tone(900, 0.12, 'triangle', 0.035, 300),
  hit: () => { tone(160, 0.2, 'square', 0.05, 80); tone(700, 0.08, 'triangle', 0.04); },
  alert: () => tone(440, 0.18, 'square', 0.035, 660),
  roar: () => { tone(110, 0.6, 'sawtooth', 0.07, 60); tone(140, 0.5, 'square', 0.03, 70); },
  steal: () => { tone(1200, 0.1, 'sine', 0.05, 600); tone(900, 0.1, 'sine', 0.04, 400, 0.1); },
  break: () => { tone(90, 0.5, 'sawtooth', 0.08, 40); tone(200, 0.3, 'square', 0.04, 60, 0.05); },
  wrong: () => tone(180, 0.25, 'square', 0.04, 140),
  click: () => tone(650, 0.06, 'square', 0.03),
  dodge: () => tone(500, 0.12, 'sine', 0.03, 900),
  zap: () => tone(1400, 0.25, 'sawtooth', 0.03, 300)
};
const sfx = k => { try { SFX[k]?.(); } catch (e) { /* audio unavailable */ } };
// Optional music files (e.g. made with Suno) in src/audio/: explore, danger, boss, ending (.mp3).
// Only files that exist at build time are bundled; anything missing falls back to the synth.
const TRACKS = Object.fromEntries(Object.entries(import.meta.glob('./audio/*.mp3', { eager: true, query: '?url', import: 'default' }))
  .map(([path, url]) => [path.split('/').pop().replace('.mp3', ''), url]));
const tracks = {};
let tracksReady = false;
function loadTracks() {
  if (tracksReady) return; tracksReady = true;
  for (const [k, src] of Object.entries(TRACKS)) {
    const a = new Audio(); a.loop = true; a.volume = 0; a.preload = 'auto';
    a.addEventListener('canplaythrough', () => { tracks[k] = a; }, { once: true });
    a.addEventListener('error', () => { delete tracks[k]; }, { once: true });
    a.src = src;
  }
}
function musicMood() {
  if (state.ending) return 'ending';
  if (bossActive() || collapseT > 0) return tracks.boss ? 'boss' : 'danger';
  return danger > 0 ? 'danger' : 'explore';
}
function music(dt) {
  const mood = musicMood();
  const pick = tracks[mood] || (mood === 'boss' && tracks.danger) || tracks.explore || null;
  for (const a of Object.values(tracks)) {
    const want = !muted && a === pick ? 0.45 : 0;
    a.volume = Math.max(0, Math.min(1, a.volume + Math.sign(want - a.volume) * Math.min(dt * 0.6, Math.abs(want - a.volume))));
    if (want > 0 && a.paused) a.play().catch(() => {});
    if (want === 0 && a.volume === 0 && !a.paused) a.pause();
  }
  if (pick || paused) return;
  musicTimer -= dt; if (musicTimer > 0 || muted || !audio) return;
  const calm = [262, 294, 330, 392, 440, 523], tense = [220, 233, 262, 311, 330];
  const scale = danger > 0 ? tense : calm, f = scale[Math.floor(Math.random() * scale.length)];
  tone(f, danger > 0 ? 0.35 : 0.9, danger > 0 ? 'triangle' : 'sine', danger > 0 ? 0.025 : 0.018);
  if (Math.random() < 0.3) tone(f / 2, 1.4, 'sine', 0.012);
  musicTimer = danger > 0 ? 0.32 : 0.9 + Math.random() * 0.6;
}

// ---------- Messages ----------
let gameTime = 0, msgUntil = 0;
function msg(t, dur = 4) { notice.textContent = t; notice.style.opacity = '1'; msgUntil = gameTime + dur; }

// ---------- Scene ----------
let engine, scene, camera, sun, shadows, glow, kit;
const quality = { base: 1, level: 0, frames: 0, time: 0 };
let hero, heroParts, sorcerer, karlModel;
const dragons = {}, dragonModels = {};
let karl = { x: 0, z: 0, state: 'wander', t: 0, heading: 0 };
const itemMeshes = {}, doorMeshes = new Map(), staticSolids = [];
let mirrorMeshes = [], beamMeshes = [], leverMeshes = [], pylonMeshes = [], sealMeshes = {}, bridgeMesh, crystalTarget;
let pedestalCrown, forgeFire, nestGold;

function setupScene() {
  engine = new Engine(canvas, true, { stencil: true, antialias: true });
  // Render at up to 1.5x on high-DPI screens; adaptive quality lowers it further if the frame rate drops.
  quality.base = 1 / Math.min(window.devicePixelRatio || 1, 1.5); engine.setHardwareScalingLevel(quality.base);
  scene = new Scene(engine);
  scene.skipPointerMovePicking = true;
  scene.clearColor = new Color4(0.62, 0.8, 0.92, 1);
  scene.fogMode = Scene.FOGMODE_EXP2; scene.fogDensity = 0.011; scene.fogColor = new Color3(0.62, 0.8, 0.92);
  camera = new ArcRotateCamera('cam', -Math.PI / 2, 1.0, 15, new Vector3(START_POINT.x, 1.5, START_POINT.z), scene);
  camera.attachControl(canvas, true);
  camera.inputs.removeByType('ArcRotateCameraKeyboardMoveInput');
  camera.lowerRadiusLimit = 8; camera.upperRadiusLimit = 26; camera.lowerBetaLimit = 0.45; camera.upperBetaLimit = 1.32;
  camera.wheelPrecision = 30; camera.panningSensibility = 0; camera.angularSensibilityX = 1400; camera.angularSensibilityY = 1400;
  const hemi = new HemisphericLight('sky', new Vector3(0.2, 1, 0.1), scene);
  hemi.intensity = 0.62; hemi.groundColor = new Color3(0.35, 0.33, 0.4);
  sun = new DirectionalLight('sun', new Vector3(-0.5, -1, 0.35), scene);
  sun.intensity = 0.85; sun.shadowFrustumSize = 44; sun.autoUpdateExtends = false;
  shadows = new ShadowGenerator(1024, sun);
  shadows.usePercentageCloserFiltering = true; shadows.bias = 0.002; shadows.darkness = 0.35;
  glow = new GlowLayer('glow', scene, { mainTextureSamples: 2 }); glow.intensity = 0.35;
  kit = makeKit(scene, shadows);
}

const THEMES = ['#8CC56E', '#C9B98E', '#9ED47F', '#6FAF6A', '#4F9A66', '#B9A77A', '#A9B86A', '#8DAF7E', '#A9BEC6', '#B7C6CF',
  '#7EB98A', '#AE9F86', '#6E6560', '#7C625A', '#8E9DB0', '#7BB07E', '#9C8E7A', '#6D6577', '#5E5468', '#4B4458'];
const occluder = m => { m.metadata = { occluder: true, y0: m.position.y }; return m; };

function stoneWall(w, h, d, x, z, hex = '#B8AD97', cap = '#D3C9B2') {
  const m = occluder(kit.box('wall', w, h, d, null, x, h / 2, z, hex));
  const c = occluder(kit.box('cap', w + 0.15, 0.25, d + 0.15, null, x, h + 0.1, z, cap));
  m.freezeWorldMatrix(); c.freezeWorldMatrix();
  return m;
}

function buildWorld() {
  rooms.forEach(r => {
    const g = MeshBuilder.CreateGround('ground' + r.id, { width: CELL, height: CELL }, scene);
    g.position.set(r.x, 0, r.z); g.material = kit.mat(THEMES[r.id]); g.receiveShadows = true; g.freezeWorldMatrix();
  });
  // Walls and doors
  for (const w of buildWalls()) {
    if (w.kind === 'wall' || w.kind === 'outer') { stoneWall(w.w, WALL_H, w.d, w.cx, w.cz); staticSolids.push(w); continue; }
    const d = w.door, meshes = [];
    if (w.kind === 'gate') {
      const key = itemDef(d.key), along = w.w > w.d, n = 6, span = Math.max(w.w, w.d);
      for (let i = 0; i < n; i++) {
        const o = -span / 2 + (i + 0.5) * (span / n);
        meshes.push(kit.box('bar', 0.18, WALL_H, 0.18, null, w.cx + (along ? o : 0), WALL_H / 2, w.cz + (along ? 0 : o), key.color, { glow: 0.15 }));
      }
      meshes.push(kit.box('gate-top', w.w + 0.3, 0.35, w.d + 0.3, null, w.cx, WALL_H - 0.2, w.cz, key.color, { glow: 0.2 }));
    } else if (w.kind === 'crack') {
      meshes.push(kit.box('cracked', w.w, WALL_H, w.d, null, w.cx, WALL_H / 2, w.cz, '#9C917E'));
      for (let i = 0; i < 4; i++) meshes.push(kit.box('crack', 0.14, 1.2, w.d + 0.06, null, w.cx - 1.2 + i * 0.8, 1.2 + (i % 2) * 0.6, w.cz, '#3A332B', { cast: false }));
    } else if (w.kind === 'sealed') {
      const m = kit.box('seal-wall', w.w, WALL_H, w.d, null, w.cx, WALL_H / 2, w.cz, '#9B7BFF', { cast: false });
      m.material = kit.mat('#9B7BFF', 0.6, 0.45); meshes.push(m);
    }
    meshes.forEach(occluder);
    doorMeshes.set(d, { meshes, open: 0, solid: w });
  }
  // River and bridge
  for (const b of riverBoxes()) {
    const water = MeshBuilder.CreateGround('river', { width: b.maxX - b.minX, height: b.maxZ - b.minZ }, scene);
    water.position.set((b.minX + b.maxX) / 2, 0.04, (b.minZ + b.maxZ) / 2);
    water.material = kit.mat('#3D8FD1', 0.25, 0.9);
  }
  bridgeMesh = kit.box('bridge-placed', RIVER.gap + 0.6, 0.25, RIVER.width + 1.2, null, BRIDGE_SPOT.x, 0.15, rooms[RIVER.room].z + RIVER.lz, '#A8743F');
  // Props with collision
  for (const p of PROPS) {
    staticSolids.push(p);
    if (p.kind === 'keep') castleKeep(p);
    else if (p.kind === 'tower') { occluder(kit.box('tower', p.w, 9, p.d, null, p.cx, 4.5, p.cz, '#8E7E95')); roof(p.cx, p.cz, 9, 3.2, '#5D4B73'); }
    else if (p.kind === 'furnace') {
      kit.box('furnace', p.w, 3, p.d, null, p.cx, 1.5, p.cz, '#5A4A48');
      occluder(kit.box('chimney', 1.4, 4, 1.4, null, p.cx + 2, 4.5, p.cz, '#4A3C3A'));
      forgeFire = kit.box('fire', 2.4, 1, 0.2, null, p.cx, 1.1, p.cz - p.d / 2 - 0.05, '#3A2A2A', { cast: false });
    } else if (p.kind === 'shelf') {
      occluder(kit.box('shelf', p.w, 3.2, p.d, null, p.cx, 1.6, p.cz, '#6E4B33'));
      for (let i = 0; i < 5; i++) kit.box('books', p.w + 0.05, 0.4, p.d + 0.05, null, p.cx, 0.6 + i * 0.55, p.cz, ['#B5483F', '#3F7FB5', '#D9B64A', '#5A9E5A'][i % 4], { cast: false });
    }
  }
  // Hiding grass (merged per patch for speed)
  for (const h of HIDING) {
    const blades = [];
    for (let n = 0; n < 16; n++) {
      const a = n * 2.4, r = (n % 5) * 0.38;
      const b = kit.cyl('grass', 0, 0.35, 1.6 + (n % 3) * 0.3, null, h.x + Math.sin(a) * r, 0.8, h.z + Math.cos(a) * r, '#6CB24E', { tess: 4, cast: false });
      b.rotation.z = Math.sin(a) * 0.15; blades.push(b);
    }
    const merged = Mesh.MergeMeshes(blades, true);
    if (merged) { merged.material = kit.mat('#6CB24E'); shadows.addShadowCaster(merged); merged.freezeWorldMatrix(); }
  }
  // Trees (with trunk collision), only outdoors and away from doors, props and items.
  const outdoor = [0, 2, 3, 4, 5, 6, 7, 8, 10, 11, 15, 17, 18];
  const itemPts = ITEMS.map(i => local(i.room, i.lx, i.lz));
  const clear = (x, z) => DOORS.every(d => { const p = doorPoint(d); return Math.hypot(p.x - x, p.z - z) > 4; })
    && PROPS.every(p => x < p.minX - 2 || x > p.maxX + 2 || z < p.minZ - 2 || z > p.maxZ + 2)
    && HIDING.every(h => Math.hypot(h.x - x, h.z - z) > 2.6)
    && itemPts.every(q => Math.hypot(q.x - x, q.z - z) > 2.5)
    && [...SECRETS.map(s => s.at), ...Object.values(SEALS)].every(q => Math.hypot(q.x - x, q.z - z) > 2.5)
    && Math.abs(z - (rooms[10].z + RIVER.lz)) > 2.5;
  for (const id of outdoor) {
    const r = rooms[id], dark = id >= 17;
    for (let n = 0; n < 7; n++) {
      const x = r.x + Math.sin(id * 3.1 + n * 2.3) * 7, z = r.z + Math.cos(id * 1.7 + n * 1.9) * 7;
      if ((n + id) % 3 === 0 || !clear(x, z) || Math.hypot(x - r.x, z - r.z) < 3) continue;
      const s = 0.75 + ((id + n) % 4) * 0.12;
      kit.box('trunk', 0.55 * s, 2.4 * s, 0.55 * s, null, x, 1.2 * s, z, '#6E4A33').freezeWorldMatrix();
      const f1 = occluder(kit.ball('leaves', 3 * s, null, x, 3.2 * s, z, dark ? '#4F4A63' : '#2F8A57', { seg: 8 }));
      const f2 = occluder(kit.ball('leaves', 2.2 * s, null, x + 0.6 * s, 4.1 * s, z - 0.3 * s, dark ? '#655C7C' : '#4DAA6A', { seg: 8 }));
      f1.freezeWorldMatrix(); f2.freezeWorldMatrix();
      staticSolids.push({ minX: x - 0.35 * s, maxX: x + 0.35 * s, minZ: z - 0.35 * s, maxZ: z + 0.35 * s, kind: 'tree' });
    }
  }
  // Rocks in quarry and mine
  for (const id of [11, 12]) for (let n = 0; n < 6; n++) {
    const r = rooms[id], x = r.x + Math.sin(n * 2.1 + id) * 6.5, z = r.z + Math.cos(n * 1.3 + id) * 6.5;
    if (!clear(x, z)) continue;
    const s = 1.6 + (n % 3) * 0.5;
    kit.ball('rock', s, null, x, 0.4, z, id === 12 ? '#4D4646' : '#8F857A', { seg: 6, scale: [1, 0.6, 1.2] }).freezeWorldMatrix();
    staticSolids.push({ minX: x - s * 0.4, maxX: x + s * 0.4, minZ: z - s * 0.5, maxZ: z + s * 0.5, kind: 'tree' });
  }
  roomDetails();
}

function roof(x, z, h, d, hex) {
  const r = MeshBuilder.CreateCylinder('roof', { diameterTop: 0, diameterBottom: d, height: 2.6, tessellation: 4 }, scene);
  r.position.set(x, h + 1.3, z); r.rotation.y = Math.PI / 4; r.material = kit.mat(hex); shadows.addShadowCaster(r);
  occluder(r);
}

function castleKeep(p) {
  const [wall, dark, banner] = { 1: ['#EAC27A', '#C9963F', '#F5D15D'], 9: ['#DCE6EE', '#9FC0D8', '#9FE7FF'], 19: ['#463A55', '#2C2238', '#A16BCC'] }[p.room];
  const h = 6, wide = p.w > p.d;
  occluder(kit.box('keep', p.w, h, p.d, null, p.cx, h / 2, p.cz, wall));
  const long = wide ? p.w : p.d, n = Math.floor(long / 1.2);
  for (let i = 0; i < n; i += 2) {
    const o = -long / 2 + 0.6 + i * (long - 1.2) / (n - 1);
    occluder(kit.box('crenel', 0.8, 0.8, 0.8, null, wide ? p.cx + o : p.cx - p.w / 2 + 0.4, h + 0.4, wide ? p.cz - p.d / 2 + 0.4 : p.cz + o, wall));
  }
  for (const s of [-1, 1]) {
    const tx = wide ? p.cx + s * (p.w / 2) : p.cx, tz = wide ? p.cz : p.cz + s * (p.d / 2);
    occluder(kit.cyl('tower', 2.4, 2.6, h + 3, null, tx, (h + 3) / 2, tz, wall));
    roof(tx, tz, h + 3, 3.4, dark);
  }
  const front = wide ? { x: p.cx, z: p.cz - p.d / 2 - 0.06, ry: 0 } : { x: p.cx - p.w / 2 - 0.06, z: p.cz, ry: Math.PI / 2 };
  kit.box('keep-door', 2.2, 3, 0.1, null, front.x, 1.5, front.z, '#4A3324').rotation.y = front.ry;
  kit.box('banner', 1.4, 2.2, 0.08, null, front.x + (wide ? 3 : 0), 3.6, front.z + (wide ? 0 : 3), banner, { glow: 0.2 }).rotation.y = front.ry;
}

function roomDetails() {
  // Sun pedestal (sanctuary + ending altar)
  kit.cyl('pedestal', 1.6, 2.0, 1.1, null, PEDESTAL.x, 0.55, PEDESTAL.z, '#F0CF7A');
  kit.ball('sun-orb', 0.8, null, PEDESTAL.x, 1.6, PEDESTAL.z, '#FFD54A', { glow: 0.7 });
  staticSolids.push({ minX: PEDESTAL.x - 0.8, maxX: PEDESTAL.x + 0.8, minZ: PEDESTAL.z - 0.8, maxZ: PEDESTAL.z + 0.8, kind: 'prop' });
  pedestalCrown = kit.cyl('placed-crown', 0.9, 0.9, 0.5, null, PEDESTAL.x, 2.3, PEDESTAL.z, '#FFE066', { glow: 0.5 });
  // Nest
  const nest = local(6, 0, 0);
  const ring = MeshBuilder.CreateTorus('nest', { diameter: 5, thickness: 0.9, tessellation: 20 }, scene);
  ring.position.set(nest.x, 0.3, nest.z); ring.material = kit.mat('#8A6A3C'); ring.receiveShadows = true;
  nestGold = kit.ball('nest-gold', 1.2, null, nest.x, 0.5, nest.z, '#FFD24D', { glow: 0.3, scale: [1.4, 0.5, 1.2] });
  // Frost mural on the keep wall
  kit.box('mural', 0.08, 2.4, 3.4, null, MURAL.x + 0.4, 1.8, MURAL.z, '#6FA8DC', { glow: 0.25 });
  for (let i = 0; i < 3; i++) kit.ball('mural-dragon', 0.5, null, MURAL.x + 0.32, 1.4 + i * 0.4, MURAL.z - 1 + i, ['#E8B53A', '#3FA568', '#C9483F'][i], { glow: 0.3, cast: false });
  // Archive tablet and blueprint lectern
  kit.box('tablet', 2.6, 1.8, 0.3, null, TABLET.x, 0.9, TABLET.z, '#7E7A70');
  RUNE_COLORS.forEach((c, i) => kit.ball('rune', 0.35, null, TABLET.x - 0.8 + i * 0.8, 1.3, TABLET.z - 0.18, c, { glow: 0.8, cast: false }));
  kit.box('lectern', 1, 1.1, 0.7, null, LECTERN.x, 0.55, LECTERN.z, '#6E4B33');
  kit.box('blueprint', 0.9, 0.05, 0.6, null, LECTERN.x, 1.15, LECTERN.z, '#7FB6FF', { glow: 0.4, cast: false });
  // Forge levers and anvil
  kit.box('anvil', 1.4, 0.8, 0.7, null, rooms[13].x - 4.5, 0.4, rooms[13].z + 2.5, '#3E3E46');
  leverMeshes = LEVERS.map((p, i) => {
    kit.box('lever-base', 0.8, 0.5, 0.8, null, p.x, 0.25, p.z, '#4D4A52');
    const handle = kit.cyl('lever', 0.15, 0.15, 1.5, null, p.x, 1.1, p.z, '#8B8B95');
    kit.ball('lever-knob', 0.4, handle, 0, 0.75, 0, RUNE_COLORS[i], { glow: 0.7 });
    staticSolids.push({ minX: p.x - 0.4, maxX: p.x + 0.4, minZ: p.z - 0.4, maxZ: p.z + 0.4, kind: 'prop' });
    return handle;
  });
  // Mirror Hall: light source, mirrors, target crystal
  const src = local(14, -7.6, 0);
  kit.ball('light-source', 0.9, null, src.x, 1.5, src.z, '#FFF3B0', { glow: 1 });
  mirrorMeshes = MIRRORS.map(m => {
    const p = mirrorPos(m);
    kit.cyl('mirror-base', 1, 1.2, 0.3, null, p.x, 0.15, p.z, '#7A7488');
    staticSolids.push({ minX: p.x - 0.55, maxX: p.x + 0.55, minZ: p.z - 0.55, maxZ: p.z + 0.55, kind: 'prop' });
    return kit.box('mirror', 2.0, 2.2, 0.16, null, p.x, 1.4, p.z, '#CFF6FF', { glow: 0.15 });
  });
  const tgt = local(14, 6, 6);
  crystalTarget = kit.cyl('beam-target', 0, 1.0, 1.6, null, tgt.x, 1.5, tgt.z, '#6FF0FF', { glow: 0.3, tess: 6 });
  // Shadow seals, pylons, sorcerer
  for (const [k, p] of Object.entries(SEALS)) {
    const ring2 = MeshBuilder.CreateTorus('seal', { diameter: 2.2, thickness: 0.25, tessellation: 24 }, scene);
    ring2.position.set(p.x, 1.5, p.z); ring2.material = kit.mat('#7C3CFF', 0.8); sealMeshes[k] = ring2;
  }
  pylonMeshes = PYLONS.map(p => kit.cyl('pylon', 0.3, 1.1, 3, null, p.x, 1.5, p.z, '#9C5CFF', { glow: 0.6, tess: 5 }));
  sorcerer = makeSorcerer(kit); sorcerer.root.position.set(SORCERER_POINT.x, 0.4, SORCERER_POINT.z); sorcerer.root.rotation.y = Math.PI;
  for (const s of SECRETS) kit.ball('sparkle', 0.25, null, s.at.x, 0.8, s.at.z, '#FFFFFF', { glow: 1, cast: false });
  // Torches
  for (const id of [1, 9, 12, 13, 16, 19]) for (const s of [-1, 1]) {
    const p = local(id, s * 7.5, -7.5);
    kit.cyl('torch', 0.15, 0.15, 1.6, null, p.x, 0.8, p.z, '#5B3E2B', { cast: false });
    kit.ball('flame', 0.35, null, p.x, 1.75, p.z, '#FF9A3C', { glow: 1, cast: false });
  }
}

function buildItems() {
  for (const it of ITEMS) {
    const root = kit.node('item-' + it.id);
    if (it.type === 'key') {
      const ring = MeshBuilder.CreateTorus('key-ring', { diameter: 0.6, thickness: 0.16, tessellation: 16 }, scene);
      ring.parent = root; ring.material = kit.mat(it.color, 0.45); ring.rotation.x = Math.PI / 2; ring.position.y = 0.35;
      kit.box('key-shaft', 0.14, 0.8, 0.14, root, 0, -0.2, 0, it.color, { glow: 0.45 });
      kit.box('key-tooth', 0.3, 0.12, 0.14, root, 0.14, -0.5, 0, it.color, { glow: 0.45 });
    } else if (it.type === 'sword') {
      kit.box('blade', 0.16, 1.4, 0.05, root, 0, 0.35, 0, it.color, { glow: 0.25 });
      kit.box('guard', 0.6, 0.12, 0.15, root, 0, -0.38, 0, '#C9A23F');
      kit.box('grip', 0.12, 0.4, 0.12, root, 0, -0.62, 0, '#5B3E2B');
    } else if (it.type === 'bridge') {
      kit.box('plank', 1.6, 0.14, 0.7, root, 0, 0, 0, it.color);
    } else if (it.type === 'crown') {
      kit.cyl('crown', 0.9, 0.75, 0.45, root, 0, 0, 0, it.color, { glow: 0.5 });
      for (let i = 0; i < 5; i++) { const a = i / 5 * Math.PI * 2; kit.cyl('spike', 0, 0.18, 0.35, root, Math.sin(a) * 0.38, 0.38, Math.cos(a) * 0.38, it.color, { glow: 0.5, tess: 4 }); }
      kit.ball('gem', 0.2, root, 0, 0.05, 0.42, '#E8483F', { glow: 0.7 });
    } else if (it.type === 'crystal') {
      kit.cyl('crystal', 0, 0.6, 1.0, root, 0, 0.25, 0, it.color, { glow: 0.8, tess: 6 });
      kit.cyl('crystal2', 0.6, 0, 0.5, root, 0, -0.5, 0, it.color, { glow: 0.8, tess: 6 });
    } else {
      kit.ball('gold-pile', 0.9, root, 0, 0, 0, it.color, { glow: 0.4, scale: [1.2, 0.7, 1] });
    }
    itemMeshes[it.id] = root;
  }
}

// ---------- Items ----------
function itemState(id) {
  const def = itemDef(id);
  if (state.items[id]) return state.items[id];
  if (def.hiddenUntil && !flag(def.hiddenUntil)) return { owner: 'hidden' };
  const p = local(def.room, def.lx, def.lz);
  return { owner: 'world', x: p.x, z: p.z };
}
const holding = id => state.held === id;
function pick(id) {
  if (state.held) { msg('Your hands are full. Press Q (or DROP) to put down the ' + itemDef(state.held).label + ' first.'); sfx('wrong'); return; }
  state.held = id; state.items[id] = { owner: 'hero' };
  state.score += 10; sfx('pick');
  msg('You picked up the ' + itemDef(id).label + '.' + (id === 'sword' ? ' Press J to swing it.' : ''));
  if (id === 'crown' && setFlag('CROWN', 300)) startEscape();
  save();
}
function dropAt(x, z, quiet = false) {
  if (!state.held) return;
  const id = state.held; state.held = null;
  state.items[id] = { owner: 'world', x, z };
  if (!quiet) { msg('You put down the ' + itemDef(id).label + '.'); sfx('drop'); }
  save();
}
function drop() {
  if (!state.held) return;
  const f = heroForward();
  const spot = moveCircle(state.hero.x, state.hero.z, f.x * 1.1, f.z * 1.1, 0.3, solids());
  dropAt(spot.x, spot.z);
}
function consumeHeld(owner = 'used') {
  const id = state.held; state.held = null; state.items[id] = { owner }; return id;
}
function showMesh(m, v) { m.getChildMeshes().forEach(c => { c.visibility = v; }); }
function syncItems() {
  for (const it of ITEMS) {
    const m = itemMeshes[it.id], s = itemState(it.id);
    if (s.owner === 'hero') {
      m.setEnabled(true); m.parent = it.type === 'sword' ? heroParts.sword : heroParts.hand;
      m.position.set(0, it.type === 'sword' ? 0.55 : 0, 0); m.rotation.set(it.type === 'sword' ? Math.PI / 2 : 0, 0, 0);
      m.scaling.setAll(0.75);
    } else if (s.owner === 'world') {
      m.parent = null; m.setEnabled(true); m.scaling.setAll(1); showMesh(m, 1);
      m.position.set(s.x, 1.1 + Math.sin(gameTime * 2.5 + s.x) * 0.15, s.z); m.rotation.set(0, gameTime * 1.2, 0);
    } else if (s.owner === 'karl') {
      m.parent = null; m.setEnabled(true); m.scaling.setAll(0.6); showMesh(m, 1);
      m.position.set(karl.x, 1.7, karl.z);
    } else m.setEnabled(false);
  }
  bridgeMesh.setEnabled(flag('BRIDGE_PLACED'));
  pedestalCrown.setEnabled(flag('ENDING'));
  nestGold.setEnabled(flag('GOLD_TRUST'));
}

// ---------- Collision ----------
let solidsCache = null, sightCache = null, solidsCacheVer = -1;
function solids() {
  if (solidsCacheVer === solidsVersion) return solidsCache;
  const list = [...staticSolids];
  for (const [d, dm] of doorMeshes) if (!doorOpen(d, state.flags)) list.push(dm.solid);
  const [left, mid, right] = riverBoxes();
  list.push(left, right); if (!flag('BRIDGE_PLACED')) list.push(mid);
  PYLONS.forEach((p, i) => { if (!state.pylons[i]) list.push({ minX: p.x - 0.6, maxX: p.x + 0.6, minZ: p.z - 0.6, maxZ: p.z + 0.6, kind: 'prop' }); });
  solidsCache = list; solidsCacheVer = solidsVersion;
  sightCache = list.filter(b => !['river', 'river-gap', 'tree', 'prop'].includes(b.kind));
  return list;
}
function los(x1, z1, x2, z2) { solids(); return !sightCache.some(b => segmentHitsBox(x1, z1, x2, z2, b)); }
const nav = (x, z, goal) => navWaypoint(x, z, goal, state.flags);

// ---------- Hero ----------
const input = { keys: new Set(), stick: { x: 0, y: 0 } };
const H = { attackT: -1, dodgeT: -1, dodgeCd: 0, invuln: 0, moving: false, speed: 0, face: 0, healT: 0 };
function heroForward() { return { x: Math.sin(H.face), z: Math.cos(H.face) }; }
const sprinting = () => input.keys.has('ShiftLeft') || input.keys.has('ShiftRight') || Math.hypot(input.stick.x, input.stick.y) > 0.95;
function heroHidden() { return isHidden(state.hero.x, state.hero.z) && !sprinting() && H.attackT < 0; }

function hurt(source) {
  if (H.invuln > 0 || H.dodgeT >= 0 || state.ending) return;
  state.hero.health -= 1; H.invuln = 1.2; sfx('hurt'); shake = 0.35;
  if (state.hero.health > 0) { msg(source + ' hit you! ' + '♥'.repeat(state.hero.health) + ' left. Dodge with SPACE.'); renderHud(true); return; }
  const fallen = { x: state.hero.x, z: state.hero.z };
  if (state.held) dropAt(fallen.x, fallen.z, true);
  const back = flag('SANCTUARY') ? SANCTUARY_POINT : START_POINT;
  state.hero.x = back.x; state.hero.z = back.z; state.hero.health = 3; H.invuln = 2;
  hero.position.set(back.x, 0, back.z); camera.target.set(back.x, 1.6, back.z);
  for (const d of Object.values(dragons)) if (!['defeated', 'friendly'].includes(d.state)) { d.state = 'return'; d.t = 0; }
  orbs.forEach(o => o.mesh.dispose()); orbs.length = 0;
  msg('You were knocked out and woke up at ' + (flag('SANCTUARY') ? 'the Sun Castle sanctuary' : 'the Golden Garden') + '. Anything you carried was left where you fell.', 7);
  renderHud(true); save();
}

function tryAttack() {
  if (!holding('sword')) { msg('You need to be carrying the Sword to attack. It is in the Training Yard.'); return; }
  if (H.attackT >= 0) return;
  H.attackT = 0; sfx('swing');
  const f = heroForward(), p = state.hero;
  let hitSomething = false;
  for (const def of Object.values(DRAGONS)) {
    const d = dragons[def.id];
    if (d.state === 'defeated') continue;
    const dx = d.x - p.x, dz = d.z - p.z, dist = Math.hypot(dx, dz) || 0.01;
    if (dist > 3.6 || (dx * f.x + dz * f.z) / dist < 0.3) continue;
    hitSomething = true;
    if (friendly(def.id)) { msg('The ' + def.name + ' is your friend. You lower the sword.'); continue; }
    const r = hitDragon(d, p); sfx('hit'); state.score += 25;
    if (r === 'defeated') {
      setFlag(def.id.toUpperCase() + '_DEAD', 150); sfx('roar');
      msg('The ' + def.name + ' is defeated. (Befriending it would have opened a kinder ending.)', 6);
    } else msg('Hit! The ' + def.name + ' staggers. ' + d.hp + ' more hit' + (d.hp > 1 ? 's' : '') + ' to defeat it.');
  }
  if (karl.state !== 'stunned' && Math.hypot(karl.x - p.x, karl.z - p.z) < 2.8) {
    karl.state = 'stunned'; karl.t = 0; hitSomething = true; sfx('hit');
    if (karl.stolen) { state.items[karl.stolen] = { owner: 'world', x: karl.x, z: karl.z }; msg('Karl drops the ' + itemDef(karl.stolen).label + '!'); karl.stolen = null; }
    else msg('Karl the Kameleon turns bright pink with surprise and freezes.');
  }
  if (!hitSomething && Math.random() < 0.4) msg('Swish! Nothing in reach.', 1.5);
}
function tryDodge() {
  if (H.dodgeCd > 0 || H.dodgeT >= 0) return;
  H.dodgeT = 0; H.dodgeCd = 0.9; H.invuln = Math.max(H.invuln, 0.4); sfx('dodge');
}

// ---------- Interactions ----------
const DOOR_NAMES = { SUN_OPEN: 'Sun Castle', FROST_OPEN: 'Frost Castle', SHADOW_OPEN: 'Shadow Castle' };
function friendly(id) { return flag(id.toUpperCase() + '_TRUST') || (flag('DRAGONS_FREE') && dragons[id].state !== 'defeated'); }

function interactions() {
  const p = state.hero, list = [];
  const add = (pt, r, label, fn) => { const d = Math.hypot(pt.x - p.x, pt.z - p.z); if (d < r) list.push({ d, label, fn }); };
  for (const it of ITEMS) {
    const s = itemState(it.id);
    if (s.owner === 'world') add(s, 2.2, 'Pick up the ' + it.label, () => pick(it.id));
  }
  for (const d of DOORS) {
    if (!d.lock || d.river || doorOpen(d, state.flags)) continue;
    const pt = doorPoint(d);
    if (d.gate) {
      const key = itemDef(d.key);
      add(pt, 3, holding(d.key) ? 'Unlock the ' + DOOR_NAMES[d.lock] + ' gate' : DOOR_NAMES[d.lock] + ' gate (locked)', () => {
        if (!holding(d.key)) { msg('Locked. You need the ' + key.label + '.'); sfx('wrong'); return; }
        consumeHeld('used'); setFlag(d.lock, 150); sfx('unlock'); openDoorAnim(d);
        msg('The ' + DOOR_NAMES[d.lock] + ' gate rises!');
      });
    } else if (d.crack) add(pt, 3, 'Examine the cracked wall', () => msg('The wall is badly cracked, but too strong for you. It shakes whenever something huge stomps nearby...', 6));
    else if (d.sealed) add(pt, 3, 'Examine the glowing seal', () => msg('A wall of mirror-light. It will fade when the Mirror Hall beam reaches its crystal.', 5));
  }
  add(PEDESTAL, 2.8, holding('crown') ? 'Place the Dragon Crown' : !flag('SANCTUARY') ? 'Touch the sun pedestal' : 'Rest at the sanctuary', () => {
    if (holding('crown')) return endingMenu();
    if (setFlag('SANCTUARY')) { sfx('win'); state.hero.health = 3; msg('The sanctuary glows. If you are knocked out you will wake up here, and resting here heals you.', 7); return; }
    state.hero.health = 3; msg('You rest. Health restored.', 2);
  });
  for (const def of Object.values(DRAGONS)) {
    const d = dragons[def.id]; if (d.state === 'defeated') continue;
    const ID = def.id.toUpperCase();
    let label = 'Talk to the ' + def.name;
    if (def.id === 'gold' && holding('treasure') && mayEarnTrust(state.flags, ID)) label = 'Give the Dragon Gold back';
    if (def.id === 'red' && holding('crown') && flag('BLUEPRINT') && mayEarnTrust(state.flags, ID)) label = 'Show the Red Dragon the new pact';
    add(d, 4, label, () => talkDragon(def));
  }
  add(MURAL, 2.6, 'Read the mural', () => { setFlag('MURAL'); sfx('click'); msg('The mural shows the Shadow Sorcerer forging collars with the Dragon Crown. The dragons were not always angry: they were enslaved.', 8); });
  add(LECTERN, 2.4, 'Read the ancient blueprint', () => { setFlag('BLUEPRINT'); sfx('click'); msg('Blueprint: "Reforged at the Ancient Forge, the Crown can protect the kingdom without binding any dragon." Show this promise to an angry dragon...', 8); });
  add(TABLET, 2.6, 'Read the rune tablet', () => {
    setFlag('RUNES_READ', 20); sfx('click');
    msg('The tablet reads: pull the forge levers in this order: ' + leverOrder(state.seed).map(i => RUNES[i]).join(', then ') + '.', 9);
  });
  LEVERS.forEach((pt, i) => add(pt, 1.9, flag('FORGE') ? 'The forge is roaring' : 'Pull the ' + RUNES[i] + ' lever', () => {
    if (flag('FORGE')) { msg('The Ancient Forge burns bright.'); return; }
    const r = pullLever(state.levers, i, state.seed); state.levers = r.pulled; sfx('click');
    leverMeshes[i].rotation.x = 0.7;
    if (r.result === 'wrong') { sfx('wrong'); msg('Clunk. The levers snap back. Wrong order' + (flag('RUNES_READ') ? '.' : ': maybe the Stone Archive has a clue.')); leverMeshes.forEach(l => { l.rotation.x = 0; }); }
    else if (r.result === 'done') { setFlag('FORGE', 200); sfx('win'); msg('The Ancient Forge roars back to life! The Dragon Crown could now be reforged.', 7); }
    else msg(RUNES[i] + ' lever locked in place.');
  }));
  MIRRORS.forEach((m, i) => add(mirrorPos(m), 1.9, flag('MIRRORS') ? 'Mirror (locked in place)' : 'Turn the mirror', () => {
    if (flag('MIRRORS')) return;
    state.mirrors = toggleMirror(state.mirrors, i); sfx('click'); updateBeam();
  }));
  add(BRIDGE_SPOT, 2.6, flag('BRIDGE_PLACED') ? 'Plank bridge' : holding('bridge') ? 'Lay the plank across the river' : 'Look at the river', () => {
    if (flag('BRIDGE_PLACED')) return;
    if (!holding('bridge')) { msg('The river is too wide to jump. A long plank would make a bridge.'); return; }
    consumeHeld('placed'); setFlag('BRIDGE_PLACED'); sfx('unlock'); msg('You lay the plank across the river. A new path opens to the south.');
  });
  for (const [k, pt] of Object.entries(SEALS)) if (!flag(k)) add(pt, 2.8, holding('crystal') ? 'Shatter the shadow seal' : 'Examine the shadow seal', () => {
    if (!holding('crystal')) { msg('Your eyes slide off the seal. The Crystal of Truth could reveal its weak point.'); sfx('wrong'); return; }
    setFlag(k, 150); sfx('break'); msg('The Crystal flares and the shadow seal shatters!' + (flag('SEAL1') && flag('SEAL2') ? ' Both seals are gone: the Sorcerer is unprotected.' : ' One seal remains.'), 6);
  });
  if (bossActive()) PYLONS.forEach((pt, i) => { if (!state.pylons[i]) add(pt, 2.4, 'Break the shadow pylon', () => breakPylon(i)); });
  if (roomAt(p.x, p.z) === 19 && !flag('BOSS_DONE')) add(SORCERER_POINT, 4.5, 'Confront the Sorcerer', () => {
    msg(flag('SEAL1') && flag('SEAL2') ? '"You broke my seals! You will never take the Crown!" Break his three pylons.' : 'A shadow shield protects the Sorcerer. Two seals still feed it: one on Shadow Road, one at Shadow Gate.', 6);
  });
  for (const s of SECRETS) if (!flag(s.flag)) add(s.at, 2.2, 'Search here', () => { setFlag(s.flag, 250); sfx('win'); msg(s.text, 6); });
  list.sort((a, b) => a.d - b.d);
  return list[0] || null;
}

function talkDragon(def) {
  const ID = def.id.toUpperCase(), d = dragons[def.id];
  if (friendly(def.id)) { msg('The ' + def.name + ' rumbles happily and nudges you with its snout.'); return; }
  if (def.id === 'gold' && holding('treasure') && mayEarnTrust(state.flags, ID)) {
    consumeHeld('nest'); setFlag('GOLD_TRUST', 200); sfx('win'); d.state = 'friendly';
    msg('The Gold Dragon gently takes back its stolen gold. Its collar cracks: it trusts you now!', 7); return;
  }
  if (def.id === 'red' && holding('crown') && flag('BLUEPRINT') && mayEarnTrust(state.flags, ID)) {
    setFlag('RED_TRUST', 200); sfx('win'); d.state = 'friendly';
    msg('You show the Red Dragon the blueprint’s promise. It bows its head: no more collars. The Red Dragon trusts you!', 7); return;
  }
  msg({
    gold: 'The Gold Dragon growls and guards its empty nest. Something precious was stolen from it.',
    green: 'The Green Dragon snorts. Its collar glows with the same light as the Mirror Hall.',
    red: 'The Red Dragon roars. Maybe the ancient blueprint explains how to calm it.'
  }[def.id], 6);
}

function openDoorAnim(d) { const dm = doorMeshes.get(d); if (dm) dm.opening = true; }
function syncDoors(dt) {
  for (const [d, dm] of doorMeshes) {
    if (!doorOpen(d, state.flags) || dm.open >= 1) continue;
    dm.open = Math.min(1, dm.open + dt * (dm.opening ? 0.8 : 100));
    dm.meshes.forEach(m => {
      if (d.gate) { m.position.y = m.metadata.y0 - dm.open * (WALL_H + 0.4); if (dm.open >= 1) m.setEnabled(false); }
      else if (d.crack) { m.position.y -= dt * 3; m.rotation.z += dt * (m.position.x % 2 ? 1 : -1); if (dm.open >= 1) m.setEnabled(false); }
      else { m.visibility = 1 - dm.open; if (dm.open >= 1) m.setEnabled(false); }
    });
  }
}

// ---------- Mirror beam ----------
function updateBeam() {
  beamMeshes.forEach(m => m.dispose()); beamMeshes = [];
  MIRRORS.forEach((m, i) => { mirrorMeshes[i].rotation.y = state.mirrors[i] === '/' ? Math.PI / 4 : -Math.PI / 4; });
  const { path, solved } = traceBeam(state.mirrors);
  const pt = c => local(14, c.i < 0 ? -7.6 : -6 + c.i * 3, -6 + c.j * 3);
  for (let n = 0; n < path.length - 1; n++) {
    const a = pt(path[n]), b = pt(path[n + 1]);
    const len = Math.hypot(b.x - a.x, b.z - a.z);
    const seg = kit.box('beam', len + 0.15, 0.14, 0.14, null, (a.x + b.x) / 2, 1.5, (a.z + b.z) / 2, '#FFF3B0', { glow: 1, cast: false });
    seg.rotation.y = -Math.atan2(b.z - a.z, b.x - a.x); seg.isPickable = false; beamMeshes.push(seg);
  }
  crystalTarget.material = kit.mat('#6FF0FF', solved ? 1 : 0.3);
  if (solved && setFlag('MIRRORS', 250)) {
    sfx('win'); openDoorAnim(DOORS.find(d => d.sealed));
    let t = 'The beam strikes the crystal! The Crystal of Truth appears, and the seal to the Forge fades.';
    if (mayEarnTrust(state.flags, 'GREEN')) { setFlag('GREEN_TRUST', 200); dragons.green.state = 'friendly'; t += ' Far away, the Green Dragon’s collar shatters: it is free and trusts you!'; }
    msg(t, 9);
  }
}

// ---------- Boss & escape ----------
const orbs = [], debris = [];
let orbTimer = 2, collapseT = 0, debrisTimer = 0, shake = 0;
function bossActive() { return roomAt(state.hero.x, state.hero.z) === 19 && flag('SEAL1') && flag('SEAL2') && !flag('BOSS_DONE'); }
function breakPylon(i) {
  state.pylons[i] = true; solidsVersion++; sfx('break'); shake = 0.3; state.score += 50;
  const left = state.pylons.filter(x => !x).length;
  if (left) { msg('Pylon shattered! ' + left + ' to go.'); return; }
  setFlag('BOSS_DONE', 400); sfx('win');
  orbs.forEach(o => o.mesh.dispose()); orbs.length = 0;
  msg('The Sorcerer collapses, powerless. "The Crown... was never meant to chain them." The Dragon Crown appears!', 8);
}
function updateBoss(dt) {
  const s = sorcerer;
  s.shield.setEnabled(!(flag('SEAL1') && flag('SEAL2')));
  s.root.position.y = flag('BOSS_DONE') ? 0 : 0.4 + Math.sin(gameTime * 1.5) * 0.3;
  s.body.rotation.x = flag('BOSS_DONE') ? 0.5 : 0;
  s.orb.material = kit.mat('#C77DFF', flag('BOSS_DONE') ? 0.1 : 1);
  pylonMeshes.forEach((m, i) => { m.setEnabled(!state.pylons[i]); m.rotation.y = gameTime; });
  if (bossActive() && !state.ending) {
    danger = 1; orbTimer -= dt;
    if (orbTimer <= 0) {
      orbTimer = 1.5 + Math.random() * 0.6;
      const p = state.hero, a = Math.atan2(p.x - SORCERER_POINT.x, p.z - SORCERER_POINT.z);
      const mesh = kit.ball('orb', 0.7, null, SORCERER_POINT.x, 2, SORCERER_POINT.z, '#C77DFF', { glow: 1, cast: false });
      orbs.push({ x: SORCERER_POINT.x, z: SORCERER_POINT.z, vx: Math.sin(a) * 8, vz: Math.cos(a) * 8, life: 4, mesh }); sfx('zap');
    }
  }
  for (let i = orbs.length - 1; i >= 0; i--) {
    const o = orbs[i]; o.x += o.vx * dt; o.z += o.vz * dt; o.life -= dt;
    o.mesh.position.set(o.x, 1.4, o.z);
    if (Math.hypot(o.x - state.hero.x, o.z - state.hero.z) < 0.9) { hurt('A shadow orb'); o.life = 0; }
    if (o.life <= 0 || roomAt(o.x, o.z) !== 19) { o.mesh.dispose(); orbs.splice(i, 1); }
  }
}
function startEscape() {
  collapseT = 28; shake = 0.6; sfx('roar');
  msg('The Shadow Castle is collapsing! Run! Bring the Crown home to the Sun Castle pedestal.', 8);
}
function updateEscape(dt) {
  if (collapseT <= 0) return;
  collapseT -= dt; debrisTimer -= dt;
  if ([17, 18, 19].includes(roomAt(state.hero.x, state.hero.z)) && debrisTimer <= 0) {
    debrisTimer = 0.55;
    const a = Math.random() * Math.PI * 2, d = Math.random() * 3.5;
    const x = state.hero.x + Math.sin(a) * d, z = state.hero.z + Math.cos(a) * d;
    const ring = MeshBuilder.CreateDisc('warn', { radius: 1.2, tessellation: 20 }, scene);
    ring.rotation.x = Math.PI / 2; ring.position.set(x, 0.06, z); ring.material = kit.mat('#FF4A3D', 0.6, 0.6);
    debris.push({ x, z, t: 0, ring, rock: kit.box('debris', 1.1, 1.1, 1.1, null, x, 14, z, '#4B4458') });
  }
  for (let i = debris.length - 1; i >= 0; i--) {
    const b = debris[i]; b.t += dt;
    b.rock.position.y = Math.max(0.55, 14 - b.t * b.t * 16); b.rock.rotation.x += dt * 4;
    if (b.t > 0.93 && !b.hit) { b.hit = true; shake = Math.max(shake, 0.15); if (Math.hypot(b.x - state.hero.x, b.z - state.hero.z) < 1.3) hurt('Falling rubble'); }
    if (b.t > 2) { b.ring.dispose(); b.rock.dispose(); debris.splice(i, 1); }
  }
}

// ---------- Ending ----------
let paused = true, overlayType = '';
function endingMenu() {
  if (!holding('crown')) return;
  const e = endingEligibility({ ...state.flags, CROWN_AT_PEDESTAL: true });
  openOverlay('ending', `<h1>The Crown Comes Home</h1>
    <p>The Dragon Crown glows above the sun pedestal. What will you do with its power?</p>
    <button data-end="OLD">Restore the old order <small>The dragons stay bound to the Crown.</small></button>
    <button data-end="FREE" ${e.free ? '' : 'disabled'}>Free the dragons <small>${e.free ? 'Break every collar.' : 'Needs: read the ancient blueprint'}</small></button>
    <button data-end="UNITED" ${e.united ? '' : 'disabled'}>Form a new pact <small>${e.united ? 'Reforge the Crown so dragons and people protect each other.' : 'Needs: blueprint, restored forge, and the trust of all three dragons'}</small></button>
    <button data-close>Not yet</button>`);
  $('overlay').querySelectorAll('[data-end]').forEach(b => { b.onclick = () => finish(b.dataset.end); });
}
function finish(kind) {
  consumeHeld('pedestal');
  state.ending = ENDINGS[kind]; setFlag('ENDING', 500); setFlag('CROWN_AT_PEDESTAL', 0);
  if (kind !== 'OLD') setFlag('DRAGONS_FREE', 0);
  collapseT = 0; sfx('win');
  const text = {
    OLD: 'The kingdom is safe again, but the three dragons remain chained to the Crown. Somewhere, the Sorcerer smiles.',
    FREE: 'Every collar breaks. The dragons fly free over Atheon, and a new, wilder age begins.',
    UNITED: 'Reforged in the Ancient Forge, the Crown binds no one. The Gold, Green and Red Dragons choose to guard Atheon as friends.'
  }[kind];
  const secrets = SECRETS.filter(s => flag(s.flag)).length;
  openOverlay('ending', `<h1>Adventure Complete</h1><h2>${ENDINGS[kind]}</h2><p>${text}</p>
    <p>Score ${state.score} · Secrets ${secrets}/3 · Time ${Math.max(1, Math.round(state.playSeconds / 60))} min</p>
    <button data-close>Explore the epilogue</button><button data-new>New adventure</button>`);
  save();
}

// ---------- Overlays ----------
function openOverlay(type, html) {
  paused = true; overlayType = type; input.keys.clear();
  const o = $('overlay'); o.classList.remove('hidden');
  o.innerHTML = '<section class="dialog">' + html + '</section>';
  o.querySelectorAll('[data-close]').forEach(b => { b.onclick = closeOverlay; });
  o.querySelectorAll('[data-new]').forEach(b => { b.onclick = () => { if (type === 'title' || confirm('Start over? Your current adventure will be erased.')) { newGame(); closeOverlay(); } }; });
  o.querySelector('button:not([disabled])')?.focus();
}
function closeOverlay() { paused = false; overlayType = ''; $('overlay').classList.add('hidden'); $('overlay').innerHTML = ''; canvas.focus(); ac(); loadTracks(); }
const CONTROLS = `<ul class="controls"><li><b>WASD / arrows</b> move · <b>Shift</b> sprint</li><li><b>E</b> interact · <b>Q</b> drop</li>
  <li><b>J</b> sword · <b>Space</b> dodge</li><li><b>Drag</b> to look around · <b>Wheel</b> zoom</li><li><b>F</b> map · <b>H</b> help · <b>M</b> sound · <b>Esc</b> pause</li></ul>`;
function titleScreen() {
  const s = readSave();
  openOverlay('title', `<h1 class="title">The Three Dragons</h1>
    <p>Three dragons once guarded the kingdom of Atheon. Now they wear shadow collars, and the Dragon Crown that controls them is locked in the Shadow Castle.
    Explore, solve puzzles, outwit Karl the Kameleon, and decide the dragons’ fate: fight them, or win their trust.</p>
    ${CONTROLS}<p class="hint">On a phone or tablet, use the stick to move and the buttons to act. Drag the scene to look around.</p>
    ${s ? '<button data-continue>Continue adventure</button>' : ''}<button data-new>${s ? 'New adventure' : 'Start adventure'}</button>`);
  $('overlay').querySelector('[data-continue]')?.addEventListener('click', () => { loadGame(s); closeOverlay(); });
}
function helpScreen() {
  openOverlay('help', `<h1>How to play</h1><p><b>Goal:</b> ${currentObjective(state.flags)}</p>${CONTROLS}
    <p>You can carry <b>one</b> item at a time. Dragons notice you if they can see you (they look where they face) or hear you sprint.
    A <span style="color:#ffd54a">yellow</span> marker means a dragon noticed you; <span style="color:#ff6b5e">red</span> means it is about to strike, so dodge! Hide in tall grass.
    Karl the Kameleon is almost invisible and steals what you carry, taking it to his lookout. The Crystal of Truth reveals him, and a sword tap makes him drop things.</p>
    <p>Fighting is allowed, but each dragon can also be befriended, and friends unlock better endings.</p>
    <button data-close>Back to the adventure</button>`);
}
function mapScreen() {
  const here = roomAt(state.hero.x, state.hero.z);
  const cells = rooms.map(r => {
    const seen = state.visited.includes(r.id);
    return `<div class="${r.id === here ? 'here' : seen ? 'seen' : 'unknown'}">${seen ? r.name : '???'}</div>`;
  }).join('');
  openOverlay('map', `<h1>Map of Atheon</h1><div class="room-grid">${cells}</div><p>${currentObjective(state.flags)}</p><button data-close>Close map</button>`);
}
function pauseScreen() {
  openOverlay('pause', `<h1>Paused</h1><p>${currentObjective(state.flags)}</p><p>Score ${state.score} · Health ${state.hero.health}/3</p>
    <button data-close>Resume</button><button data-save>Save now</button><button data-new>New adventure</button>`);
  $('overlay').querySelector('[data-save]').onclick = () => { save(); closeOverlay(); msg('Progress saved in this browser.'); };
}

// ---------- Game setup ----------
function spawnCreatures() {
  for (const def of Object.values(DRAGONS)) {
    dragons[def.id] = newDragon(def, local(def.home, 2.5, 0));
    dragonModels[def.id] = makeDragon(kit, def);
  }
  karlModel = makeKarl(kit);
}
function karlRandomPoint() {
  for (let n = 0; n < 20; n++) {
    const id = KARL.rooms[Math.floor(Math.random() * KARL.rooms.length)];
    const p = local(id, (Math.random() - 0.5) * 12, (Math.random() - 0.5) * 12);
    if (!solids().some(b => p.x > b.minX - 1 && p.x < b.maxX + 1 && p.z > b.minZ - 1 && p.z < b.maxZ + 1)) return p;
  }
  return local(KARL.lair, 0, 0);
}
function resetCreatures(saved) {
  for (const def of Object.values(DRAGONS)) {
    const d = dragons[def.id], s = saved?.dragons?.[def.id];
    Object.assign(d, newDragon(def, d.home));
    if (s) { d.x = s.x; d.z = s.z; d.hp = s.hp ?? 3; }
    if (s?.defeated || flag(def.id.toUpperCase() + '_DEAD')) { d.state = 'defeated'; d.t = 10; }
    else if (friendly(def.id)) d.state = 'friendly';
    const m = dragonModels[def.id]; m.root.setEnabled(d.state !== 'defeated'); m.root.rotation.z = 0; m.root.position.y = 0;
  }
  const kp = saved?.karl || local(2, 3, 3);
  karl = { x: kp.x, z: kp.z, state: 'wander', t: 0, heading: 0, stolen: saved?.karl?.stolen || null, cooldown: 0 };
}
function newGame() {
  state = fresh(); solidsVersion++;
  resetCreatures(null); afterLoad();
  msg('Find the Sun Key somewhere in the Golden Garden. Walk up to things and press E.', 8);
}
function loadGame(s) {
  state = { ...fresh(), ...s }; solidsVersion++;
  resetCreatures(s); afterLoad();
  msg('Welcome back! ' + currentObjective(state.flags), 6);
}
function afterLoad() {
  for (const [, dm] of doorMeshes) { dm.open = 0; dm.opening = false; dm.meshes.forEach(m => { m.setEnabled(true); m.visibility = 1; m.position.y = m.metadata.y0; m.rotation.z = 0; }); }
  leverMeshes.forEach(l => { l.rotation.x = 0; }); state.levers = [];
  orbs.forEach(o => o.mesh.dispose()); orbs.length = 0; collapseT = 0;
  H.invuln = 0; H.attackT = -1; H.dodgeT = -1; lastRoom = -1;
  hero.position.set(state.hero.x, 0, state.hero.z);
  camera.target.set(state.hero.x, 1.6, state.hero.z);
  updateBeam(); syncItems(); syncDoors(1); renderHud(true);
}

// ---------- HUD ----------
let lastRoom = -1, hudT = 0;
function renderHud(force = false) {
  const room = roomAt(state.hero.x, state.hero.z);
  if (room !== lastRoom) {
    const first = lastRoom === -1; lastRoom = room; force = true;
    if (!state.visited.includes(room)) { state.visited.push(room); state.score += 5; }
    if (!first) msg(rooms[room].name, 2);
    if (room === 6 && setFlag('COLLAR')) msg('The Gold Dragon wears a glowing shadow collar. Someone is controlling the dragons!', 7);
    save();
  }
  hudT -= 1; if (!force && hudT > 0) return; hudT = 10;
  const held = state.held ? itemDef(state.held).label : 'nothing';
  const dragonIcons = Object.values(DRAGONS).map(def => {
    const d = dragons[def.id], st = d.state === 'defeated' ? 'defeated' : friendly(def.id) ? 'friend' : ['chase', 'alert', 'windup'].includes(d.state) ? 'hunting' : 'wild';
    return `<span class="dragon ${st}" style="--c:${def.color}" title="${def.name}: ${st}">${def.name.split(' ')[0]}</span>`;
  }).join('');
  const mini = rooms.map(r => `<span class="mini ${r.id === room ? 'here' : state.visited.includes(r.id) ? 'seen' : ''}"></span>`).join('');
  hud.innerHTML = `<div class="game-brand">THE THREE DRAGONS</div>
    <div class="hudline"><span class="hearts" aria-label="Health ${state.hero.health} of 3">${'♥'.repeat(Math.max(0, state.hero.health))}<i>${'♥'.repeat(Math.max(0, 3 - state.hero.health))}</i></span><span>${rooms[room].name}</span><span>✦ ${state.score}</span></div>
    <p class="objective">${currentObjective(state.flags)}</p>
    <p class="carrying">Carrying: <b>${held}</b>${heroHidden() ? ' · <span class="hidden-tag">Hidden</span>' : ''}</p>
    <div class="hudrow"><div class="minimap" aria-hidden="true">${mini}</div><div class="dragons">${dragonIcons}</div></div>`;
}

// ---------- Main loop ----------
let prompt = null;
function tick(dt) {
  if (paused) return;
  gameTime += dt; state.playSeconds += dt;
  const p = state.hero, K = input.keys;
  let f = 0, r = 0;
  if (K.has('KeyW') || K.has('ArrowUp')) f += 1;
  if (K.has('KeyS') || K.has('ArrowDown')) f -= 1;
  if (K.has('KeyD') || K.has('ArrowRight')) r += 1;
  if (K.has('KeyA') || K.has('ArrowLeft')) r -= 1;
  f -= input.stick.y; r += input.stick.x;
  // Camera-relative movement (Babylon is left-handed: right = (fwd.z, -fwd.x)).
  const fwd = { x: -Math.cos(camera.alpha), z: -Math.sin(camera.alpha) }, right = { x: fwd.z, z: -fwd.x };
  let dx = f * fwd.x + r * right.x, dz = f * fwd.z + r * right.z;
  const mag = Math.min(1, Math.hypot(dx, dz));
  H.moving = mag > 0.05; H.speed = sprinting() ? 7 : 4.6;
  if (H.moving) { const L = Math.hypot(dx, dz); dx /= L; dz /= L; H.face = Math.atan2(dx, dz); }
  let vx = H.moving ? dx * H.speed * mag : 0, vz = H.moving ? dz * H.speed * mag : 0;
  if (H.dodgeT >= 0) { const fw = heroForward(); vx = fw.x * 13; vz = fw.z * 13; H.dodgeT += dt / 0.28; if (H.dodgeT >= 1) H.dodgeT = -1; }
  H.dodgeCd = Math.max(0, H.dodgeCd - dt); H.invuln = Math.max(0, H.invuln - dt);
  if (H.attackT >= 0) { H.attackT += dt / 0.32; if (H.attackT >= 1) H.attackT = -1; }
  let np = moveCircle(p.x, p.z, vx * dt, vz * dt, HERO_R, solids());
  // Don't walk through living dragons.
  for (const d of Object.values(dragons)) {
    if (d.state === 'defeated') continue;
    const ddx = np.x - d.x, ddz = np.z - d.z, dd = Math.hypot(ddx, ddz), min = HERO_R + DRAGON_R;
    if (dd < min && dd > 0.001) np = moveCircle(np.x, np.z, ddx / dd * (min - dd), ddz / dd * (min - dd), HERO_R, solids());
  }
  p.x = np.x; p.z = np.z;
  hero.position.set(p.x, 0, p.z);
  const cur = hero.rotation.y, diff = Math.atan2(Math.sin(H.face - cur), Math.cos(H.face - cur));
  hero.rotation.y = cur + diff * Math.min(1, dt * 14);
  animateHero(heroParts, { moving: H.moving || H.dodgeT >= 0, speed: H.speed, time: gameTime, attack: H.attackT, dodge: H.dodgeT, carrying: !!state.held && !holding('sword') });
  const hidden = heroHidden();
  showMesh(heroParts.body, hidden ? 0.5 : H.invuln > 0 && Math.floor(gameTime * 12) % 2 ? 0.4 : 1);

  if (flag('SANCTUARY') && roomAt(p.x, p.z) === 1 && p.health < 3) { H.healT += dt; if (H.healT > 3) { H.healT = 0; p.health++; msg('The sanctuary heals you.', 1.5); renderHud(true); } }

  // Dragons
  const heroInfo = { x: p.x, z: p.z, hidden, sprinting: sprinting() && H.moving, invulnerable: H.invuln > 0 || H.dodgeT >= 0 };
  danger = 0;
  for (const def of Object.values(DRAGONS)) {
    const d = dragons[def.id], m = dragonModels[def.id];
    const enraged = def.id === 'red' && flag('CROWN') && !flag('ENDING') && !friendly('red');
    const res = stepDragon(d, def, { hero: heroInfo, los, nav, friendly: friendly(def.id), enraged }, dt);
    let mvx = res.vx, mvz = res.vz;
    if (d.knock) { mvx += d.knock.x; mvz += d.knock.z; d.knock.x *= 0.85; d.knock.z *= 0.85; if (Math.hypot(d.knock.x, d.knock.z) < 0.2) d.knock = null; }
    const nd = moveCircle(d.x, d.z, mvx * dt, mvz * dt, DRAGON_R, solids());
    d.moving = Math.hypot(nd.x - d.x, nd.z - d.z) > 0.01; d.x = nd.x; d.z = nd.z;
    for (const e of res.events) {
      if (e === 'alert') { sfx('alert'); if (!d.warned || gameTime - d.warned > 12) { msg('The ' + def.name + ' spotted you!', 2.5); d.warned = gameTime; } }
      if (e === 'hit') hurt('The ' + def.name);
      if ((e === 'hit' || e === 'miss') && def.id === 'green' && !flag('CRACK_OPEN')) {
        const cp = doorPoint(CRACK_DOOR);
        if (Math.hypot(d.x - cp.x, d.z - cp.z) < 5.5) { setFlag('CRACK_OPEN', 200); sfx('break'); shake = 0.6; openDoorAnim(CRACK_DOOR); msg('CRASH! The Green Dragon’s stomp brings down the cracked wall. A way into Frost Castle!', 7); }
      }
    }
    if (['chase', 'windup'].includes(d.state)) danger = 1;
    m.root.position.x = d.x; m.root.position.z = d.z;
    if (d.state !== 'defeated') {
      const c = m.root.rotation.y, df = Math.atan2(Math.sin(d.heading - c), Math.cos(d.heading - c));
      m.root.rotation.y = c + df * Math.min(1, dt * 8);
    }
    animateDragon(m, d, gameTime, kit);
  }

  // Karl
  const canSteal = !!state.held && !holding('crown') && roomAt(p.x, p.z) !== 1 && !hidden;
  const kres = stepKarl(karl, { hero: { ...heroInfo, hasCrystal: holding('crystal') }, canSteal, nav, randomPoint: karlRandomPoint, lairPoint: local(KARL.lair, -2, 1) }, dt);
  const nk = moveCircle(karl.x, karl.z, kres.vx * dt, kres.vz * dt, KARL_R, solids());
  karl.x = nk.x; karl.z = nk.z;
  for (const e of kres.events) {
    if (e === 'steal' && state.held) {
      const lbl = itemDef(state.held).label; karl.stolen = state.held; state.items[state.held] = { owner: 'karl' }; state.held = null;
      sfx('steal'); msg('Something snatched your ' + lbl + '! Karl the Kameleon is running to his lookout!', 6); save();
    }
    if (e === 'stash' && karl.stolen) { state.items[karl.stolen] = { owner: 'world', ...local(KARL.lair, -2 + Math.random() * 3, 1 + Math.random() * 2) }; karl.stolen = null; save(); }
  }
  karlModel.root.position.set(karl.x, 0, karl.z); karlModel.root.rotation.y = karl.heading || 0;
  const kDist = Math.hypot(karl.x - p.x, karl.z - p.z);
  animateKarl(karlModel, karl, gameTime, holding('crystal') || karl.state === 'stunned' ? 1 : kDist < 2.5 ? 0.55 : karl.state === 'flee' ? 0.35 : 0.13);

  updateBoss(dt); updateEscape(dt); syncDoors(dt); syncItems();
  sealMeshes.SEAL1.setEnabled(!flag('SEAL1')); sealMeshes.SEAL2.setEnabled(!flag('SEAL2'));
  Object.values(sealMeshes).forEach(s => { s.rotation.y = gameTime * 1.5; s.rotation.x = Math.sin(gameTime) * 0.3; });
  if (forgeFire) forgeFire.material = kit.mat(flag('FORGE') ? '#FF7A2E' : '#3A2A2A', flag('FORGE') ? 1 : 0);

  prompt = interactions();
  promptEl.innerHTML = prompt ? '<kbd>E</kbd> ' + prompt.label : '';
  promptEl.classList.toggle('show', !!prompt);
  $('interact').classList.toggle('ready', !!prompt);

  // Camera follows smoothly; the sun follows the hero for crisp nearby shadows.
  const tx = p.x + (shake > 0 ? (Math.random() - 0.5) * shake : 0), tz = p.z + (shake > 0 ? (Math.random() - 0.5) * shake : 0);
  shake = Math.max(0, shake - dt);
  camera.target.x += (tx - camera.target.x) * Math.min(1, dt * 10);
  camera.target.z += (tz - camera.target.z) * Math.min(1, dt * 10);
  camera.target.y = 1.6;
  sun.position.set(p.x + 15, 30, p.z - 10);
  if (gameTime > msgUntil) notice.style.opacity = '0';
  renderHud();
  if (Math.floor(state.playSeconds / 15) !== Math.floor((state.playSeconds - dt) / 15)) save();
}

// Fade anything that stands between the camera and the hero.
let faded = new Set();
function updateOcclusion() {
  const target = hero.position.add(new Vector3(0, 1.4, 0)), origin = camera.position;
  const dir = target.subtract(origin), len = dir.length();
  const hits = scene.multiPickWithRay(new Ray(origin, dir.normalize(), len - 0.6), m => !!m.metadata?.occluder) || [];
  const now = new Set(hits.map(h => h.pickedMesh));
  for (const m of faded) if (!now.has(m)) m.visibility = 1;
  for (const m of now) m.visibility = 0.25;
  faded = now;
}

// ---------- Input ----------
function bindInput() {
  window.addEventListener('keydown', e => {
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code) && !overlayType) e.preventDefault();
    if (e.code === 'Escape') { if (overlayType && overlayType !== 'title') closeOverlay(); else if (!overlayType) pauseScreen(); return; }
    if (overlayType) return;
    if (e.repeat && !['KeyW', 'KeyA', 'KeyS', 'KeyD', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ShiftLeft', 'ShiftRight'].includes(e.code)) return;
    switch (e.code) {
      case 'KeyE': case 'Enter': doInteract(); break;
      case 'KeyJ': case 'KeyK': tryAttack(); break;
      case 'Space': tryDodge(); break;
      case 'KeyQ': drop(); break;
      case 'KeyF': mapScreen(); break;
      case 'KeyH': helpScreen(); break;
      case 'KeyM': muted = !muted; msg(muted ? 'Sound off' : 'Sound on', 1.5); break;
      default: input.keys.add(e.code);
    }
  });
  window.addEventListener('keyup', e => input.keys.delete(e.code));
  window.addEventListener('blur', () => { input.keys.clear(); if (!overlayType) pauseScreen(); });
  document.addEventListener('visibilitychange', () => { if (document.hidden) { input.keys.clear(); if (!overlayType) pauseScreen(); } });
  const btn = (id, fn) => $(id).addEventListener('click', () => { if (!overlayType) fn(); });
  btn('interact', doInteract); btn('attack', tryAttack); btn('dodge', tryDodge); btn('drop', drop); btn('map', mapScreen); btn('help', helpScreen);
  const stick = $('stick'), dot = stick.querySelector('.stick-dot');
  let origin = null;
  const end = () => { origin = null; input.stick.x = input.stick.y = 0; dot.style.transform = ''; };
  const move = e => {
    if (!origin) return;
    let x = (e.clientX - origin.x) / 45, y = (e.clientY - origin.y) / 45; const L = Math.hypot(x, y);
    if (L > 1) { x /= L; y /= L; }
    input.stick.x = Math.abs(x) < 0.12 ? 0 : x; input.stick.y = Math.abs(y) < 0.12 ? 0 : y;
    dot.style.transform = `translate(${x * 30}px, ${y * 30}px)`;
  };
  stick.addEventListener('pointerdown', e => { const r = stick.getBoundingClientRect(); origin = { x: r.left + r.width / 2, y: r.top + r.height / 2 }; stick.setPointerCapture(e.pointerId); move(e); });
  stick.addEventListener('pointermove', move);
  stick.addEventListener('pointerup', end); stick.addEventListener('pointercancel', end);
}
function doInteract() {
  const it = interactions();
  if (!it) { msg('Nothing to use here. Walk up to objects, doors and creatures.', 2); return; }
  it.fn(); renderHud(true); save();
}

// Lower the render resolution (then turn off glow) when the device can't keep ~30 fps.
function adaptQuality(dt) {
  if (paused) return;
  quality.frames++; quality.time += dt;
  if (quality.time < 4) return;
  const fps = quality.frames / quality.time; quality.frames = 0; quality.time = 0;
  if (fps < 28 && quality.level < 4) {
    quality.level++;
    if (quality.level === 3) glow.isEnabled = false;
    else engine.setHardwareScalingLevel(quality.base * (1 + quality.level * 0.35));
  }
}

// ---------- Boot ----------
function boot() {
  if (!canvas || !Engine.isSupported()) { msg('3D graphics (WebGL) are not available in this browser. Try an up-to-date Chrome, Edge, Safari or Firefox.', 9999); return; }
  setupScene(); buildWorld();
  heroParts = makeHero(kit); hero = heroParts.root;
  buildItems(); spawnCreatures(); resetCreatures(null);
  bindInput(); afterLoad();
  window.addEventListener('resize', () => engine.resize());
  window.addEventListener('beforeunload', save);
  canvas.addEventListener('contextmenu', e => e.preventDefault());
  let last = performance.now(), occlT = 0;
  engine.runRenderLoop(() => {
    const now = performance.now(), raw = (now - last) / 1000, dt = Math.min(0.05, raw); last = now;
    tick(dt); adaptQuality(raw); music(dt);
    occlT -= dt; if (occlT <= 0) { occlT = 0.1; updateOcclusion(); }
    scene.render();
  });
  titleScreen();
  // Small hook for automated browser tests and debugging.
  window.__td = {
    get state() { return state; }, dragons, get karl() { return karl; }, setFlag, flag,
    prompt: () => interactions()?.label || null, interact: doInteract, attack: tryAttack,
    teleport(room, lx = 0, lz = 0) { const q = local(room, lx, lz); state.hero.x = q.x; state.hero.z = q.z; hero.position.set(q.x, 0, q.z); camera.target.set(q.x, 1.6, q.z); },
    give(id) { if (state.held) delete state.items[state.held]; state.held = id; state.items[id] = { owner: 'hero' }; },
    room: () => roomAt(state.hero.x, state.hero.z), fps: () => engine.getFps(), scene: () => scene, glow: () => glow, shadows: () => shadows
  };
}
boot();
