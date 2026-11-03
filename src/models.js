// Original procedural character models with jointed parts for simple animation.
import { MeshBuilder, TransformNode, Color3, StandardMaterial } from '@babylonjs/core';

export function makeKit(scene, shadows) {
  const cache = {};
  const mat = (hex, glow = 0, alpha = 1) => {
    const id = hex + glow + alpha;
    if (cache[id]) return cache[id];
    const m = new StandardMaterial('m' + id, scene);
    m.diffuseColor = Color3.FromHexString(hex);
    m.specularColor = new Color3(0.12, 0.12, 0.12);
    if (glow) m.emissiveColor = Color3.FromHexString(hex).scale(glow);
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
    const m = MeshBuilder.CreateSphere(name, { diameter: dia, segments: opt.seg || 12 }, scene);
    m.position.set(x, y, z); if (opt.scale) m.scaling.set(...opt.scale);
    return finish(m, parent, hex, opt.cast !== false, opt.glow);
  };
  const cyl = (name, top, bottom, h, parent, x, y, z, hex, opt = {}) => {
    const m = MeshBuilder.CreateCylinder(name, { diameterTop: top, diameterBottom: bottom, height: h, tessellation: opt.tess || 14 }, scene);
    m.position.set(x, y, z); return finish(m, parent, hex, opt.cast !== false, opt.glow);
  };
  const capsule = (name, r, h, parent, x, y, z, hex, opt = {}) => {
    const m = MeshBuilder.CreateCapsule(name, { radius: r, height: h, tessellation: 12, subdivisions: 2 }, scene);
    m.position.set(x, y, z); return finish(m, parent, hex, opt.cast !== false, opt.glow);
  };
  return { scene, mat, node, box, ball, cyl, capsule };
}

// The hero: blocky-rounded adventurer with a tunic, cape and a hand anchor for carried items.
export function makeHero(k) {
  const root = k.node('hero');
  const body = k.node('hero-body', root);
  const skin = '#F0C29A', tunic = '#2F7FC1', trim = '#F3D267', pants = '#2E3550', boots = '#5B3A29';
  k.capsule('torso', 0.45, 1.25, body, 0, 1.55, 0, tunic);
  k.box('belt', 0.95, 0.16, 0.62, body, 0, 1.2, 0, '#6B4A2D');
  k.box('buckle', 0.22, 0.18, 0.05, body, 0, 1.2, 0.32, trim, { glow: 0.2 });
  const cape = k.box('cape', 0.9, 1.2, 0.08, body, 0, 1.6, -0.38, '#B53A3A');
  const head = k.node('head', body, 0, 2.55, 0);
  k.box('face', 0.86, 0.82, 0.8, head, 0, 0, 0, skin);
  k.box('hair', 0.92, 0.28, 0.86, head, 0, 0.45, -0.02, '#4A2E22');
  k.box('fringe', 0.92, 0.18, 0.2, head, 0, 0.3, 0.36, '#4A2E22');
  for (const s of [-1, 1]) {
    k.box('eye', 0.12, 0.16, 0.04, head, s * 0.18, 0.04, 0.41, '#1D1D28', { cast: false });
    k.box('cheek', 0.12, 0.06, 0.03, head, s * 0.27, -0.14, 0.41, '#E8968A', { cast: false });
  }
  k.box('smile', 0.22, 0.05, 0.03, head, 0, -0.2, 0.41, '#7A3B32', { cast: false });
  const parts = { root, body, head, cape };
  for (const [side, s] of [['L', -1], ['R', 1]]) {
    const sh = k.node('shoulder' + side, body, s * 0.62, 2.0, 0);
    k.capsule('arm', 0.16, 0.95, sh, 0, -0.42, 0, tunic);
    k.ball('hand', 0.3, sh, 0, -0.92, 0, skin);
    const hip = k.node('hip' + side, body, s * 0.25, 1.05, 0);
    k.capsule('leg', 0.19, 0.9, hip, 0, -0.42, 0, pants);
    k.box('boot', 0.34, 0.24, 0.48, hip, 0, -0.88, 0.06, boots);
    parts['arm' + side] = sh; parts['leg' + side] = hip;
  }
  parts.hand = k.node('carry', parts.armR, 0, -1.05, 0.25);
  parts.sword = k.node('sword-slot', parts.armR, 0, -1.0, 0.1);
  return parts;
}

