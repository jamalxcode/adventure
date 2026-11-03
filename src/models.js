// Original procedural characters in a comic-strip style: big round heads, small bodies,
// dot eyes, simple line mouths, flat colours and dark outlines.
import { MeshBuilder, TransformNode, Color3, StandardMaterial, Vector3 } from '@babylonjs/core';

const INK = Color3.FromHexString('#2B2320');

export function makeKit(scene, shadows) {
  const cache = {};
  // Flat, matte materials: no shiny highlights, so colours read like a printed comic.
  const mat = (hex, glow = 0, alpha = 1) => {
    const id = hex + glow + alpha;
    if (cache[id]) return cache[id];
    const m = new StandardMaterial('m' + id, scene);
    const c = Color3.FromHexString(hex);
    m.diffuseColor = c;
    m.specularColor = new Color3(0.02, 0.02, 0.02);
    if (glow) m.emissiveColor = c.scale(glow);
    if (alpha < 1) m.alpha = alpha;
    return (cache[id] = m);
  };
  const finish = (m, parent, hex, cast = true, glow = 0) => {
    if (parent) m.parent = parent;
    m.material = typeof hex === 'string' ? mat(hex, glow) : hex;
    m.receiveShadows = true;
    if (cast && shadows) shadows.addShadowCaster(m);
    return m;
  };
  const node = (name, parent, x = 0, y = 0, z = 0) => {
    const n = new TransformNode(name, scene); if (parent) n.parent = parent; n.position.set(x, y, z); return n;
  };
  const box = (name, w, h, d, parent, x, y, z, hex, opt = {}) => {
    const m = MeshBuilder.CreateBox(name, { width: w, height: h, depth: d }, scene);
    m.position.set(x, y, z); return finish(m, parent, hex, opt.cast !== false, opt.glow);
  };
  const ball = (name, dia, parent, x, y, z, hex, opt = {}) => {
    const m = MeshBuilder.CreateSphere(name, { diameter: dia, segments: opt.seg || 14 }, scene);
    m.position.set(x, y, z); if (opt.scale) m.scaling.set(...opt.scale);
    return finish(m, parent, hex, opt.cast !== false, opt.glow);
  };
  const cyl = (name, top, bottom, h, parent, x, y, z, hex, opt = {}) => {
    const m = MeshBuilder.CreateCylinder(name, { diameterTop: top, diameterBottom: bottom, height: h, tessellation: opt.tess || 16 }, scene);
    m.position.set(x, y, z); return finish(m, parent, hex, opt.cast !== false, opt.glow);
  };
  const capsule = (name, r, h, parent, x, y, z, hex, opt = {}) => {
    const m = MeshBuilder.CreateCapsule(name, { radius: r, height: h, tessellation: 12, subdivisions: 2 }, scene);
    m.position.set(x, y, z); return finish(m, parent, hex, opt.cast !== false, opt.glow);
  };
  // A curved ink line (mouths, brows). `bend` > 0 curves up at the ends (smile), < 0 is a frown.
  const line = (name, width, bend, parent, x, y, z, thick = 0.035) => {
    const pts = [];
    for (let i = 0; i <= 10; i++) { const t = i / 10 - 0.5; pts.push(new Vector3(t * width, bend * (t * t * 4 - 1) * 0.5, 0)); }
    const m = MeshBuilder.CreateTube(name, { path: pts, radius: thick, tessellation: 6, cap: 2 }, scene);
    m.position.set(x, y, z); return finish(m, parent, '#2B2320', false);
  };
  // Comic outline on every mesh under a character.
  const ink = (root, width = 0.035) => {
    root.getChildMeshes().forEach(m => {
      m.outlineColor = INK; m.outlineWidth = width;
      m.renderOutline = !(m.name.startsWith('ink-') || m.name === 'marker' || m.name === 'shield');
    });
  };
  return { scene, mat, node, box, ball, cyl, capsule, line, ink };
}

