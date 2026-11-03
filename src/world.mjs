// World layout for The Three Dragons. Pure data + geometry helpers (no Babylon),
// so the map, doors and colliders can be unit-tested in Node.

export const COLS = 5, ROWS = 4, CELL = 18, HALF = CELL / 2;
export const WALL_T = 0.8, WALL_H = 3.2, DOOR_W = 4.2;

export const ROOM_NAMES = [
  'Golden Garden', 'Sun Castle', 'Sunlit Meadow', 'Forest Gate', 'Whispering Woods',
  'Training Yard', "Gold Dragon's Nest", "Karl's Lookout", 'Frost Gate', 'Frost Castle',
  'River Bank', 'Old Quarry', 'Mine Entrance', 'Ancient Forge', 'Mirror Hall',
  'Hidden Path', 'Stone Archive', 'Shadow Road', 'Shadow Gate', 'Shadow Castle'
];

export const rooms = ROOM_NAMES.map((name, id) => {
  const c = id % COLS, r = Math.floor(id / COLS);
  // Row 0 is north (+z, away from the default camera), so the on-screen map matches the 3D view.
  return { id, name, c, r, x: (c - 2) * CELL, z: (1.5 - r) * CELL };
});

export const WORLD = {
  minX: -2.5 * CELL, maxX: 2.5 * CELL, minZ: -2 * CELL, maxZ: 2 * CELL
};

export function roomAt(x, z) {
  const c = Math.max(0, Math.min(COLS - 1, Math.floor((x - WORLD.minX) / CELL)));
  const r = Math.max(0, Math.min(ROWS - 1, Math.floor((WORLD.maxZ - z) / CELL)));
  return r * COLS + c;
}
export const local = (room, lx, lz) => ({ x: rooms[room].x + lx, z: rooms[room].z + lz });

// Doors between adjacent rooms. `lock` names the flag that opens the door.
// Rooms with no door between them are separated by a solid wall.
export const DOORS = [
  { a: 0, b: 1, lock: 'SUN_OPEN', key: 'sunkey', gate: true },
  { a: 0, b: 5 }, { a: 5, b: 6 }, { a: 5, b: 10 }, { a: 6, b: 7 },
  { a: 2, b: 7 }, { a: 2, b: 3 }, { a: 3, b: 4 }, { a: 3, b: 8 },
  { a: 7, b: 12 },
  { a: 8, b: 9, lock: 'FROST_OPEN', key: 'frostkey', gate: true },
  { a: 4, b: 9, lock: 'CRACK_OPEN', crack: true },
  { a: 9, b: 14 },
  { a: 13, b: 14, lock: 'MIRRORS', sealed: true },
  { a: 12, b: 13 }, { a: 11, b: 12 }, { a: 10, b: 11 },
  { a: 10, b: 15, river: true },
  { a: 11, b: 16 }, { a: 16, b: 17 }, { a: 17, b: 18 },
  { a: 18, b: 19, lock: 'SHADOW_OPEN', key: 'shadowkey', gate: true }
];

export function doorBetween(a, b) {
  return DOORS.find(d => (d.a === a && d.b === b) || (d.a === b && d.b === a));
}

// Midpoint of the doorway between two adjacent rooms, and the direction of the wall.
export function doorPoint(d) {
  const A = rooms[d.a], B = rooms[d.b];
  return { x: (A.x + B.x) / 2, z: (A.z + B.z) / 2, vertical: A.r === B.r };
}

export function doorOpen(d, flags = {}) {
  if (d.river && !flags.BRIDGE_PLACED) return false;
  return !d.lock || !!flags[d.lock];
}

// Breadth-first search over open doors. Returns the list of room ids from `from` to `to`.
export function roomPath(from, to, flags = {}) {
  if (from === to) return [from];
  const prev = new Map([[from, -1]]), q = [from];
  while (q.length) {
    const cur = q.shift();
    for (const d of DOORS) {
      if (!doorOpen(d, flags)) continue;
      const nxt = d.a === cur ? d.b : d.b === cur ? d.a : -1;
      if (nxt < 0 || prev.has(nxt)) continue;
      prev.set(nxt, cur);
      if (nxt === to) {
        const path = [to];
        let p = cur;
        while (p !== -1) { path.unshift(p); p = prev.get(p); }
        return path;
      }
      q.push(nxt);
    }
  }
  return null;
}

// Where should a walker in room `from` head to reach point `goal` (in room `goalRoom`)?
export function navWaypoint(fromX, fromZ, goal, flags = {}) {
  const from = roomAt(fromX, fromZ), to = roomAt(goal.x, goal.z);
  if (from === to) return goal;
  const path = roomPath(from, to, flags);
  if (!path || path.length < 2) return null;
  const d = doorBetween(path[0], path[1]), p = doorPoint(d), B = rooms[path[1]];
  // First line up with the doorway on our own side, then step through it.
  const A = rooms[path[0]];
  const along = p.vertical ? Math.abs(fromZ - p.z) : Math.abs(fromX - p.x);
  const before = { x: p.x + (A.x - p.x) * 0.25, z: p.z + (A.z - p.z) * 0.25 };
  if (along > DOOR_W * 0.3 && Math.hypot(fromX - before.x, fromZ - before.z) > 1.2) return before;
  return { x: p.x + (B.x - p.x) * 0.2, z: p.z + (B.z - p.z) * 0.2 };
}

