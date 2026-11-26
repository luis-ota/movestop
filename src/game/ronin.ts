/**
 * Ronin midboss: tuning and the pure decision rules (no Three.js, no DOM), so
 * they can be unit tested. The stateful behaviour lives in game.ts
 * (`updateRonin` and friends) and reads everything from here.
 *
 * Rules:
 * - two phases, `hpPerPhase` hits each; every hit removes exactly one;
 * - bullets never hurt him: he parries every ranged attack;
 * - he is only vulnerable in the recovery after his slow heavy cut;
 * - every hit makes him dash away and loose a quick volley of arrows;
 * - shurikens when the player runs away from him at mid range;
 * - phase 2: faster everything, a quick frontal cut, and he creeps forward
 *   even while time is stopped.
 */

export type RoninPhase = 1 | 2;
export type RoninAttack = 'heavy' | 'quickcut' | 'shuriken';

/** A value per phase: [phase 1, phase 2]. */
export type PerPhase = readonly [number, number];

export interface RoninTuning {
  hpPerPhase: number;
  /** walking speed in world time */
  approachSpeed: PerPhase;
  /** phase 2 only: metres per real second while the world is stopped */
  stillCreep: number;
  /** pause between attacks (world time) */
  attackCooldown: PerPhase;
  /** at or inside this distance he uses the sword */
  meleeRange: number;
  /** shurikens only up to this distance */
  shurikenRange: number;
  /** player speed away from him (m/s) that counts as running away */
  fleeSpeed: number;
  /** shurikens and arrows leave his hand this far from his centre (he is big) */
  throwOffset: number;
  heavy: {
    windup: PerPhase;
    range: number;
    halfArc: number;
    /** the vulnerable window after the cut */
    recovery: PerPhase;
  };
  quickcut: {
    windup: number;
    length: number;
    width: number;
    recovery: number;
  };
  shuriken: {
    windup: PerPhase;
    count: PerPhase;
    spread: number;
    speed: PerPhase;
  };
  arrows: {
    count: PerPhase;
    gap: PerPhase;
    speed: number;
    lead: number;
  };
  dash: {
    distance: number;
    time: number;
  };
}

export function byPhase(value: PerPhase, phase: RoninPhase): number {
  return value[phase - 1];
}

export interface AttackChoiceInput {
  dist: number;
  phase: RoninPhase;
  /** player velocity component pointing away from the ronin (m/s) */
  awaySpeed: number;
  last: RoninAttack | null;
  /** 0..1 random roll, injected so the rule is deterministic in tests */
  roll: number;
}

/**
 * Which attack to start now, or null to keep closing in.
 * - sword range: the heavy cut; in phase 2 the quick cut too, never twice in a row;
 * - mid range and the player running away: shurikens;
 * - otherwise: walk closer.
 */
export function chooseRoninAttack(input: AttackChoiceInput, t: RoninTuning): RoninAttack | null {
  const { dist, phase, awaySpeed, last, roll } = input;
  if (dist <= t.meleeRange) {
    if (phase === 1) return 'heavy';
    if (last === 'quickcut') return 'heavy';
    if (last === 'heavy') return 'quickcut';
    return roll < 0.6 ? 'quickcut' : 'heavy';
  }
  if (dist <= t.shurikenRange && awaySpeed >= t.fleeSpeed) return 'shuriken';
  return null;
}

/** Health after one landed hit: phase 1 rolls into a full phase 2; phase 2 at zero is death. */
export function roninHealthAfterHit(phase: RoninPhase, hp: number, t: RoninTuning): { phase: RoninPhase; hp: number; dead: boolean } {
  const left = hp - 1;
  if (left > 0) return { phase, hp: left, dead: false };
  if (phase === 1) return { phase: 2, hp: t.hpPerPhase, dead: false };
  return { phase: 2, hp: 0, dead: true };
}
