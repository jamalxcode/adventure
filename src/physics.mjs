// Circle-vs-box collision for walkers. Pure, testable.

export function pushOut(x, z, r, b) {
  const nx = Math.max(b.minX, Math.min(x, b.maxX));
  const nz = Math.max(b.minZ, Math.min(z, b.maxZ));
  const dx = x - nx, dz = z - nz, d2 = dx * dx + dz * dz;
  if (d2 >= r * r) return null;
  if (d2 > 1e-9) {
    const d = Math.sqrt(d2), k = (r - d) / d;
    return { x: x + dx * k, z: z + dz * k };
  }
  // Centre is inside the box: leave by the nearest face.
  const opts = [
    { x: b.minX - r, z, d: x - b.minX }, { x: b.maxX + r, z, d: b.maxX - x },
    { x, z: b.minZ - r, d: z - b.minZ }, { x, z: b.maxZ + r, d: b.maxZ - z }
  ].sort((a, c) => a.d - c.d);
  return { x: opts[0].x, z: opts[0].z };
}

// Move from (x,z) by (dx,dz), sliding along any boxes in the way.
export function moveCircle(x, z, dx, dz, r, boxes) {
  const steps = Math.max(1, Math.ceil(Math.hypot(dx, dz) / (r * 0.5)));
  for (let s = 0; s < steps; s++) {
    x += dx / steps; z += dz / steps;
    for (let pass = 0; pass < 2; pass++) {
      for (const b of boxes) {
        if (x + r < b.minX || x - r > b.maxX || z + r < b.minZ || z - r > b.maxZ) continue;
        const p = pushOut(x, z, r, b);
        if (p) { x = p.x; z = p.z; }
      }
    }
  }
  return { x, z };
}