// Axis-aligned wall boxes. Each: {minX,maxX,minZ,maxZ, kind, door?}
export function buildWalls() {
  const walls = [];
  const box = (cx, cz, w, d, kind = 'wall', extra = {}) =>
    walls.push({ minX: cx - w / 2, maxX: cx + w / 2, minZ: cz - d / 2, maxZ: cz + d / 2, cx, cz, w, d, kind, ...extra });
  const T = WALL_T;
  // Outer boundary
  box(0, WORLD.minZ, WORLD.maxX - WORLD.minX + T, T, 'outer');
  box(0, WORLD.maxZ, WORLD.maxX - WORLD.minX + T, T, 'outer');
  box(WORLD.minX, 0, T, WORLD.maxZ - WORLD.minZ + T, 'outer');
  box(WORLD.maxX, 0, T, WORLD.maxZ - WORLD.minZ + T, 'outer');
  // Internal edges
  for (const A of rooms) {
    for (const B of [rooms[A.id + 1], rooms[A.id + COLS]]) {
      if (!B) continue;
      const vertical = B.id === A.id + 1;
      if (vertical && B.r !== A.r) continue;
      const mx = (A.x + B.x) / 2, mz = (A.z + B.z) / 2;
      const d = doorBetween(A.id, B.id);
      if (!d) {
        vertical ? box(mx, mz, T, CELL + T) : box(mx, mz, CELL + T, T);
        continue;
      }
      const seg = (CELL - DOOR_W) / 2, off = DOOR_W / 2 + seg / 2;
      if (vertical) { box(mx, mz - off, T, seg + T); box(mx, mz + off, T, seg + T); }
      else { box(mx - off, mz, seg + T, T); box(mx + off, mz, seg + T, T); }
      if (d.lock && !d.river) {
        const kind = d.crack ? 'crack' : d.sealed ? 'sealed' : 'gate';
        vertical ? box(mx, mz, T * 0.7, DOOR_W, kind, { door: d }) : box(mx, mz, DOOR_W, T * 0.7, kind, { door: d });
      }
    }
  }
  return walls;
}

// River across River Bank (room 10). The bridge spot is the only crossing.
export const RIVER = { room: 10, lz: -3.5, width: 2.6, bridgeLX: 0, gap: 3.4 };
export function riverBoxes() {
  const R = rooms[RIVER.room], z = R.z + RIVER.lz, g = RIVER.gap / 2;
  const left = { minX: R.x - HALF, maxX: R.x + RIVER.bridgeLX - g, minZ: z - RIVER.width / 2, maxZ: z + RIVER.width / 2, kind: 'river' };
  const right = { minX: R.x + RIVER.bridgeLX + g, maxX: R.x + HALF, minZ: left.minZ, maxZ: left.maxZ, kind: 'river' };
  const middle = { minX: left.maxX, maxX: right.minX, minZ: left.minZ, maxZ: left.maxZ, kind: 'river-gap' };
  return [left, middle, right];
}

// Solid scenery (castle keeps, forge, tower) so the player can't walk through buildings.
export const PROPS = [
  { room: 1, lx: 0, lz: 4.5, w: 10, d: 5, kind: 'keep' },
  { room: 9, lx: 5, lz: 0, w: 4.5, d: 10, kind: 'keep' },
  { room: 19, lx: 0, lz: 5.5, w: 10, d: 4, kind: 'keep' },
  { room: 7, lx: 4.5, lz: 4.5, w: 3.6, d: 3.6, kind: 'tower' },
  { room: 13, lx: 0, lz: 5.5, w: 6, d: 2.6, kind: 'furnace' },
  { room: 16, lx: -6.5, lz: 0, w: 1.2, d: 9, kind: 'shelf' },
  { room: 16, lx: 5, lz: -6.5, w: 6, d: 1.2, kind: 'shelf' }
].map(p => {
  const c = local(p.room, p.lx, p.lz);
  return { ...p, cx: c.x, cz: c.z, minX: c.x - p.w / 2, maxX: c.x + p.w / 2, minZ: c.z - p.d / 2, maxZ: c.z + p.d / 2 };
});

// Tall grass where the hero can hide from dragons (not while sprinting).
export const HIDING = [
  [2, -5, 4], [4, 4, -4], [4, -5, 3], [5, 5, 4], [6, -5, -5], [6, 5, 5], [6, -4, 5],
  [3, 5, -5], [8, -5, -5], [17, -4, 4], [17, 5, -4], [18, -5, -4], [11, 5, 5]
].map(([room, lx, lz]) => ({ room, ...local(room, lx, lz), r: 1.9 }));

export function isHidden(x, z) {
  return HIDING.some(h => Math.hypot(h.x - x, h.z - z) < h.r);
}

// Line of sight against solid walls/props (2D segment vs box test).
export function segmentHitsBox(x1, z1, x2, z2, b) {
  let t0 = 0, t1 = 1;
  const dx = x2 - x1, dz = z2 - z1;
  for (const [p, q] of [[-dx, x1 - b.minX], [dx, b.maxX - x1], [-dz, z1 - b.minZ], [dz, b.maxZ - z1]]) {
    if (p === 0) { if (q < 0) return false; continue; }
    const t = q / p;
    if (p < 0) { if (t > t1) return false; if (t > t0) t0 = t; }
    else { if (t < t0) return false; if (t < t1) t1 = t; }
  }
  return true;
}