// The hero: a round-headed kid adventurer in a blue shirt with a red scarf.
export function makeHero(k) {
  const root = k.node('hero');
  const body = k.node('hero-body', root);
  const skin = '#F7D2AE', shirt = '#3E7FD6', shorts = '#404062', shoe = '#6B4630', hair = '#5A3A26';
  k.ball('torso', 1.0, body, 0, 1.0, 0, shirt, { scale: [1, 0.95, 0.85] });
  k.cyl('collar', 0.55, 0.62, 0.12, body, 0, 1.43, 0, '#FFFFFF');
  k.box('shirt-band', 0.98, 0.1, 0.86, body, 0, 0.92, 0, '#2C62AD', { cast: false });
  k.ball('shorts', 0.86, body, 0, 0.64, 0, shorts, { scale: [1, 0.55, 0.85] });
  const cape = k.box('scarf', 0.55, 0.45, 0.07, body, 0.12, 1.3, -0.4, '#D9473F');
  cape.rotation.z = 0.15;
  const head = k.node('head', body, 0, 2.05, 0);
  k.ball('face', 1.5, head, 0, 0, 0, skin, { seg: 20 });
  for (const s of [-1, 1]) {
    k.ball('ear', 0.3, head, s * 0.74, -0.02, 0, skin);
    k.ball('ink-eye', 0.16, head, s * 0.22, 0.1, 0.74, '#2B2320', { cast: false, scale: [1, 1.45, 0.6] });
    const brow = k.line('ink-brow', 0.2, 0.08, head, s * 0.23, 0.33, 0.68, 0.022); brow.rotation.z = -s * 0.12;
    k.ball('cheek', 0.16, head, s * 0.42, -0.18, 0.62, '#F2A08F', { cast: false, scale: [1, 0.6, 0.4] });
  }
  k.ball('nose', 0.17, head, 0, -0.06, 0.76, skin);
  k.ball('hair-cap', 1.56, head, 0, 0.16, -0.14, hair, { seg: 20, scale: [1, 0.9, 0.92] });
  // A few curls of hair on top: simple and our own.
  for (const [x, y, z, d] of [[0, 0.74, 0.08, 0.24], [-0.17, 0.7, 0.02, 0.2], [0.16, 0.71, -0.02, 0.2], [0.05, 0.68, -0.25, 0.2]])
    k.ball('hair', d, head, x, y, z, hair);
  const smile = k.line('ink-smile', 0.36, 0.12, head, 0, -0.3, 0.69);
  const oh = k.ball('ink-oh', 0.16, head, 0, -0.3, 0.7, '#2B2320', { cast: false, scale: [1, 1.2, 0.4] });
  oh.setEnabled(false);
  const parts = { root, body, head, cape, smile, oh };
  for (const [side, s] of [['L', -1], ['R', 1]]) {
    const sh = k.node('shoulder' + side, body, s * 0.5, 1.22, 0);
    k.capsule('arm', 0.11, 0.5, sh, 0, -0.2, 0, shirt);
    k.ball('hand', 0.22, sh, 0, -0.45, 0, skin);
    const hip = k.node('hip' + side, body, s * 0.2, 0.55, 0);
    k.capsule('leg', 0.11, 0.42, hip, 0, -0.18, 0, skin);
    k.cyl('sock', 0.22, 0.22, 0.1, hip, 0, -0.33, 0, '#FFFFFF');
    k.ball('shoe', 0.32, hip, 0, -0.44, 0.06, shoe, { scale: [1, 0.55, 1.35] });
    parts['arm' + side] = sh; parts['leg' + side] = hip;
  }
  parts.hand = k.node('carry', parts.armR, 0, -0.5, 0.22);
  parts.sword = k.node('sword-slot', parts.armR, 0, -0.48, 0.1);
  k.ink(root);
  return parts;
}

