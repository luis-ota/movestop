/**
 * Pure movement/combat helpers for the single-player campaign.
 * No Three.js or DOM here so they can be unit tested with `bun test`.
 */

export interface Box {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
  active: boolean;
}

export interface Point {
  x: number;
  z: number;
}

const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));

/**
 * Pushes a circle out of every overlapping box. The deepest overlap is solved
 * first, so a flat wall face always wins over the corner of the neighbouring
 * wall cell (no diagonal "ghost corner" kicks while sliding along a wall).
 * A centre buried inside a box is ejected along the shallowest axis instead of
 * an arbitrary direction, which used to teleport the player across thin walls.
 */
export function resolveCircle(pos: Point, r: number, boxes: readonly Box[], iterations = 4): void {
  for (let it = 0; it < iterations; it++) {
    let best: Box | null = null;
    let bestPen = 1e-6;
    for (const c of boxes) {
      if (!c.active) continue;
      const cx = clamp(pos.x, c.minX, c.maxX);
      const cz = clamp(pos.z, c.minZ, c.maxZ);
      const d2 = (pos.x - cx) ** 2 + (pos.z - cz) ** 2;
      let pen: number;
      if (d2 > 1e-12) pen = r - Math.sqrt(d2);
      else pen = r + Math.min(pos.x - c.minX, c.maxX - pos.x, pos.z - c.minZ, c.maxZ - pos.z);
      if (pen > bestPen) {
        bestPen = pen;
        best = c;
      }
    }
    if (!best) return;
    const cx = clamp(pos.x, best.minX, best.maxX);
    const cz = clamp(pos.z, best.minZ, best.maxZ);
    const dx = pos.x - cx;
    const dz = pos.z - cz;
    const d2 = dx * dx + dz * dz;
    if (d2 > 1e-12) {
      const d = Math.sqrt(d2);
      pos.x += (dx / d) * bestPen;
      pos.z += (dz / d) * bestPen;
    } else {
      const left = pos.x - best.minX;
      const right = best.maxX - pos.x;
      const top = pos.z - best.minZ;
      const bottom = best.maxZ - pos.z;
      const m = Math.min(left, right, top, bottom);
      if (m === left) pos.x = best.minX - r;
      else if (m === right) pos.x = best.maxX + r;
      else if (m === top) pos.z = best.minZ - r;
      else pos.z = best.maxZ + r;
    }
  }
}

/**
 * Moves a circle by (dx, dz) in sub-steps no longer than `maxStep`, resolving
 * collisions after each one. Prevents tunnelling through thin walls on low
 * frame rates, dashes and the Iai teleport.
 */
export function moveCircle(
  pos: Point,
  dx: number,
  dz: number,
  r: number,
  boxes: readonly Box[],
  maxStep = 0.2,
): void {
  const dist = Math.hypot(dx, dz);
  if (dist < 1e-9) {
    resolveCircle(pos, r, boxes);
    return;
  }
  const steps = Math.max(1, Math.ceil(dist / maxStep));
  const sx = dx / steps;
  const sz = dz / steps;
  for (let i = 0; i < steps; i++) {
    pos.x += sx;
    pos.z += sz;
    resolveCircle(pos, r, boxes);
  }
}

/** Next katana combo index (0, 1, 2). `stored` is the index that comes next. */
export function nextCombo(windowLeft: number, stored: number): number {
  return windowLeft > 0 ? ((stored % 3) + 3) % 3 : 0;
}

/** Smallest absolute angle between two headings, in [0, PI]. */
export function angleDiff(a: number, b: number): number {
  return Math.abs(Math.atan2(Math.sin(a - b), Math.cos(a - b)));
}

/** True if (tx, tz) is within `halfArc` radians of `angle` as seen from (ox, oz). */
export function inCone(ox: number, oz: number, angle: number, tx: number, tz: number, halfArc: number): boolean {
  if (halfArc >= Math.PI) return true;
  if (Math.hypot(tx - ox, tz - oz) < 1e-6) return true;
  return angleDiff(Math.atan2(tx - ox, tz - oz), angle) <= halfArc;
}

/** Keyboard axes to a unit vector. Opposite keys cancel; diagonals are normalised. */
export function keyMoveVector(up: boolean, down: boolean, left: boolean, right: boolean): Point {
  let x = (right ? 1 : 0) - (left ? 1 : 0);
  let z = (down ? 1 : 0) - (up ? 1 : 0);
  const len = Math.hypot(x, z);
  if (len > 0) {
    x /= len;
    z /= len;
  }
  return { x, z };
}

/**
 * Drops the leftover dash speed once the dash is over so the player does not
 * skate on for another ~0.25s. Speeds up to `cap` are kept as they are.
 */
export function capSpeed(vx: number, vz: number, cap: number): Point {
  const s = Math.hypot(vx, vz);
  if (s <= cap || s < 1e-9) return { x: vx, z: vz };
  return { x: (vx / s) * cap, z: (vz / s) * cap };
}

/** Counts pickups that can still be collected. */
export function liveCount(items: readonly { taken: boolean }[]): number {
  let n = 0;
  for (const i of items) if (!i.taken) n++;
  return n;
}
