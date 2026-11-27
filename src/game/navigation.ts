/**
 * Enemy navigation on the arena grid (pure: no Three.js, no DOM).
 *
 * Arenas are already grids of 1 m cells, so one flow field toward the player
 * serves every enemy: a Dijkstra pass from the player's cell gives each free
 * cell its walking distance to the player, and an enemy simply heads down
 * that slope. It is rebuilt only when the player changes cell or the map
 * changes (a rock or a barrel destroyed, a boss collider added).
 *
 * When the straight line to the goal is clear for the enemy's body, it walks
 * straight; otherwise it aims at the farthest cell down the path it can see
 * (string pulling), which keeps corners smooth instead of cell-by-cell zigzags.
 */
import { segAABB, type Box } from './movement';

const SQRT2 = Math.SQRT2;
/** A cell is blocked when a solid covers its centre (plus this margin). */
const BLOCK_MARGIN = 0.2;
/** How many path cells ahead the string pulling looks for a visible target. */
const LOOKAHEAD = 6;

export interface NavDirection {
  x: number;
  z: number;
}

export class NavGrid {
  readonly cols: number;
  readonly rows: number;
  private readonly halfW: number;
  private readonly halfH: number;
  private readonly blocked: Uint8Array;
  private readonly dist: Float64Array;
  private targetCell = -1;
  private boxSignature = '';
  private fieldStale = true;

  constructor(cols: number, rows: number) {
    this.cols = cols;
    this.rows = rows;
    this.halfW = (cols - 1) / 2;
    this.halfH = (rows - 1) / 2;
    this.blocked = new Uint8Array(cols * rows);
    // Float64: heap keys are doubles; a Float32 copy rounds √2 down and made
    // every diagonally reached cell look already settled (never expanded)
    this.dist = new Float64Array(cols * rows).fill(Infinity);
  }

  /** Cell index under a world position, or -1 outside the grid. */
  cellOf(x: number, z: number): number {
    const c = Math.round(x + this.halfW);
    const r = Math.round(z + this.halfH);
    if (c < 0 || r < 0 || c >= this.cols || r >= this.rows) return -1;
    return r * this.cols + c;
  }

  private cx(i: number): number {
    return (i % this.cols) - this.halfW;
  }

  private cz(i: number): number {
    return Math.floor(i / this.cols) - this.halfH;
  }

  isBlocked(i: number): boolean {
    return this.blocked[i] === 1;
  }

  /** Walking distance (in cells) from cell i to the player, Infinity if unreachable. */
  distanceAt(i: number): number {
    return this.dist[i];
  }

  /**
   * Call once per frame: refreshes the blocked map when the solids changed and
   * the field when the player moved to another cell.
   */
  update(boxes: readonly Box[], targetX: number, targetZ: number): void {
    const signature = this.signatureOf(boxes);
    if (signature !== this.boxSignature) {
      this.boxSignature = signature;
      this.rebuildBlocked(boxes);
      this.fieldStale = true;
    }
    const target = this.cellOf(targetX, targetZ);
    if (target !== this.targetCell || this.fieldStale) {
      this.targetCell = target;
      this.fieldStale = false;
      this.buildField(target);
    }
  }

  /** Changes whenever a solid appears or is switched on/off. */
  private signatureOf(boxes: readonly Box[]): string {
    let active = 0;
    for (const b of boxes) if (b.active) active++;
    return `${boxes.length}:${active}`;
  }

  private rebuildBlocked(boxes: readonly Box[]): void {
    this.blocked.fill(0);
    for (const b of boxes) {
      if (!b.active) continue;
      const c0 = Math.max(0, Math.ceil(b.minX - BLOCK_MARGIN + this.halfW));
      const c1 = Math.min(this.cols - 1, Math.floor(b.maxX + BLOCK_MARGIN + this.halfW));
      const r0 = Math.max(0, Math.ceil(b.minZ - BLOCK_MARGIN + this.halfH));
      const r1 = Math.min(this.rows - 1, Math.floor(b.maxZ + BLOCK_MARGIN + this.halfH));
      for (let r = r0; r <= r1; r++) for (let c = c0; c <= c1; c++) this.blocked[r * this.cols + c] = 1;
    }
  }

  /** Dijkstra over 8 neighbours, no corner cutting. */
  private buildField(target: number): void {
    this.dist.fill(Infinity);
    if (target < 0) return;
    const heap = new MinHeap();
    this.dist[target] = 0;
    heap.push(target, 0);
    while (heap.size > 0) {
      const [i, d] = heap.pop();
      if (d > this.dist[i]) continue;
      const c = i % this.cols;
      const r = (i - c) / this.cols;
      for (let dr = -1; dr <= 1; dr++) {
        for (let dc = -1; dc <= 1; dc++) {
          if (dr === 0 && dc === 0) continue;
          const nr = r + dr;
          const nc = c + dc;
          if (nr < 0 || nc < 0 || nr >= this.rows || nc >= this.cols) continue;
          const n = nr * this.cols + nc;
          if (this.blocked[n]) continue;
          // a diagonal step may not squeeze between two blocked cells
          if (dr !== 0 && dc !== 0 && (this.blocked[r * this.cols + nc] || this.blocked[nr * this.cols + c])) continue;
          const nd = d + (dr !== 0 && dc !== 0 ? SQRT2 : 1);
          if (nd < this.dist[n]) {
            this.dist[n] = nd;
            heap.push(n, nd);
          }
        }
      }
    }
  }