export function animateHero(p, s) {
  // s: { moving, speed, time, attack (0..1 or -1), dodge (0..1 or -1), carrying, hurt }
  const fast = s.speed > 5;
  const swing = s.moving ? Math.sin(s.time * (fast ? 16 : 12)) * (fast ? 0.95 : 0.7) : 0;
  p.legL.rotation.x = swing; p.legR.rotation.x = -swing;
  p.armL.rotation.x = -swing * 0.9;
  p.armR.rotation.x = s.carrying ? -1.0 : swing * 0.9;
  p.body.position.y = s.moving ? Math.abs(Math.sin(s.time * 12)) * 0.1 : Math.sin(s.time * 2) * 0.02;
  p.head.rotation.z = s.moving ? Math.sin(s.time * 6) * 0.05 : Math.sin(s.time * 1.3) * 0.03;
  p.cape.rotation.x = -0.1 - (s.moving ? 0.35 + Math.abs(swing) * 0.2 : 0);
  p.smile.setEnabled(!s.hurt); p.oh.setEnabled(!!s.hurt);
  if (s.attack >= 0) {
    const a = s.attack;
    p.armR.rotation.x = a < 0.35 ? -2.7 * (a / 0.35) : -2.7 + 3.5 * ((a - 0.35) / 0.65);
    p.body.rotation.y = Math.sin(a * Math.PI) * 0.5;
  } else p.body.rotation.y = 0;
  if (s.dodge >= 0) { p.body.rotation.x = s.dodge * Math.PI * 2; p.body.position.y = 0.3 * Math.sin(s.dodge * Math.PI); }
  else p.body.rotation.x = 0;
}

// Dragons: chubby, big-headed and expressive. Brows and mouth show their mood.
export function makeDragon(k, def) {
  const root = k.node(def.id + '-dragon');
  const body = k.node('dbody', root);
  const c = def.color, belly = def.belly;
  k.ball('torso', 2.3, body, 0, 1.35, -0.1, c, { scale: [1, 0.95, 1.15] });
  k.ball('belly', 1.7, body, 0, 1.2, 0.45, belly, { scale: [0.9, 0.85, 0.7] });
  for (let i = 0; i < 3; i++) k.ball('spike', 0.38, body, 0, 2.45 - i * 0.12, -0.3 - i * 0.55, belly, { scale: [0.5, 1, 1] });
  const neck = k.node('neck', body, 0, 2.0, 0.7);
  k.ball('neckm', 0.95, neck, 0, 0.2, 0.05, c);
  const head = k.node('dhead', neck, 0, 0.95, 0.35);
  k.ball('skull', 1.9, head, 0, 0, 0, c, { seg: 18 });
  k.ball('snout', 1.15, head, 0, -0.28, 0.72, c, { scale: [0.95, 0.68, 1.05] });
  k.ball('chin', 0.9, head, 0, -0.5, 0.55, belly, { scale: [1, 0.5, 1] });
  const brows = [];
  for (const s of [-1, 1]) {
    k.ball('ink-nostril', 0.09, head, s * 0.16, -0.06, 1.28, '#2B2320', { cast: false, scale: [1, 0.6, 0.6] });
    k.ball('ink-eye', 0.17, head, s * 0.36, 0.25, 0.85, '#2B2320', { cast: false, scale: [1, 1.5, 0.5] });
    const brow = k.line('ink-brow', 0.3, 0, head, s * 0.37, 0.52, 0.8, 0.03);
    brows.push({ m: brow, s });
    const horn = k.cyl('horn', 0.12, 0.3, 0.55, head, s * 0.45, 0.85, -0.15, '#F7EBC4', { tess: 8 });
    horn.rotation.z = -s * 0.35; horn.rotation.x = -0.3;
    k.ball('horn-tip', 0.16, horn, 0, 0.28, 0, '#F7EBC4');
  }
  const frown = k.line('ink-mouth', 0.5, -0.12, head, 0, -0.45, 1.15);
  const grin = k.line('ink-mouth', 0.55, 0.16, head, 0, -0.43, 1.15);
  grin.setEnabled(false);
  const wings = [];
  for (const s of [-1, 1]) {
    const w = k.node('wing', body, s * 0.7, 1.95, -0.45);
    k.ball('membrane', 1.5, w, s * 0.7, 0.45, 0, belly, { scale: [1.0, 0.85, 0.12] });
    for (let i = 0; i < 3; i++) k.ball('wing-scallop', 0.55, w, s * (0.25 + i * 0.5), 0.0 - (i === 1 ? 0.1 : 0), 0, belly, { scale: [1, 0.7, 0.12] });
    k.capsule('wing-bone', 0.07, 1.5, w, s * 0.75, 0.95, 0, c).rotation.z = s * Math.PI / 2.4;
    wings.push({ w, s });
  }
  const legs = [];
  for (const [x, z] of [[-0.65, 0.55], [0.65, 0.55], [-0.65, -0.65], [0.65, -0.65]]) {
    const hip = k.node('dleg', body, x, 0.75, z);
    k.capsule('thigh', 0.28, 0.75, hip, 0, -0.3, 0, c);
    k.ball('foot', 0.55, hip, 0, -0.62, 0.12, belly, { scale: [1, 0.55, 1.25] });
    legs.push(hip);
  }
  const tail = [];
  let parent = body;
  for (let n = 0; n < 4; n++) {
    const seg = k.node('tail', parent, 0, n === 0 ? 1.1 : -0.04, n === 0 ? -1.35 : -0.55);
    k.ball('tailseg', 0.75 - n * 0.13, seg, 0, 0, 0, c);
    tail.push(seg); parent = seg;
  }
  k.ball('tailtip', 0.5, parent, 0, 0.05, -0.35, belly, { scale: [0.4, 1, 1.2] });
  k.ink(root, 0.05);
  const marker = k.cyl('marker', 0.6, 0, 0.8, root, 0, 5.0, 0, '#FFD54A', { glow: 0.8, cast: false, tess: 8 });
  marker.isPickable = false;
  return { root, body, neck, head, brows, frown, grin, wings, legs, tail, marker, def };
}