export function animateHero(p, s) {
  // s: { moving, speed, time, attack (0..1 or -1), dodge (0..1 or -1), carrying, hidden }
  const swing = s.moving ? Math.sin(s.time * (s.speed > 5 ? 15 : 11)) * (s.speed > 5 ? 0.9 : 0.65) : 0;
  p.legL.rotation.x = swing; p.legR.rotation.x = -swing;
  p.armL.rotation.x = -swing * 0.8;
  p.armR.rotation.x = s.carrying ? -0.9 : swing * 0.8;
  p.body.position.y = s.moving ? Math.abs(Math.sin(s.time * 11)) * 0.08 : Math.sin(s.time * 2) * 0.02;
  p.cape.rotation.x = -0.15 - (s.moving ? 0.25 + Math.abs(swing) * 0.2 : 0);
  if (s.attack >= 0) {
    const a = s.attack;
    p.armR.rotation.x = a < 0.35 ? -2.6 * (a / 0.35) : -2.6 + 3.4 * ((a - 0.35) / 0.65);
    p.body.rotation.y = Math.sin(a * Math.PI) * 0.5;
  } else p.body.rotation.y = 0;
  if (s.dodge >= 0) { p.body.rotation.x = s.dodge * Math.PI * 2; p.body.position.y = 0.3 * Math.sin(s.dodge * Math.PI); }
  else p.body.rotation.x = 0;
}

// Dragons: chunky, friendly-looking silhouettes with flapping wings and a segmented tail.
export function makeDragon(k, def) {
  const root = k.node(def.id + '-dragon');
  const body = k.node('dbody', root);
  const c = def.color, belly = def.belly, horn = '#F4EBC6';
  k.ball('torso', 2.4, body, 0, 1.5, 0, c, { scale: [1, 0.9, 1.35] });
  k.ball('belly', 1.9, body, 0, 1.2, 0.35, belly, { scale: [0.9, 0.75, 1.1] });
  const neck = k.node('neck', body, 0, 2.1, 1.1);
  k.cyl('neckm', 0.75, 0.95, 1.2, neck, 0, 0.4, 0.2, c);
  const head = k.node('dhead', neck, 0, 1.15, 0.45);
  k.ball('skull', 1.35, head, 0, 0, 0, c, { scale: [1, 0.9, 1.05] });
  k.box('snout', 0.9, 0.55, 0.85, head, 0, -0.15, 0.7, c);
  for (const s of [-1, 1]) {
    k.ball('nostril', 0.12, head, s * 0.2, 0, 1.12, '#3A2A22', { cast: false });
    k.ball('eyewhite', 0.42, head, s * 0.38, 0.2, 0.42, '#FFFFFF', { cast: false });
    k.ball('pupil', 0.2, head, s * 0.42, 0.22, 0.6, '#1A1A22', { cast: false });
    const hn = k.cyl('horn', 0, 0.28, 0.8, head, s * 0.32, 0.7, -0.2, horn, { tess: 6 });
    hn.rotation.x = -0.5; hn.rotation.z = -s * 0.25;
  }
  const brow = k.box('brow', 1.0, 0.12, 0.2, head, 0, 0.45, 0.48, c);
  const wings = [];
  for (const s of [-1, 1]) {
    const w = k.node('wing', body, s * 0.85, 2.2, -0.1);
    const membrane = k.box('membrane', 2.4, 0.08, 1.6, w, s * 1.2, 0, 0, belly);
    k.cyl('spar', 0.12, 0.18, 2.6, w, s * 1.25, 0.05, 0.75, c, { tess: 6 }).rotation.z = Math.PI / 2;
    membrane.rotation.z = 0;
    w.rotation.z = s * 0.4; wings.push({ w, s });
  }
  const legs = [];
  for (const [x, z] of [[-0.7, 0.7], [0.7, 0.7], [-0.7, -0.7], [0.7, -0.7]]) {
    const hip = k.node('dleg', body, x, 1.0, z);
    k.cyl('thigh', 0.45, 0.55, 1.0, hip, 0, -0.45, 0, c);
    k.box('foot', 0.55, 0.22, 0.7, hip, 0, -0.95, 0.12, belly);
    legs.push(hip);
  }
  const tail = [];
  let parent = body, z = -1.4, y = 1.3;
  for (let n = 0; n < 4; n++) {
    const seg = k.node('tail', parent, 0, n === 0 ? y : -0.05, n === 0 ? z : -0.7);
    k.ball('tailseg', 0.85 - n * 0.16, seg, 0, 0, 0, c);
    tail.push(seg); parent = seg;
  }
  k.cyl('tailtip', 0, 0.45, 0.6, parent, 0, 0, -0.45, c, { tess: 4 }).rotation.x = -Math.PI / 2;
  // State marker above the head: yellow (noticed), red (about to strike), green (friend).
  const marker = k.cyl('marker', 0.6, 0, 0.8, root, 0, 5.2, 0, '#FFD54A', { glow: 0.8, cast: false, tess: 8 });
  marker.isPickable = false;
  return { root, body, neck, head, brow, wings, legs, tail, marker, def };
}