  /** True when a body of `radius` can walk straight from a to b. */
  clearPath(boxes: readonly Box[], x0: number, z0: number, x1: number, z1: number, radius: number): boolean {
    const dx = x1 - x0;
    const dz = z1 - z0;
    // slightly under the real radius: a body already touching a wall can still slide along it
    const r = radius * 0.9;
    for (const b of boxes) {
      if (!b.active) continue;
      if (segAABB(x0, z0, dx, dz, b.minX - r, b.maxX + r, b.minZ - r, b.maxZ + r) <= 1) return false;
    }
    return true;
  }

  /** The free neighbour of cell i that is closest to the player (or -1). */
  private downhill(i: number): number {
    const c = i % this.cols;
    const r = (i - c) / this.cols;
    let best = -1;
    let bestD = this.dist[i];
    for (let dr = -1; dr <= 1; dr++) {
      for (let dc = -1; dc <= 1; dc++) {
        if (dr === 0 && dc === 0) continue;
        const nr = r + dr;
        const nc = c + dc;
        if (nr < 0 || nc < 0 || nr >= this.rows || nc >= this.cols) continue;
        const n = nr * this.cols + nc;
        if (this.blocked[n]) continue;
        if (dr !== 0 && dc !== 0 && (this.blocked[r * this.cols + nc] || this.blocked[nr * this.cols + c])) continue;
        if (this.dist[n] < bestD) {
          bestD = this.dist[n];
          best = n;
        }
      }
    }
    return best;
  }

  /**
   * Unit direction for a body at (x, z) heading to (goalX, goalZ) near the
   * player, or null when it cannot do better than walking straight (no path).
   */
  direction(
    boxes: readonly Box[],
    x: number,
    z: number,
    radius: number,
    goalX: number,
    goalZ: number,
  ): NavDirection | null {
    const gx = goalX - x;
    const gz = goalZ - z;
    const gl = Math.hypot(gx, gz);
    if (gl < 1e-6) return null;
    if (this.clearPath(boxes, x, z, goalX, goalZ, radius)) return { x: gx / gl, z: gz / gl };

    let cell = this.cellOf(x, z);
    if (cell < 0) return null;
    // a body pressed against a solid can stand in a blocked cell: start from its best free neighbour
    if (!Number.isFinite(this.dist[cell]) || this.blocked[cell]) {
      const out = this.downhill(cell);
      if (out < 0) return null;
      cell = out;
    }
    // walk down the field and aim at the farthest cell still in clear sight
    let aim = -1;
    let step = cell;
    for (let k = 0; k < LOOKAHEAD; k++) {
      if (this.clearPath(boxes, x, z, this.cx(step), this.cz(step), radius)) aim = step;
      else if (aim >= 0) break;
      const next = this.downhill(step);
      if (next < 0) break;
      step = next;
    }
    if (aim < 0) {
      const next = this.downhill(cell);
      aim = next >= 0 ? next : cell;
    }
    const ax = this.cx(aim) - x;
    const az = this.cz(aim) - z;
    const al = Math.hypot(ax, az);
    if (al < 1e-6) return null;
    return { x: ax / al, z: az / al };
  }
}

/** Small binary min-heap of (cell, distance). */
class MinHeap {
  private cells: number[] = [];
  private keys: number[] = [];

  get size(): number {
    return this.cells.length;
  }

  push(cell: number, key: number): void {
    this.cells.push(cell);
    this.keys.push(key);
    let i = this.cells.length - 1;
    while (i > 0) {
      const p = (i - 1) >> 1;
      if (this.keys[p] <= this.keys[i]) break;
      this.swap(i, p);
      i = p;
    }
  }

  pop(): [number, number] {
    const top: [number, number] = [this.cells[0], this.keys[0]];
    const lastCell = this.cells.pop()!;
    const lastKey = this.keys.pop()!;
    if (this.cells.length > 0) {
      this.cells[0] = lastCell;
      this.keys[0] = lastKey;
      let i = 0;
      for (;;) {
        const l = i * 2 + 1;
        const r = l + 1;
        let m = i;
        if (l < this.cells.length && this.keys[l] < this.keys[m]) m = l;
        if (r < this.cells.length && this.keys[r] < this.keys[m]) m = r;
        if (m === i) break;
        this.swap(i, m);
        i = m;
      }
    }
    return top;
  }

  private swap(a: number, b: number): void {
    [this.cells[a], this.cells[b]] = [this.cells[b], this.cells[a]];
    [this.keys[a], this.keys[b]] = [this.keys[b], this.keys[a]];
  }
}
