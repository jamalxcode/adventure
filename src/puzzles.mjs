// Puzzle logic: Mirror Hall light beam and the Ancient Forge levers. Pure, testable.

// Mirror Hall is a 5x5 grid. Light enters cell (0,2) travelling east (+x).
// '\' turns east->south, '/' turns east->north (z grows southward).
export const MIRROR_GRID = 5;
export const MIRROR_SOURCE = { i: 0, j: 2, dx: 1, dz: 0 };
export const MIRROR_TARGET = { i: 4, j: 4 };
export const MIRRORS = [
  { i: 2, j: 2, start: '/' },
  { i: 2, j: 4, start: '/' },
  { i: 2, j: 0, start: '\\' },
  { i: 4, j: 0, start: '/' }
];
export const startingMirrors = () => MIRRORS.map(m => m.start);

export function reflect(dx, dz, kind) {
  return kind === '\\' ? { dx: dz, dz: dx } : { dx: -dz, dz: -dx };
}

// Returns { path:[{i,j}], solved } following the beam until it leaves the grid or hits the target.
export function traceBeam(orient) {
  let { i, j, dx, dz } = MIRROR_SOURCE;
  const path = [{ i: -1, j }];
  for (let guard = 0; guard < 60; guard++) {
    path.push({ i, j });
    if (i === MIRROR_TARGET.i && j === MIRROR_TARGET.j) return { path, solved: true };
    const m = MIRRORS.findIndex(mm => mm.i === i && mm.j === j);
    if (m >= 0) ({ dx, dz } = reflect(dx, dz, orient[m]));
    i += dx; j += dz;
    if (i < 0 || j < 0 || i >= MIRROR_GRID || j >= MIRROR_GRID) { path.push({ i, j }); return { path, solved: false }; }
  }
  return { path, solved: false };
}

export const toggleMirror = (orient, idx) => orient.map((o, n) => n === idx ? (o === '/' ? '\\' : '/') : o);

// Forge levers: the order is carved on the Stone Archive tablet and depends on the save's seed.
export const RUNES = ['Sun', 'Frost', 'Moon'];
const PERMS = [[0, 1, 2], [0, 2, 1], [1, 0, 2], [1, 2, 0], [2, 0, 1], [2, 1, 0]];
export const leverOrder = seed => PERMS[Math.abs(seed | 0) % PERMS.length];

// Pull a lever. Returns { pulled, result: 'progress'|'wrong'|'done' }.
export function pullLever(pulled, lever, seed) {
  const order = leverOrder(seed), next = [...pulled, lever];
  if (order[next.length - 1] !== lever) return { pulled: [], result: 'wrong' };
  if (next.length === order.length) return { pulled: next, result: 'done' };
  return { pulled: next, result: 'progress' };
}