export function animateDragon(m, d, time, k) {
  const flap = d.state === 'chase' ? 7 : 3;
  m.wings.forEach(({ w, s }) => { w.rotation.z = s * (0.35 + Math.sin(time * flap) * (d.state === 'chase' ? 0.6 : 0.25)); });
  const walking = ['chase', 'return', 'friendly', 'idle'].includes(d.state) && d.moving;
  m.legs.forEach((leg, i) => { leg.rotation.x = walking ? Math.sin(time * 9 + (i % 2 ? Math.PI : 0) + (i > 1 ? Math.PI : 0)) * 0.5 : 0; });
  m.tail.forEach((seg, i) => { seg.rotation.y = Math.sin(time * 3 - i * 0.7) * 0.25; });
  const wind = d.state === 'windup' ? Math.min(1, d.t / 0.7) : 0;
  m.neck.rotation.x = d.state === 'windup' ? -0.6 * wind : d.state === 'recover' ? 0.4 : 0;
  m.body.position.y = d.state === 'chase' ? Math.abs(Math.sin(time * 9)) * 0.15 : 0;
  m.body.rotation.z = d.state === 'stunned' ? Math.sin(time * 18) * 0.12 : 0;
  m.brow.rotation.z = 0; m.brow.position.y = d.state === 'friendly' ? 0.55 : 0.42;
  const mk = m.marker;
  const st = d.state;
  mk.setEnabled(['alert', 'windup', 'friendly', 'stunned', 'chase'].includes(st));
  mk.material = k.mat(st === 'windup' ? '#FF3B30' : st === 'friendly' ? '#5BE37D' : st === 'stunned' ? '#B9C6FF' : '#FFD54A', 0.9);
  mk.position.y = 5.2 + Math.sin(time * 5) * 0.15;
  const sc = st === 'windup' ? 1 + wind * 0.5 : 1;
  mk.scaling.set(sc, sc, sc);
  if (st === 'defeated') {
    m.root.rotation.z = Math.min(Math.PI / 2, d.t * 2);
    m.root.position.y = -Math.max(0, d.t - 1) * 0.8;
    if (d.t > 3) m.root.setEnabled(false);
  }
}

