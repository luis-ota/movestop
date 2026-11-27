import { describe, expect, it } from 'bun:test';
import { frameSlot } from '../src/game/pacing';

/**
 * Simulates `seconds` of a display refreshing at `hz` (with ±jitter ms on each
 * timestamp, deterministic) and returns how many frames the cap let through
 * and the longest gap between two drawn frames.
 */
function simulate(hz: number, fps: number, seconds: number, jitter = 0) {
  let next = 0;
  let drawn = 0;
  let last = -1;
  let longest = 0;
  const period = 1000 / hz;
  const frames = Math.round(seconds * hz);
  for (let i = 0; i < frames; i++) {
    const wobble = jitter ? Math.sin(i * 12.9898) * jitter : 0;
    const now = 1000 + i * period + wobble;
    const slot = frameSlot(now, next, fps);
    next = slot.next;
    if (!slot.due) continue;
    drawn++;
    if (last >= 0) longest = Math.max(longest, now - last);
    last = now;
  }
  return { fps: drawn / seconds, longest };
}

describe('limite de quadros', () => {
  it('não perde quadros num monitor de 60 Hz, mesmo com variação de horário', () => {
    const r = simulate(60, 60, 10, 2);
    expect(r.fps).toBeGreaterThan(59.5);
    expect(r.longest).toBeLessThan(1000 / 60 + 4.5); // never skips a refresh
  });

  it('segura monitores de 120 e 144 Hz perto de 60 fps', () => {
    for (const hz of [120, 144, 165]) {
      const r = simulate(hz, 60, 10, 1);
      expect(r.fps).toBeGreaterThan(55);
      expect(r.fps).toBeLessThan(62);
    }
  });

  it('modo economia desenha a ~30 fps', () => {
    for (const hz of [60, 144]) {
      const r = simulate(hz, 30, 10, 1);
      expect(r.fps).toBeGreaterThan(28);
      expect(r.fps).toBeLessThan(31);
    }
  });

  it('depois de uma pausa longa volta ao ritmo sem rajada de quadros', () => {
    let next = 0;
    next = frameSlot(1000, next, 60).next;
    // a 2 s stall (hidden tab): one frame, then the normal pace again
    const a = frameSlot(3000, next, 60);
    expect(a.due).toBe(true);
    const b = frameSlot(3001, a.next, 60);
    expect(b.due).toBe(false);
  });
});