export function animateDragon(m, d, time, k) {
  const st = d.state, chasing = st === 'chase';
  m.wings.forEach(({ w, s }) => { w.rotation.y = -s * (0.5 + Math.sin(time * (chasing ? 9 : 3)) * (chasing ? 0.45 : 0.15)); w.rotation.z = s * 0.15; });
  const walking = ['chase', 'return', 'friendly', 'idle'].includes(st) && d.moving;
  m.legs.forEach((leg, i) => { leg.rotation.x = walking ? Math.sin(time * 10 + (i % 2 ? Math.PI : 0) + (i > 1 ? Math.PI : 0)) * 0.55 : 0; });
  m.tail.forEach((seg, i) => { seg.rotation.y = Math.sin(time * (st === 'friendly' ? 6 : 3) - i * 0.7) * (st === 'friendly' ? 0.4 : 0.25); });
  const wind = st === 'windup' ? Math.min(1, d.t / 0.7) : 0;
  m.neck.rotation.x = st === 'windup' ? -0.6 * wind : st === 'recover' ? 0.4 : 0;
  m.body.position.y = chasing ? Math.abs(Math.sin(time * 10)) * 0.18 : 0;
  m.body.rotation.z = st === 'stunned' ? Math.sin(time * 18) * 0.12 : 0;
  // Expressions: angry brows and a frown when hostile, raised brows and a grin when friendly.
  const happy = st === 'friendly', angry = ['alert', 'chase', 'windup'].includes(st);
  m.brows.forEach(({ m: b, s }) => { b.rotation.z = happy ? s * 0.2 : angry ? -s * 0.45 : -s * 0.15; b.position.y = happy ? 0.6 : 0.5; });
  m.frown.setEnabled(!happy); m.grin.setEnabled(happy);
  m.head.rotation.z = happy ? Math.sin(time * 2) * 0.1 : st === 'stunned' ? Math.sin(time * 10) * 0.2 : 0;
  const mk = m.marker;
  mk.setEnabled(['alert', 'windup', 'friendly', 'stunned', 'chase'].includes(st));
  mk.material = k.mat(st === 'windup' ? '#FF3B30' : happy ? '#5BE37D' : st === 'stunned' ? '#B9C6FF' : '#FFD54A', 0.9);
  mk.position.y = 5.0 + Math.sin(time * 5) * 0.15;
  const sc = st === 'windup' ? 1 + wind * 0.5 : 1;
  mk.scaling.set(sc, sc, sc);
  if (st === 'defeated') {
    m.root.rotation.z = Math.min(Math.PI / 2, d.t * 2);
    m.root.position.y = -Math.max(0, d.t - 1) * 0.8;
    if (d.t > 3) m.root.setEnabled(false);
  }
}

