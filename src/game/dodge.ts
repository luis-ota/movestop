/**
 * Bullet dodging (pure). Only the Impossible difficulty turns it on: on the
 * other modes a shot that is lined up should land.
 *
 * Dodging is a read, not a reflex:
 * - a bullet can only be read after it has flown `reaction` seconds of world
 *   time, so a shot fired from close by lands before the enemy can react;
 * - once read, the enemy steps aside early (anything inside `horizon`), not
 *   at the last instant, so the dodge is visible and can be punished;
 * - a bullet that would land before the sidestep clears the body
 *   (`DODGE_MIN_LEAD`) is not worth dodging: it hits;
 * - after a dodge the enemy needs `cooldown` before the next one, so a
 *   quick follow-up shot lands.
 *
 * The sidestep is perpendicular to the bullet, toward the side the enemy
 * already leans to, so it widens the miss instead of crossing the line of fire.
 */

export interface MovingPoint {
  x: number;
  z: number;
  vx: number;
  vz: number;
  /** world seconds since the bullet was fired (or parried back) */
  age?: number;
}

export interface DodgeTuning {
  /** sidestep speed (m/s, world time) */
  speed: number;
  /** sidestep duration (s, world time) */
  time: number;
  /** pause before the next dodge (s, world time) */
  cooldown: number;
  /** how long a bullet must fly before the enemy can read it (s, world time) */
  reaction: number;
}

/** How far ahead (world seconds) a read bullet counts as incoming. */
export const DODGE_HORIZON = 0.6;
/** Extra clearance around the body that still counts as "will hit". */
export const DODGE_MARGIN = 0.35;
/** A bullet landing sooner than this cannot be cleared by a sidestep. */
export const DODGE_MIN_LEAD = 0.1;

/**
 * Unit sidestep direction away from the most imminent readable bullet, or null.
 * `preferSide` (+1/-1) breaks the tie when a bullet comes dead centre.
 */
export function dodgeDirection(
  x: number,
  z: number,
  radius: number,
  bullets: readonly MovingPoint[],
  preferSide = 1,
  reaction = 0,
  horizon = DODGE_HORIZON,
): { x: number; z: number } | null {
  let soonest = Infinity;
  let best: { x: number; z: number } | null = null;
  for (const b of bullets) {
    if ((b.age ?? Infinity) < reaction) continue; // not read yet
    const v2 = b.vx * b.vx + b.vz * b.vz;
    if (v2 < 1e-6) continue;
    const dx = x - b.x;
    const dz = z - b.z;
    // time of closest approach along the bullet's straight path
    const t = (dx * b.vx + dz * b.vz) / v2;
    if (t < DODGE_MIN_LEAD || t > horizon || t >= soonest) continue;
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

/**
 * Closest distance (m) from which a bullet of `speed` can still be dodged:
 * it must outlive the reaction and still leave time for the sidestep.
 */
export function dodgeSafeDistance(speed: number, reaction: number): number {
  return speed * (reaction + DODGE_MIN_LEAD);
}
