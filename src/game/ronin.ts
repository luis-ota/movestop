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
 *   even while time is stopped; after a hit, arrows also rain from the sky;
 * - Impossible only: a combo from mid range — a straight rush, two shurikens
 *   to the sides to funnel the player, then the heavy cut (which still opens
 *   the vulnerable window).
 */

import type { Difficulty } from './difficulty';

export type RoninPhase = 1 | 2;
/** rush and flank only exist inside the combo */
export type RoninAttack = 'heavy' | 'quickcut' | 'shuriken' | 'rush' | 'flank';
/** What the choice can start: a single attack, or the whole combo. */
export type RoninChoice = RoninAttack | 'combo';

/** The combo after its opening rush, in order. */
export const COMBO_FOLLOWUP: readonly RoninAttack[] = ['flank', 'heavy'];

/** A value per phase: [phase 1, phase 2]. */
export type PerPhase = readonly [number, number];

export interface RoninTuning {
  hpPerPhase: number;
  /** walking speed in world time */
  approachSpeed: PerPhase;
  /** phase 2 only: metres per real second while the world is stopped */
  stillCreep: number;
  /**
   * Pause between attacks (world time), per difficulty: only Impossible keeps
   * him attacking back to back.
   */
  attackCooldown: Record<Difficulty, PerPhase>;
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
    /** shortest pause after it; the difficulty's attackCooldown wins when longer */
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
  /** phase 2: arrows fall on marked spots while he fires the volley */
  skyArrows: {
    count: PerPhase;
    radius: number;
    /** world seconds from the mark to the impact */
    fuse: number;
    /** metres between the marks, sideways to his line to the player */
    spacing: number;
    /** seconds of player movement the centre mark leads */
    lead: number;
  };
  /** Impossible only: rush → two side shurikens → heavy cut */
  combo: {
    /** he opens it from this band of distances */
    minRange: number;
    maxRange: number;
    /** world seconds before he can start it again */
    cooldown: number;
    /**
     * He stops `stopShort` before the player's spot and his blade reaches
     * `reach` past where he stops: the lane is length + reach long.
     */
    rush: { windup: number; stopShort: number; reach: number; maxLength: number; width: number };
    /** the two shurikens fly at aim ± angle, leaving the centre open */
    flank: { windup: number; angle: number; speed: number };
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
  /** the combo is allowed (Impossible) and off cooldown */
  comboReady?: boolean;
}

/**
 * Which attack to start now, or null to keep closing in.
 * - sword range: the heavy cut; in phase 2 the quick cut too, never twice in a row;
 * - combo ready and inside its band: the combo (it opens with a rush, so it
 *   wins over the shurikens);
 * - mid range and the player running away: shurikens;
 * - otherwise: walk closer.
 */
export function chooseRoninAttack(input: AttackChoiceInput, t: RoninTuning): RoninChoice | null {
  const { dist, phase, awaySpeed, last, roll, comboReady } = input;
  if (dist <= t.meleeRange) {
    if (phase === 1) return 'heavy';
    if (last === 'quickcut') return 'heavy';
    if (last === 'heavy') return 'quickcut';
    return roll < 0.6 ? 'quickcut' : 'heavy';
  }
  if (comboReady && dist >= t.combo.minRange && dist <= t.combo.maxRange) return 'combo';
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

/** How far he travels: up to just before the player's spot, never past `maxLength`. */
export function rushLength(dist: number, t: RoninTuning): number {
  return Math.min(t.combo.rush.maxLength, Math.max(1, dist - t.combo.rush.stopShort));
}

/**
 * Where the sky arrows land: the first on the (led) player spot, the rest
 * alternating to either side of the line from him to the player, so standing
 * still or sidestepping both have to be read.
 */
export function skyArrowTargets(
  px: number,
  pz: number,
  dirX: number,
  dirZ: number,
  count: number,
  spacing: number,
): { x: number; z: number }[] {
  const len = Math.hypot(dirX, dirZ) || 1;
  const sx = -dirZ / len;
  const sz = dirX / len;
  const out: { x: number; z: number }[] = [];
  for (let i = 0; i < count; i++) {
    const k = i === 0 ? 0 : Math.ceil(i / 2) * (i % 2 === 1 ? 1 : -1);
    out.push({ x: px + sx * spacing * k, z: pz + sz * spacing * k });
  }
  return out;
}