// Karl the Kameleon: a round, sneaky chameleon with a curly tail and goggly eyes.
export function makeKarl(k) {
  const root = k.node('karl');
  const body = k.node('kbody', root);
  const skin = k.mat('#6CC24A');
  const parts = [];
  const add = m => { m.material = skin; parts.push(m); return m; };
  add(k.ball('kb', 1.15, body, 0, 0.75, 0, '#6CC24A', { scale: [0.85, 0.85, 1.3] }));
  add(k.ball('khead', 0.95, body, 0, 1.05, 0.8, '#6CC24A'));
  add(k.cyl('kcrest', 0, 0.5, 0.45, body, 0, 1.55, 0.7, '#6CC24A', { tess: 4 }));
  const tail = MeshBuilder.CreateTorus('ktail', { diameter: 0.7, thickness: 0.2, tessellation: 16 }, k.scene);
  tail.parent = body; tail.position.set(0, 0.55, -0.9); tail.rotation.y = Math.PI / 2; add(tail);
  const eyes = [];
  for (const s of [-1, 1]) {
    add(k.ball('keye', 0.42, body, s * 0.36, 1.2, 0.95, '#6CC24A'));
    const pupil = k.ball('ink-kpupil', 0.15, body, s * 0.5, 1.22, 1.06, '#2B2320', { cast: false });
    parts.push(pupil); eyes.push(pupil);
    for (const z of [-0.35, 0.4]) add(k.capsule('kleg', 0.08, 0.5, body, s * 0.38, 0.25, z, '#6CC24A'));
  }
  const grin = k.line('ink-kgrin', 0.4, 0.1, body, 0, 0.88, 1.22, 0.025); parts.push(grin);
  k.ink(root, 0.03);
  return { root, body, parts, skin, eyes };
}

export function animateKarl(m, karl, time, visibility) {
  const ink = visibility > 0.5 && m.root.position.subtract(m.root.getScene().activeCamera.target).length() < 25;
  m.parts.forEach(p => { p.visibility = visibility; p.renderOutline = ink && !p.name.startsWith('ink-'); });
  m.skin.diffuseColor = Color3.FromHSV(80 + Math.sin(time * 0.7) * 60, 0.6, 0.78);
  m.eyes.forEach((e, i) => { e.position.z = 1.04 + Math.sin(time * 3 + i * 2) * 0.05; e.position.y = 1.22 + Math.cos(time * 2.3 + i) * 0.04; });
  m.body.position.y = karl.state === 'flee' || karl.state === 'stalk' ? Math.abs(Math.sin(time * 14)) * 0.12 : 0;
  m.body.rotation.z = karl.state === 'stunned' ? Math.sin(time * 20) * 0.2 : 0;
}

// The Shadow Sorcerer: a round, hooded grump with glowing eyes and a staff.
export function makeSorcerer(k) {
  const root = k.node('sorcerer');
  const body = k.node('sbody', root);
  k.cyl('robe', 0.9, 2.1, 2.2, body, 0, 1.3, 0, '#3B2A55');
  k.cyl('robe-trim', 2.15, 2.15, 0.16, body, 0, 0.25, 0, '#9C6BD6', { glow: 0.3 });
  k.ball('hood', 1.7, body, 0, 2.95, 0, '#2A1D3E', { seg: 18 });
  k.ball('face', 1.2, body, 0, 2.85, 0.32, '#1A1226', { cast: false });
  k.cyl('hood-tip', 0, 0.7, 0.9, body, 0, 3.95, -0.15, '#2A1D3E').rotation.x = -0.4;
  for (const s of [-1, 1]) {
    k.ball('ink-seye', 0.18, body, s * 0.22, 2.95, 0.88, '#C77DFF', { glow: 1, cast: false, scale: [1, 0.6, 0.5] });
    k.ball('hand', 0.32, body, s * 0.95, 1.6, 0.35, '#B7A6D9');
  }
  const staff = k.node('staff', body, 1.0, 1.7, 0.4);
  k.cyl('pole', 0.13, 0.13, 3.0, staff, 0, 0, 0, '#6B4630');
  const orb = k.ball('staff-orb', 0.55, staff, 0, 1.7, 0, '#C77DFF', { glow: 1 });
  k.ink(root, 0.04);
  const shield = k.ball('shield', 5, root, 0, 2, 0, '#8E6BFF', { cast: false, seg: 18 });
  shield.material = k.mat('#8E6BFF', 0.6, 0.25); shield.isPickable = false;
  return { root, body, staff, orb, shield };
}
