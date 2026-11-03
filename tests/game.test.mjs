import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { endingEligibility, mayEarnTrust, inventoryConsistent, baseEndingPossible, currentObjective } from '../src/rules.mjs';
import { rooms, roomAt, roomPath, DOORS, doorOpen, buildWalls, navWaypoint, PROPS, HIDING, isHidden, segmentHitsBox, riverBoxes, local } from '../src/world.mjs';
import { moveCircle } from '../src/physics.mjs';
import { DRAGONS, newDragon, stepDragon, hitDragon, perceives } from '../src/ai.mjs';
import { traceBeam, startingMirrors, toggleMirror, leverOrder, pullLever } from '../src/puzzles.mjs';

// ---- Story rules ----
test('Old ending always available at the pedestal', () => {
  assert.deepEqual(endingEligibility({ CROWN: true }), { old: true, free: false, united: false });
  assert.equal(baseEndingPossible({ GOLD_DEAD: true }), true);
  assert.deepEqual(endingEligibility({}), { old: false, free: false, united: false });
});
test('Blueprint unlocks dragon freedom; pact needs forge and all trust', () => {
  assert.equal(endingEligibility({ CROWN: true, BLUEPRINT: true }).free, true);
  const f = { CROWN: true, BLUEPRINT: true, FORGE: true, GOLD_TRUST: true, GREEN_TRUST: true, RED_TRUST: true };
  assert.equal(endingEligibility(f).united, true);
  for (const k of ['BLUEPRINT', 'FORGE', 'GOLD_TRUST', 'GREEN_TRUST', 'RED_TRUST']) {
    const partial = { ...f }; delete partial[k];
    assert.equal(endingEligibility(partial).united, false, k);
  }
});
test('Defeated or already friendly dragons cannot earn trust', () => {
  assert.equal(mayEarnTrust({ GOLD_DEAD: true }, 'GOLD'), false);
  assert.equal(mayEarnTrust({ GREEN_TRUST: true }, 'GREEN'), false);
  assert.equal(mayEarnTrust({}, 'RED'), true);
  assert.equal(mayEarnTrust({}, 'PURPLE'), false);
});
test('Only one carried item at a time', () => {
  assert.equal(inventoryConsistent({ sunkey: { owner: 'hero' }, sword: { owner: 'world' } }, 'sunkey'), true);
  assert.equal(inventoryConsistent({ sunkey: { owner: 'hero' }, sword: { owner: 'hero' } }, 'sunkey'), false);
  assert.equal(inventoryConsistent({ sunkey: { owner: 'hero' } }, null), false);
  assert.equal(inventoryConsistent({ sunkey: { owner: 'karl' } }, null), true);
});
test('Objectives advance in story order', () => {
  assert.match(currentObjective({}), /Sun Key/);
  assert.match(currentObjective({ SUN_OPEN: true }), /pedestal/);
  assert.match(currentObjective({ SUN_OPEN: true, SANCTUARY: true, COLLAR: true, CRACK_OPEN: true }), /mural/);
});

