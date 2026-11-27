/**
 * Bullet dodging (pure). Only the Impossible difficulty turns it on: on the
 * other modes a shot that is lined up should land.
 *
 * A bullet is a threat when, flying straight, it passes within `reach` of the
 * enemy inside the next `horizon` seconds of world time. The enemy sidesteps
 * perpendicular to the bullet, toward the side it already leans to, so the
 * dodge always widens the miss instead of crossing the line of fire.
 */

export interface MovingPoint {
  x: number;
  z: number;
  vx: number;
  vz: number;
}

export interface DodgeTuning {
  /** sidestep speed (m/s, world time) */
  speed: number;
  /** sidestep duration (s, world time) */
  time: number;
  /** pause before the next dodge (s, world time) */
  cooldown: number;
}

/** How far ahead (world seconds) a bullet counts as incoming. */
export const DODGE_HORIZON = 0.35;
/** Extra clearance around the body that still counts as "will hit". */
export const DODGE_MARGIN = 0.35;

/**
 * Unit sidestep direction away from the most imminent bullet, or null.
 * `preferSide` (+1/-1) breaks the tie when a bullet comes dead centre.
 */
export function dodgeDirection(
  x: number,
  z: number,
  radius: number,
  bullets: readonly MovingPoint[],
  preferSide = 1,
  horizon = DODGE_HORIZON,
): { x: number; z: number } | null {
  let soonest = Infinity;
  let best: { x: number; z: number } | null = null;
  for (const b of bullets) {
    const v2 = b.vx * b.vx + b.vz * b.vz;
    if (v2 < 1e-6) continue;
    const dx = x - b.x;
    const dz = z - b.z;
    // time of closest approach along the bullet's straight path
    const t = (dx * b.vx + dz * b.vz) / v2;
    if (t < 0 || t > horizon || t >= soonest) continue;
    const ox = dx - b.vx * t;
    const oz = dz - b.vz * t;
    if (Math.hypot(ox, oz) > radius + DODGE_MARGIN) continue;
    const vl = Math.sqrt(v2);
    // perpendicular to the flight, on the side the body already sits
    const nx = -b.vz / vl;
    const nz = b.vx / vl;
    const lean = ox * nx + oz * nz;
    const side = Math.abs(lean) > 1e-3 ? Math.sign(lean) : preferSide;
    soonest = t;
    best = { x: nx * side, z: nz * side };
  }
  return best;
}
