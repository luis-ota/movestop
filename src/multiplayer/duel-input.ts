import type { Game } from '../game/game';
import type { DuelClient } from './duel-client';

/**
 * Desktop input adapter for the duel. It only produces intents; all combat
 * and movement decisions stay on the authoritative server. On touch devices
 * the UIActions route the same intents from the on-screen controls.
 */
export class DuelInput {
  private keys = new Set<string>();
  private move = { x: 0, z: 0 };
  private aim = { x: 0, z: -1 };
  private firing = false;
  private attached = false;

  constructor(
    private readonly client: DuelClient,
    private readonly game: Game,
  ) {}

  attach(): void {
    if (this.attached) return;
    this.attached = true;
    window.addEventListener('keydown', this.onKeyDown);
    window.addEventListener('keyup', this.onKeyUp);
    window.addEventListener('blur', this.onBlur);
    window.addEventListener('pointermove', this.onPointerMove);
    window.addEventListener('pointerdown', this.onPointerDown);
    window.addEventListener('pointerup', this.onPointerUp);
    this.aim = { x: 1, z: 0 };
    this.applyAim();
  }

  detach(): void {
    if (!this.attached) return;
    this.attached = false;
    window.removeEventListener('keydown', this.onKeyDown);
    window.removeEventListener('keyup', this.onKeyUp);
    window.removeEventListener('blur', this.onBlur);
    window.removeEventListener('pointermove', this.onPointerMove);
    window.removeEventListener('pointerdown', this.onPointerDown);
    window.removeEventListener('pointerup', this.onPointerUp);
    this.firing = false;
    this.client.setFiring(false);
    this.game.setDuelFiring(false);
    this.move = { x: 0, z: 0 };
    this.client.setMove(0, 0);
    this.game.setDuelMove(0, 0);
  }

  setMove(x: number, z: number): void {
    const len = Math.hypot(x, z);
    this.move = len > 1 ? { x: x / len, z: z / len } : { x, z };
    this.client.setMove(this.move.x, this.move.z);
    this.game.setDuelMove(this.move.x, this.move.z);
  }

  setAim(x: number, z: number): void {
    const len = Math.hypot(x, z);
    if (len > 0.001) this.aim = { x: x / len, z: z / len };
    this.applyAim();
  }

  setFiring(on: boolean): void {
    const was = this.firing;
    this.firing = on;
    this.client.setFiring(on);
    this.game.setDuelFiring(on);
    if (on && !was) this.action('shoot');
  }

  action(kind: 'shoot' | 'parry' | 'dash' | 'slash' | 'special'): void {
    this.client.action(kind);
    this.game.duelLocalAction(kind);
  }

  private applyAim(): void {
    this.client.setAim(this.aim.x, this.aim.z);
    this.game.setDuelAim(this.aim.x, this.aim.z);
  }

  private updateMove(): void {
    let x = 0;
    let z = 0;
    if (this.keys.has('KeyW') || this.keys.has('ArrowUp')) z -= 1;
    if (this.keys.has('KeyS') || this.keys.has('ArrowDown')) z += 1;
    if (this.keys.has('KeyA') || this.keys.has('ArrowLeft')) x -= 1;
    if (this.keys.has('KeyD') || this.keys.has('ArrowRight')) x += 1;
    this.setMove(x, z);
  }

  private isTyping(target: EventTarget | null): boolean {
    const el = target as HTMLElement | null;
    return Boolean(el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.isContentEditable));
  }

  private onKeyDown = (e: KeyboardEvent): void => {
    if (this.isTyping(e.target)) return;
    if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) e.preventDefault();
    if (['KeyW', 'KeyA', 'KeyS', 'KeyD', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) {
      this.keys.add(e.code);
      this.updateMove();
      return;
    }
    if (e.repeat) return;
    if (e.code === 'KeyF') this.action('slash');
    else if (e.code === 'KeyE' || e.code === 'KeyQ') this.action('parry');
    else if (e.code === 'ShiftLeft' || e.code === 'ShiftRight') this.action('dash');
    else if (e.code === 'KeyR') this.action('special');
    else if (e.code === 'Space') this.action('shoot');
  };

  private onKeyUp = (e: KeyboardEvent): void => {
    if (!['KeyW', 'KeyA', 'KeyS', 'KeyD', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) return;
    this.keys.delete(e.code);
    this.updateMove();
  };

  private onBlur = (): void => {
    this.keys.clear();
    this.updateMove();
    this.setFiring(false);
  };

  private onPointerMove = (e: PointerEvent): void => {
    if (e.pointerType === 'touch') return;
    const aim = this.game.screenAim(e.clientX, e.clientY);
    this.setAim(aim.x, aim.z);
  };

  private onPointerDown = (e: PointerEvent): void => {
    if (e.pointerType === 'touch') return;
    const target = e.target as HTMLElement | null;
    if (!target || target.tagName !== 'CANVAS') return;
    if (e.button === 0) {
      const aim = this.game.screenAim(e.clientX, e.clientY);
      this.setAim(aim.x, aim.z);
      this.setFiring(true);
    } else if (e.button === 2) {
      e.preventDefault();
      this.action('parry');
    }
  };

  private onPointerUp = (e: PointerEvent): void => {
    if (e.pointerType === 'touch') return;
    if (e.button === 0) this.setFiring(false);
  };
}