// ---- World layout ----
test('20 named rooms on a 5x4 grid, roomAt round-trips', () => {
  assert.equal(rooms.length, 20);
  for (const r of rooms) assert.equal(roomAt(r.x, r.z), r.id);
  assert.equal(new Set(rooms.map(r => r.name)).size, 20);
});
test('Doors only join neighbouring rooms', () => {
  for (const d of DOORS) {
    const A = rooms[d.a], B = rooms[d.b];
    assert.equal(Math.abs(A.c - B.c) + Math.abs(A.r - B.r), 1, `${d.a}-${d.b}`);
  }
});
test('Castles are locked until their key or puzzle opens them', () => {
  assert.equal(roomPath(0, 1, {}), null, 'Sun Castle sealed');
  assert.ok(roomPath(0, 1, { SUN_OPEN: true }));
  assert.equal(roomPath(0, 9, {}), null, 'Frost Castle sealed');
  assert.ok(roomPath(0, 9, { FROST_OPEN: true }));
  assert.ok(roomPath(0, 9, { CRACK_OPEN: true }), 'cracked wall is an alternate route');
  assert.equal(roomPath(0, 19, { SUN_OPEN: true, FROST_OPEN: true, MIRRORS: true, BRIDGE_PLACED: true }), null, 'Shadow Castle sealed');
  assert.equal(roomPath(0, 15, {}), null, 'Hidden Path needs the bridge');
  assert.ok(roomPath(0, 15, { BRIDGE_PLACED: true }));
  assert.equal(roomPath(0, 14, {}), null, 'Mirror Hall only through Frost Castle');
});
test('Every room is reachable once everything is open', () => {
  const all = { SUN_OPEN: true, FROST_OPEN: true, CRACK_OPEN: true, MIRRORS: true, SHADOW_OPEN: true, BRIDGE_PLACED: true };
  for (const r of rooms) assert.ok(roomPath(0, r.id, all), r.name);
});
test('Every item and puzzle is reachable in story order (no soft lock)', () => {
  // Shadow key (Mine), bridge (Quarry), archive and seals reachable before Shadow Castle.
  for (const room of [12, 11, 16, 17, 18]) assert.ok(roomPath(0, room, {}), rooms[room].name);
  assert.ok(roomPath(0, 7, {}), 'Frost Key room reachable at the start');
});
test('Walls block movement except through open doorways', () => {
  const walls = buildWalls().filter(w => !w.door);
  const start = local(0, 0, 0);
  // Walk east from garden into Sun Castle wall (locked gate): blocked by gate box.
  const gate = buildWalls().filter(w => w.door);
  const blocked = moveCircle(start.x, start.z, 12, 0, 0.45, [...walls, ...gate]);
  assert.ok(roomAt(blocked.x, blocked.z) === 0, 'stopped at the gate');
  // Walk south from garden into Training Yard through the open doorway.
  const through = moveCircle(start.x, start.z, 0, -14, 0.45, walls);
  assert.equal(roomAt(through.x, through.z), 5);
  // Walk south from Sun Castle (room 1) where there is no doorway: blocked.
  const c = local(1, 0, 0);
  const wall = moveCircle(c.x, c.z, 0, -14, 0.45, walls);
  assert.equal(roomAt(wall.x, wall.z), 1);
});
test('River blocks the way south until the bridge is laid', () => {
  const walls = buildWalls().filter(w => !w.door), [l, m, r] = riverBoxes(), s = local(10, 0, 0);
  const wet = moveCircle(s.x, s.z, 0, -14, 0.45, [...walls, l, m, r]);
  assert.equal(roomAt(wet.x, wet.z), 10);
  const dry = moveCircle(s.x, s.z, 0, -14, 0.45, [...walls, l, r]);
  assert.equal(roomAt(dry.x, dry.z), 15);
});
test('Props do not cover doorways', () => {
  const walls = buildWalls();
  for (const d of DOORS) {
    const A = rooms[d.a], B = rooms[d.b], mx = (A.x + B.x) / 2, mz = (A.z + B.z) / 2;
    for (const p of PROPS) assert.ok(Math.hypot(Math.max(p.minX - mx, 0, mx - p.maxX), Math.max(p.minZ - mz, 0, mz - p.maxZ)) > 1.5, `${p.kind} in room ${p.room} blocks door ${d.a}-${d.b}`);
  }
  assert.ok(walls.length > 40);
});
test('North is up: row 0 has the largest z', () => {
  assert.ok(rooms[0].z > rooms[15].z);
  assert.equal(roomAt(rooms[0].x, rooms[0].z + 8), 0);
});
test('Hiding spots and line of sight', () => {
  assert.ok(isHidden(HIDING[0].x, HIDING[0].z));
  assert.ok(!isHidden(rooms[0].x, rooms[0].z));
  assert.ok(segmentHitsBox(0, 0, 10, 0, { minX: 4, maxX: 5, minZ: -1, maxZ: 1 }));
  assert.ok(!segmentHitsBox(0, 3, 10, 3, { minX: 4, maxX: 5, minZ: -1, maxZ: 1 }));
});
test('Navigation leads through doors toward another room', () => {
  const s = local(6, 0, 0), goal = local(0, 0, 0);
  let x = s.x, z = s.z;
  const walls = buildWalls().filter(w => !w.door);
  for (let i = 0; i < 400 && roomAt(x, z) !== 0; i++) {
    const wp = navWaypoint(x, z, goal, {});
    const dx = wp.x - x, dz = wp.z - z, L = Math.hypot(dx, dz) || 1;
    ({ x, z } = moveCircle(x, z, dx / L * 0.25, dz / L * 0.25, 1.0, walls));
  }
  assert.equal(roomAt(x, z), 0, 'dragon-sized walker reached the garden');
});