// Karl the Kameleon: a sneaky chameleon with a curly tail and swivelling eyes.
export function makeKarl(k) {
  const root = k.node('karl');
  const body = k.node('kbody', root);
  const skin = k.mat('#6CC24A');
  const parts = [];
  const add = m => { m.material = skin; parts.push(m); return m; };
  add(k.ball('kb', 1.2, body, 0, 0.8, 0, '#6CC24A', { scale: [0.8, 0.8, 1.4] }));
  add(k.ball('khead', 0.8, body, 0, 1.05, 0.85, '#6CC24A', { scale: [0.9, 0.85, 1.1] }));
  add(k.cyl('kcrest', 0, 0.5, 0.5, body, 0, 1.45, 0.75, '#6CC24A', { tess: 4 }));
  const tail = MeshBuilder.CreateTorus('ktail', { diameter: 0.7, thickness: 0.2, tessellation: 16 }, k.scene);
  tail.parent = body; tail.position.set(0, 0.6, -0.95); tail.rotation.y = Math.PI / 2; add(tail);
  const eyes = [];
  for (const s of [-1, 1]) {
    add(k.ball('keye', 0.36, body, s * 0.32, 1.15, 0.95, '#6CC24A'));
    const pupil = k.ball('kpupil', 0.14, body, s * 0.45, 1.17, 1.02, '#1A1A1A', { cast: false });
    parts.push(pupil); eyes.push(pupil);
    for (const z of [-0.35, 0.4]) add(k.cyl('kleg', 0.12, 0.16, 0.6, body, s * 0.38, 0.3, z, '#6CC24A', { tess: 6 }));
  }
  return { root, body, parts, skin, eyes };
}

export function animateKarl(m, karl, time, visibility) {
  m.parts.forEach(p => { p.visibility = visibility; });
  const hue = (time * 0.15) % 1;
  m.skin.diffuseColor = Color3.FromHSV(80 + Math.sin(time * 0.7) * 60 + hue * 20, 0.6, 0.75);
  m.eyes.forEach((e, i) => { e.position.z = 1.0 + Math.sin(time * 3 + i * 2) * 0.05; });
  m.body.position.y = karl.state === 'flee' || karl.state === 'stalk' ? Math.abs(Math.sin(time * 14)) * 0.1 : 0;
  m.body.rotation.z = karl.state === 'stunned' ? Math.sin(time * 20) * 0.2 : 0;
}

// The Shadow Sorcerer: a floating hooded figure with a staff.
export function makeSorcerer(k) {
  const root = k.node('sorcerer');
  const body = k.node('sbody', root);
  k.cyl('robe', 0.7, 2.0, 2.6, body, 0, 1.6, 0, '#3B2A55');
  k.cyl('robe-trim', 2.05, 2.05, 0.18, body, 0, 0.35, 0, '#9C6BD6', { glow: 0.3 });
  k.ball('hood', 1.2, body, 0, 3.15, 0, '#2A1D3E');
  k.ball('face', 0.85, body, 0, 3.05, 0.25, '#120B1C', { cast: false });
  for (const s of [-1, 1]) k.ball('seye', 0.14, body, s * 0.17, 3.1, 0.62, '#C77DFF', { glow: 1, cast: false });
  const staff = k.node('staff', body, 1.0, 1.9, 0.3);
  k.cyl('pole', 0.12, 0.12, 3.2, staff, 0, 0, 0, '#5B3E2B');
  const orb = k.ball('staff-orb', 0.5, staff, 0, 1.8, 0, '#C77DFF', { glow: 1 });
  const shield = k.ball('shield', 5, root, 0, 2, 0, '#8E6BFF', { cast: false, seg: 18 });
  shield.material = k.mat('#8E6BFF', 0.6, 0.25); shield.isPickable = false;
  return { root, body, staff, orb, shield };
}
