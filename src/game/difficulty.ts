import type { EnemyType } from './levels';

export type Difficulty = 'easy' | 'hard' | 'impossible';

export interface DifficultyDef {
  id: Difficulty;
  label: string;
  short: string;
  description: string;
  enemySpeedMult: number;
  enemyFireMult: number;
  enemyWindupMult: number;
  enemyBulletSpeedMult: number;
  enemyHpBonus: number;
  playerHpBonus: number;
  ammoBonus: number;
  ammoDropMult: number;
  bossHpMult: number;
}

export const DIFFICULTIES: Record<Difficulty, DifficultyDef> = {
  easy: {
    id: 'easy',
    label: 'Fácil',
    short: 'Aprender sem pressa',
    description: 'Mais vida e munição; inimigos mais lentos e menos frequentes.',
    enemySpeedMult: 0.82,
    enemyFireMult: 1.25,
    enemyWindupMult: 1.15,
    enemyBulletSpeedMult: 0.9,
    enemyHpBonus: 0,
    playerHpBonus: 1,
    ammoBonus: 2,
    ammoDropMult: 1.4,
    bossHpMult: 0.85,
  },
  hard: {
    id: 'hard',
    label: 'Difícil',
    short: 'O duelo de verdade',
    description: 'Inimigos mais rápidos e agressivos. Escudos levam dois tiros ou um corte.',
    enemySpeedMult: 1.12,
    enemyFireMult: 0.78,
    enemyWindupMult: 0.88,
    enemyBulletSpeedMult: 1.05,
    enemyHpBonus: 0,
    playerHpBonus: 0,
    ammoBonus: 0,
    ammoDropMult: 0.9,
    bossHpMult: 1.15,
  },
  impossible: {
    id: 'impossible',
    label: 'Impossível',
    short: 'Sem tempo para errar',
    description: 'Inimigos resistentes, implacáveis e com menos munição disponível.',
    enemySpeedMult: 1.32,
    enemyFireMult: 0.58,
    enemyWindupMult: 0.72,
    enemyBulletSpeedMult: 1.15,
    enemyHpBonus: 1,
    playerHpBonus: 0,
    ammoBonus: -1,
    ammoDropMult: 0.55,
    bossHpMult: 1.35,
  },
};

export const DIFFICULTY_ORDER: Difficulty[] = ['easy', 'hard', 'impossible'];

export function isDifficulty(value: unknown): value is Difficulty {
  return value === 'easy' || value === 'hard' || value === 'impossible';
}

export function getDifficulty(value: Difficulty | undefined): DifficultyDef {
  return DIFFICULTIES[value && isDifficulty(value) ? value : 'hard'];
}

export function enemyHpFor(type: EnemyType, difficulty: Difficulty): number {
  const base = type === 'shield' ? 2 : 1;
  return base + (type === 'shield' ? 0 : getDifficulty(difficulty).enemyHpBonus);
}

export function playerMaxHpFor(base: number, difficulty: Difficulty): number {
  return Math.max(1, base + getDifficulty(difficulty).playerHpBonus);
}

export function startingAmmoFor(base: number, difficulty: Difficulty): number {
  return Math.max(3, base + getDifficulty(difficulty).ammoBonus);
}

export function bossHpFor(base: number, difficulty: Difficulty): number {
  return Math.max(1, Math.ceil(base * getDifficulty(difficulty).bossHpMult));
}