// ---- Dragon AI ----
const env = (hero, extra = {}) => ({ hero, los: () => true, nav: (x, z, g) => g, friendly: false, enraged: false, rand: () => 0.5, ...extra });
test('Dragon notices a visible hero in front, then chases, winds up and strikes', () => {
  const def = DRAGONS.gold, d = newDragon(def, { x: 0, z: 0 });
  d.heading = 0;
  const hero = { x: 0, z: 8, hidden: false, sprinting: false, invulnerable: false };
  let r = stepDragon(d, def, env(hero), 0.1);
  assert.equal(d.state, 'alert'); assert.ok(r.events.includes('alert'));
  for (let i = 0; i < 8; i++) stepDragon(d, def, env(hero), 0.1);
  assert.equal(d.state, 'chase');
  d.z = 6.5; r = stepDragon(d, def, env(hero), 0.1);
  assert.equal(d.state, 'windup');
  const events = [];
  for (let i = 0; i < 8; i++) events.push(...stepDragon(d, def, env(hero), 0.1).events);
  assert.ok(events.includes('hit'));
});
test('Dodging during the windup makes the strike miss', () => {
  const def = DRAGONS.red, d = newDragon(def, { x: 0, z: 0 });
  d.state = 'windup'; d.t = 0;
  const hero = { x: 0, z: 2, hidden: false, sprinting: false, invulnerable: true };
  const events = [];
  for (let i = 0; i < 8; i++) events.push(...stepDragon(d, def, env(hero), 0.1).events);
  assert.ok(events.includes('miss') && !events.includes('hit'));
});
test('Dragons cannot see behind them or into tall grass, but hear sprinting', () => {
  const def = DRAGONS.green, d = newDragon(def, { x: 0, z: 0 }); d.heading = 0;
  const behind = { x: 0, z: -8, hidden: false, sprinting: false };
  assert.equal(perceives(d, behind, () => true), false);
  assert.equal(perceives(d, { ...behind, sprinting: true }, () => true), true);
  assert.equal(perceives(d, { x: 0, z: 8, hidden: true }, () => true), false);
  assert.equal(perceives(d, { x: 0, z: 8 }, () => false), false, 'walls block sight');
});
test('Dragons give up when the hero escapes, and friends never attack', () => {
  const def = DRAGONS.gold, d = newDragon(def, { x: 0, z: 0 });
  d.state = 'chase'; d.x = 10;
  const hidden = { x: 5, z: 5, hidden: true };
  for (let i = 0; i < 35; i++) stepDragon(d, def, env(hidden), 0.1);
  assert.equal(d.state, 'return');
  const f = newDragon(def, { x: 0, z: 0 });
  const events = [];
  for (let i = 0; i < 50; i++) events.push(...stepDragon(f, def, env({ x: 0, z: 1 }, { friendly: true }), 0.1).events);
  assert.equal(f.state, 'friendly'); assert.ok(!events.includes('hit'));
});
test('Three sword hits defeat a dragon', () => {
  const d = newDragon(DRAGONS.gold, { x: 0, z: 0 });
  assert.equal(hitDragon(d, { x: 0, z: -2 }), 'stunned');
  assert.equal(hitDragon(d), 'stunned');
  assert.equal(hitDragon(d), 'defeated');
  assert.equal(d.state, 'defeated');
});

// ---- Puzzles ----
test('Mirror Hall starts unsolved and has two different solutions', () => {
  const start = startingMirrors();
  assert.equal(traceBeam(start).solved, false);
  assert.equal(traceBeam(['\\', '\\', '\\', '/']).solved, true, 'down then across');
  assert.equal(traceBeam(['/', '/', '/', '\\']).solved, true, 'up, across, then down');
  let o = start; o = toggleMirror(o, 0); o = toggleMirror(o, 1);
  assert.equal(traceBeam(o).solved, true, 'two turns from the start solves it');
});
test('Forge levers must follow the archive order', () => {
  const seed = 1234, order = leverOrder(seed);
  let pulled = [];
  for (const l of order.slice(0, 2)) { const r = pullLever(pulled, l, seed); assert.equal(r.result, 'progress'); pulled = r.pulled; }
  assert.equal(pullLever(pulled, order[2], seed).result, 'done');
  const wrong = [0, 1, 2].find(l => l !== order[0]);
  assert.deepEqual(pullLever([], wrong, seed), { pulled: [], result: 'wrong' });
});

// ---- Project files ----
test('Game HTML includes all controls', () => {
  const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
  for (const id of ['game', 'hud', 'status', 'prompt', 'overlay', 'interact', 'drop', 'attack', 'dodge', 'map', 'help', 'stick'])
    assert.ok(html.includes('id="' + id + '"'), id);
});
test('No names from the old prototype remain in the game', () => {
  for (const f of ['../src/main.js', '../src/ai.mjs', '../src/world.mjs', '../src/rules.mjs', '../index.html']) {
    const src = readFileSync(new URL(f, import.meta.url), 'utf8');
    assert.doesNotMatch(src, /Yorgle|Grundle|Rhindle|Blinky|Chalice/i, f);
  }
});
