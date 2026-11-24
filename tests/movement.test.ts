import { describe, expect, it } from 'bun:test';
import {
  angleDiff,
  capSpeed,
  inCone,
  keyMoveVector,
  liveCount,
  moveCircle,
  nextCombo,
  resolveCircle,
  type Box,
} from '../src/game/movement';

const wall = (x: number, z: number, h = 0.5): Box => ({
  minX: x - h,
  maxX: x + h,
  minZ: z - h,
  maxZ: z + h,
  active: true,
});

describe('combo da katana', () => {
  it('percorre 0, 1, 2 e volta a 0 depois do finisher', () => {
    let window = 0;
    let stored = 0;
    const seen: number[] = [];
    for (let i = 0; i < 4; i++) {
      const combo = nextCombo(window, stored);
      seen.push(combo);
      const finisher = combo === 2;
      stored = finisher ? 0 : combo + 1;
      window = 0.58;
    }
    expect(seen).toEqual([0, 1, 2, 0]);
  });

  it('reinicia quando a janela expira', () => {
    expect(nextCombo(0, 2)).toBe(0);
    expect(nextCombo(0.3, 1)).toBe(1);
  });
});

describe('colisão', () => {
  it('desliza ao longo de uma parede feita de várias células sem chute diagonal', () => {
    const boxes = [wall(0, 0), wall(1, 0), wall(2, 0), wall(3, 0)];
    const pos = { x: 0.3, z: -0.75 };
    // encosta na parede e anda ao longo dela
    for (let i = 0; i < 60; i++) {
      moveCircle(pos, 0.05, 0.02, 0.3, boxes);
    }
    expect(pos.x).toBeGreaterThan(3);
    expect(pos.z).toBeLessThanOrEqual(-0.8 + 1e-6);
    expect(pos.z).toBeGreaterThan(-0.81);
  });

  it('não atravessa parede fina com passo grande (dash, Iai, quadro lento)', () => {
    const boxes = [wall(2, 0, 0.5)];
    const pos = { x: 0, z: 0 };
    moveCircle(pos, 4.4, 0, 0.3, boxes);
    expect(pos.x).toBeLessThanOrEqual(1.2 + 1e-6);
  });

  it('expulsa um centro enterrado pelo lado mais raso, sem atravessar', () => {
    const boxes = [wall(0, 0)];
    const pos = { x: 0.4, z: 0.05 };
    resolveCircle(pos, 0.3, boxes);
    expect(pos.x).toBeCloseTo(0.8, 5);
  });

  it('ignora colisores inativos', () => {
    const b = wall(0, 0);
    b.active = false;
    const pos = { x: 0, z: 0 };
    moveCircle(pos, 1, 0, 0.3, [b]);
    expect(pos.x).toBeCloseTo(1, 5);
  });
});

describe('movimento por teclado', () => {
  it('normaliza diagonais e cancela teclas opostas', () => {
    const d = keyMoveVector(true, false, false, true);
    expect(Math.hypot(d.x, d.z)).toBeCloseTo(1, 6);
    expect(d.x).toBeGreaterThan(0);
    expect(d.z).toBeLessThan(0);
    expect(keyMoveVector(true, true, false, false)).toEqual({ x: 0, z: 0 });
    expect(keyMoveVector(false, false, true, true)).toEqual({ x: 0, z: 0 });
  });

  it('limita a velocidade herdada do dash sem mexer em velocidades normais', () => {
    const fast = capSpeed(13.5, 0, 6);
    expect(fast.x).toBeCloseTo(6, 6);
    expect(capSpeed(3, 4, 6)).toEqual({ x: 3, z: 4 });
  });
});

describe('arco da katana', () => {
  it('acerta à frente e dentro do arco, ignora atrás', () => {
    // angle 0 olha para +z
    expect(inCone(0, 0, 0, 0, 1, 1.35)).toBe(true);
    expect(inCone(0, 0, 0, 1, 1, 1.35)).toBe(true);
    expect(inCone(0, 0, 0, 0, -1, 1.35)).toBe(false);
  });

  it('atravessa a emenda de -PI/PI e o finisher cobre 360 graus', () => {
    const behind = Math.PI - 0.1;
    expect(inCone(0, 0, behind, Math.sin(-Math.PI + 0.1), Math.cos(-Math.PI + 0.1), 0.5)).toBe(true);
    expect(inCone(0, 0, 0, 0, -3, Math.PI)).toBe(true);
    expect(angleDiff(3.1, -3.1)).toBeLessThan(0.1);
  });
});

describe('munição no chão', () => {
  it('conta só o que ainda não foi coletado', () => {
    const items = Array.from({ length: 20 }, (_, i) => ({ taken: i < 15 }));
    expect(liveCount(items)).toBe(5);
  });
});
