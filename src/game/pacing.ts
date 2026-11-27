/**
 * Frame-rate cap as a pure rule, so it can be tested against simulated
 * displays. `next` is when the next frame may run; feed back the returned value.
 *
 * - a quarter interval of slack: requestAnimationFrame jitters by a millisecond
 *   or two, and a display running exactly at the cap must never drop a frame;
 * - the slot advances one interval at a time, so a 144 Hz display settles near
 *   the cap instead of rounding down to every third refresh (48 fps);
 * - after a stall (a hidden tab, a long frame) it resyncs instead of rushing.
 */
export function frameSlot(now: number, next: number, fps: number): { due: boolean; next: number } {
  const interval = 1000 / fps;
  if (now < next - interval * 0.25) return { due: false, next };
  let after = next + interval;
  if (now - after > interval) after = now + interval;
  return { due: true, next: after };
}
