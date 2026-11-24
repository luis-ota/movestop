import { describe, expect, it } from 'bun:test';
import {
  DUEL_GRID,
  DUEL_HEIGHT,
  DUEL_SPAWN_A,
  DUEL_SPAWN_B,
  DUEL_WIDTH,
  buildDuelGrid,
  clamp,
  duelColliders,
  isFinitePair,
  sanitizeName,
  spawnPoint,
} from '../src/shared/duel';

describe('contrato compartilhado do duelo', () => {
  it('grid tem dimensões fixas, borda fechada e spawns simétricos', () => {
    const grid = buildDuelGrid();
    expect(grid).toHaveLength(DUEL_HEIGHT);
    expect(DUEL_WIDTH).toBe(21);
    expect(DUEL_HEIGHT).toBe(15);

    for (let row = 0; row < DUEL_HEIGHT; row += 1) {
      expect(grid[row]).toHaveLength(DUEL_WIDTH);
      expect(grid[row][0]).toBe('#');
      expect(grid[row][DUEL_WIDTH - 1]).toBe('#');
    }
    for (let col = 0; col < DUEL_WIDTH; col += 1) {
      expect(grid[0][col]).toBe('#');
      expect(grid[DUEL_HEIGHT - 1][col]).toBe('#');
    }

    expect(grid[DUEL_SPAWN_A[0]][DUEL_SPAWN_A[1]]).toBe('A');
    expect(grid[DUEL_SPAWN_B[0]][DUEL_SPAWN_B[1]]).toBe('B');
    expect(grid[7][10]).toBe('#'); // pilar central
    expect(grid).toEqual(DUEL_GRID);
  });

  it('duelColliders gera um retângulo por célula bloqueada', () => {
    const colliders = duelColliders();
    const blocked = DUEL_GRID.reduce(
      (total, row) => total + row.split('').filter((cell) => cell === '#').length,
      0,
    );

    expect(colliders).toHaveLength(blocked);
    for (const collider of colliders) {
      expect(collider.maxX).toBeGreaterThan(collider.minX);
      expect(collider.maxZ).toBeGreaterThan(collider.minZ);
      expect(collider.maxX - collider.minX).toBeCloseTo(1, 9);
      expect(collider.maxZ - collider.minZ).toBeCloseTo(1, 9);
    }

    // Pilar central em (0,0) ocupa exatamente [-0.5,0.5] nos dois eixos.
    expect(colliders.some((c) =>
      c.minX === -0.5 && c.maxX === 0.5 && c.minZ === -0.5 && c.maxZ === 0.5,
    )).toBe(true);
  });

  it('spawnPoint devolve o centro das células A e B', () => {
    expect(spawnPoint(0)).toEqual({ x: -6, z: 0 });
    expect(spawnPoint(1)).toEqual({ x: 6, z: 0 });
    expect(spawnPoint(0)).not.toBe(spawnPoint(0)); // objeto novo, sem estado mutável compartilhado
  });

  it('sanitizeName remove caracteres perigosos e limita a 16', () => {
    expect(sanitizeName('  Akira  ')).toBe('Akira');
    expect(sanitizeName('Ryo_88!')).toBe('Ryo_88');
    expect(sanitizeName('A!k@i#r$a%')).toBe('Akira');
    expect(sanitizeName('João')).toBe('João');
    expect(sanitizeName('a'.repeat(40))).toBe('a'.repeat(16));
    expect(sanitizeName('🔥Duel🔥')).toBe('Duel');
    expect(sanitizeName('   ')).toBe('Ronin');
    expect(sanitizeName(42)).toBe('Ronin');
    expect(sanitizeName(null)).toBe('Ronin');
    expect(sanitizeName(undefined)).toBe('Ronin');
  });

  it('isFinitePair aceita apenas dois números finitos', () => {
    expect(isFinitePair([0, 0])).toBe(true);
    expect(isFinitePair([-10.5, 3])).toBe(true);
    expect(isFinitePair([NaN, 0])).toBe(false);
    expect(isFinitePair([Infinity, 0])).toBe(false);
    expect(isFinitePair([0, -Infinity])).toBe(false);
    expect(isFinitePair([1])).toBe(false);
    expect(isFinitePair([1, 2, 3])).toBe(false);
    expect(isFinitePair(['1', 2])).toBe(false);
    expect(isFinitePair(null)).toBe(false);
    expect(isFinitePair({ 0: 1, 1: 2 })).toBe(false);
  });

  it('clamp mantém o valor dentro do intervalo', () => {
    expect(clamp(5, 0, 10)).toBe(5);
    expect(clamp(-1, 0, 10)).toBe(0);
    expect(clamp(11, 0, 10)).toBe(10);
    expect(clamp(0, 0, 1)).toBe(0);
    expect(clamp(1, 0, 1)).toBe(1);
  });
});
