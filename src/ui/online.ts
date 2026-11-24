import {
  DUEL_ROUNDS_TO_WIN,
  DUEL_RULES,
  type DuelRoundState,
  type DuelSnapshot,
} from '../shared/duel';
import '../online.css';

export interface OnlineActions {
  quickMatch: () => void;
  createRoom: () => void;
  joinRoom: (code: string) => void;
  leave: () => void;
  retry: () => void;
  back: () => void;
}

export type OnlineStatus =
  | 'idle'
  | 'connecting'
  | 'connected'
  | 'queued'
  | 'matched'
  | 'offline'
  | 'error';

type OnlineSection = 'lobby' | 'queue' | 'hud' | 'result';
type Outcome = 'win' | 'loss' | 'draw';

interface HudRefs {
  selfScore: HTMLElement;
  foeScore: HTMLElement;
  round: HTMLElement;
  selfHp: HTMLElement;
  selfHeart: HTMLElement;
  ammo: HTMLElement;
  ammoPips: HTMLElement;
  focusBox: HTMLElement;
  focusPct: HTMLElement;
  focusFill: HTMLElement;
  foeName: HTMLElement;
  foeHp: HTMLElement;
  foeHeart: HTMLElement;
  ping: HTMLElement;
  pingNote: HTMLElement;
  pingBox: HTMLElement;
  banner: HTMLElement;
  bannerKicker: HTMLElement;
  bannerTitle: HTMLElement;
  bannerSub: HTMLElement;
  world: HTMLElement;
  worldLabel: HTMLElement;
}

interface ResultRefs {
  card: HTMLElement;
  seal: HTMLElement;
  title: HTMLElement;
  sub: HTMLElement;
  self: HTMLElement;
  foe: HTMLElement;
  rematch: HTMLButtonElement;
  back: HTMLButtonElement;
}

const HEART = `<svg viewBox="0 0 12 12" aria-hidden="true" focusable="false"><path d="M6 10.5C4.2 8.9 1 6.4 1 4.1 1 2.6 2.2 1.5 3.7 1.5c.9 0 1.7.4 2.3 1.2.6-.8 1.4-1.2 2.3-1.2 1.5 0 2.7 1.1 2.7 2.6 0 2.3-3.2 4.8-5 6.4Z"/></svg>`;

const STATUS_INFO: Record<OnlineStatus, { label: string; detail: string }> = {
  idle: {
    label: 'Pronto',
    detail: 'Servidor disponível. Escolha uma partida rápida ou abra uma sala.',
  },
  connecting: {
    label: 'Conectando',
    detail: 'Negociando a conexão com o servidor…',
  },
  connected: {
    label: 'Pronto',
    detail: 'Servidor disponível. Escolha uma partida rápida ou abra uma sala.',
  },
  queued: {
    label: 'Na fila',
    detail: 'Procurando um oponente…',
  },
  matched: {
    label: 'Partida encontrada',
    detail: 'O duelo vai começar.',
  },
  offline: {
    label: 'Servidor offline',
    detail: 'Não foi possível falar com o servidor. Verifique a conexão e use “Tentar de novo”.',
  },
  error: {
    label: 'Falha na conexão',
    detail: 'A conexão foi interrompida. Tente de novo em instantes.',
  },
};

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (char) => {
    switch (char) {
      case '&':
        return '&amp;';
      case '<':
        return '&lt;';
      case '>':
        return '&gt;';
      case '"':
        return '&quot;';
      default:
        return '&#39;';
    }
  });
}

function cleanCode(raw: string): string {
  return raw.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6);
}

function cleanName(raw: string | null | undefined): string {
  if (typeof raw !== 'string') return '';
  return raw.replace(/\s+/g, ' ').trim().slice(0, 24);
}

function clampNumber(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return min;
  return Math.max(min, Math.min(max, value));
}

function setText(node: HTMLElement | null, value: string): void {
  if (node && node.textContent !== value) node.textContent = value;
}

function setClass(node: HTMLElement, name: string, on: boolean): void {
  if (node.classList.contains(name) !== on) node.classList.toggle(name, on);
}

function roundStateText(state: DuelRoundState, round: number): string {
  switch (state) {
    case 'waiting':
      return 'Aguardando';
    case 'countdown':
      return 'Contagem';
    case 'live':
      return `Ronda ${Math.max(1, round)}`;
    case 'roundEnd':
      return 'Ronda encerrada';
    case 'matchEnd':
      return 'Fim';
    default:
      return 'Aguardando';
  }
}

function otherSide(side: 0 | 1): 0 | 1 {
  return side === 0 ? 1 : 0;
}

/**
 * Independent online duel UI: lobby, private-room queue, in-match HUD and
 * result card. It owns no networking and no game state — it only renders what
 * the authoritative server sends and reports user intents through actions.
 */
export class OnlineUI {
  private root: HTMLElement;
  private actions: OnlineActions;
  private active: OnlineSection | null = null;
  private status: OnlineStatus = 'idle';

  private lobby: HTMLElement;
  private queue: HTMLElement;
  private hudSection: HTMLElement;
  private resultSection: HTMLElement;

  private statusBox: HTMLElement;
  private statusLabel: HTMLElement;
  private statusDetail: HTMLElement;
  private quickBtn: HTMLButtonElement;
  private createBtn: HTMLButtonElement;
  private joinForm: HTMLFormElement;
  private codeInput: HTMLInputElement;
  private joinBtn: HTMLButtonElement;
  private codeHint: HTMLElement;
  private backBtn: HTMLButtonElement;

  private queueCode: HTMLElement;
  private queueCopy: HTMLButtonElement;
  private queueWaitTitle: HTMLElement;
  private queueWaitSuffix: HTMLElement;
  private queueCount: HTMLElement;
  private queueCancel: HTMLButtonElement;
  private room = '';
  private copyTimer: number | null = null;

  private hud: HudRefs | null = null;
  private result: ResultRefs | null = null;

  private lastLocalSide: 0 | 1 | null = null;
  private lastLocalId = '';
  private selfName = '';
  private lastFoeName = '';
  private lastAmmo = -1;
  private lastFocus = -1;
  private lastBannerKey = '';
  private lastWorldKey = '';

  constructor(root: HTMLElement, actions: OnlineActions) {
    this.root = root;
    this.actions = actions;

    root.classList.add('online-root');
    root.innerHTML = `
      <section class="online-section online-lobby" aria-labelledby="online-lobby-title">
        <div class="online-grain" aria-hidden="true"></div>
        <header class="online-topbar">
          <span class="online-brand"><i class="online-brand-mark" aria-hidden="true"></i>MOVESTOP</span>
          <span class="online-mode">Duelo 1v1 · servidor autoritativo</span>
        </header>
        <main class="online-lobby-main">
          <div class="online-lobby-intro">
            <p class="online-eyebrow"><span class="online-seal" aria-hidden="true">武</span>Salas anônimas · 1 contra 1</p>
            <h1 class="online-title" id="online-lobby-title">Duelo <em>online</em></h1>
            <p class="online-subtitle">Duas lâminas, um servidor. O tempo corre quando alguém se move.</p>
          </div>

          <div class="online-card">
            <div class="online-status" data-state="idle" role="status" aria-live="polite">
              <div class="online-status-line">
                <span class="online-status-dot" aria-hidden="true"></span>
                <span class="online-status-label" data-status-label>Pronto</span>
              </div>
              <p class="online-status-detail" data-status-detail>${STATUS_INFO.idle.detail}</p>
            </div>

            <div class="online-actions">
              <button class="online-btn online-btn-primary" type="button" data-quick>Partida rápida</button>
              <button class="online-btn online-btn-ghost" type="button" data-create>Criar sala</button>
            </div>

            <div class="online-divider"><span>ou entre com um código</span></div>

            <form class="online-join" data-join novalidate>
              <input
                class="online-code-input"
                data-code
                type="text"
                inputmode="text"
                autocomplete="off"
                autocapitalize="characters"
                spellcheck="false"
                maxlength="6"
                placeholder="A1B2C3"
                aria-label="Código da sala de 6 caracteres"
                aria-describedby="online-code-hint"
              />
              <button class="online-btn online-btn-ink online-join-btn" type="submit" data-join-btn disabled>Entrar</button>
            </form>
            <p class="online-field-hint" id="online-code-hint" data-hint>6 caracteres · A–Z, 0–9</p>

            <button class="online-back" type="button" data-back><span aria-hidden="true">←</span> Voltar</button>
          </div>

          <aside class="online-notes" aria-label="Notas do modo online">
            <div class="online-note">
              <span class="online-note-k">Justiça</span>
              <p>O servidor decide posição, dano, munição e rounds. O cliente só envia intenções.</p>
            </div>
            <div class="online-note">
              <span class="online-note-k">Limitações</span>
              <p>Protótipo anônimo, sem ranking e sem compras neste modo.</p>
            </div>
          </aside>
        </main>
        <footer class="online-foot">
          <span>Sessão efêmera · nada fica salvo</span>
          <span>Primeiro a ${DUEL_ROUNDS_TO_WIN} rounds</span>
        </footer>
      </section>

      <section class="online-section online-queue" aria-labelledby="online-queue-title" hidden>
        <div class="online-grain" aria-hidden="true"></div>
        <header class="online-topbar">
          <span class="online-brand"><i class="online-brand-mark" aria-hidden="true"></i>MOVESTOP</span>
          <span class="online-mode">Sala privada · fila</span>
        </header>
        <main class="online-queue-main">
          <span class="online-queue-seal" aria-hidden="true">待</span>
          <p class="online-eyebrow online-eyebrow-center">Sala privada · aguardando</p>
          <h2 class="online-queue-title" id="online-queue-title"><span data-wait-title>Aguardando</span><em data-wait-suffix> oponente…</em></h2>
          <p class="online-queue-sub">Compartilhe o código. O duelo começa quando o segundo jogador entrar.</p>

          <div class="online-code-shell">
            <div class="online-code-chars" data-queue-code role="group" aria-label="Código da sala"></div>
            <button class="online-btn online-btn-ghost online-copy" type="button" data-copy>Copiar</button>
          </div>

          <p class="online-queue-count"><span data-queue-players>1</span> de 2 na sala<span class="online-wait-dots" aria-hidden="true"><i></i><i></i><i></i></span></p>

          <button class="online-btn online-btn-quiet online-cancel" type="button" data-cancel>Cancelar</button>
          <p class="online-fineprint">A sala se desfaz quando você sai.</p>
        </main>
        <footer class="online-foot">
          <span>Conexão direta · sala efêmera</span>
          <span>Primeiro a ${DUEL_ROUNDS_TO_WIN} rounds</span>
        </footer>
      </section>

      <section class="online-section online-hud" aria-label="HUD do duelo online" hidden></section>
      <section class="online-section online-result" aria-labelledby="online-result-title" hidden></section>
    `;

    this.lobby = this.query('.online-lobby');
    this.queue = this.query('.online-queue');
    this.hudSection = this.query('.online-hud');
    this.resultSection = this.query('.online-result');

    this.statusBox = this.query('.online-status');
    this.statusLabel = this.query('[data-status-label]');
    this.statusDetail = this.query('[data-status-detail]');
    this.quickBtn = this.query<HTMLButtonElement>('[data-quick]');
    this.createBtn = this.query<HTMLButtonElement>('[data-create]');
    this.joinForm = this.query<HTMLFormElement>('[data-join]');
    this.codeInput = this.query<HTMLInputElement>('[data-code]');
    this.joinBtn = this.query<HTMLButtonElement>('[data-join-btn]');
    this.codeHint = this.query('[data-hint]');
    this.backBtn = this.query<HTMLButtonElement>('[data-back]');

    this.queueCode = this.query('[data-queue-code]');
    this.queueCopy = this.query<HTMLButtonElement>('[data-copy]');
    this.queueWaitTitle = this.query('[data-wait-title]');
    this.queueWaitSuffix = this.query('[data-wait-suffix]');
    this.queueCount = this.query('[data-queue-players]');
    this.queueCancel = this.query<HTMLButtonElement>('[data-cancel]');

    this.bindLobby();
    this.bindQueue();
    this.setStatus('idle');
    this.root.hidden = true;
  }

  showLobby(status: OnlineStatus, detail?: string): void {
    this.setStatus(status, detail);
    this.resetJoinError();
    this.activate('lobby', this.lobby);
  }

  showQueue(room: string, players: number): void {
    this.clearCopyTimer();
    this.queueCopy.textContent = 'Copiar';
    this.queueCopy.classList.remove('is-copied');
    this.room = typeof room === 'string' ? room.trim() : '';

    const display = cleanCode(this.room);
    const chars = display.length > 0 ? display.padEnd(6, '·').slice(0, 6) : '······';
    this.queueCode.innerHTML = Array.from(chars)
      .map((char) => `<span class="online-code-char" aria-hidden="true">${escapeHtml(char)}</span>`)
      .join('');
    this.queueCode.setAttribute('aria-label', `Código da sala: ${display || 'indisponível'}`);

    const inRoom = Math.round(clampNumber(players, 0, 2));
    const matched = inRoom >= 2;
    setText(this.queueWaitTitle, matched ? 'Oponente' : 'Aguardando');
    setText(this.queueWaitSuffix, matched ? ' encontrado' : ' oponente…');
    setText(this.queueCount, String(inRoom));
    setText(
      this.query('.online-queue-sub'),
      matched ? 'O duelo vai começar.' : 'Compartilhe o código. O duelo começa quando o segundo jogador entrar.',
    );
    this.activate('queue', this.queue);
  }

  showDuel(): void {
    this.ensureHud();
    this.resetHud();
    this.activate('hud', this.hudSection);
  }

  updateDuel(snapshot: DuelSnapshot, localId: string, ping?: number): void {
    if (!this.hud) return;
    const hud = this.hud;

    const local = snapshot.players.find((player) => player.id === localId) ?? null;
    const localSide = local?.side ?? this.lastLocalSide ?? 0;
    this.lastLocalSide = localSide;
    this.lastLocalId = localId;
    if (local) this.selfName = cleanName(local.name);

    const foe = snapshot.players.find((player) => player.id !== localId) ?? null;
    const foeName = cleanName(foe?.name) || 'Oponente';
    if (foe) this.lastFoeName = cleanName(foe.name);

    const selfScore = Math.max(0, Math.round(snapshot.score[localSide] ?? 0));
    const foeScore = Math.max(0, Math.round(snapshot.score[otherSide(localSide)] ?? 0));
    setText(hud.selfScore, String(selfScore));
    setText(hud.foeScore, String(foeScore));
    setText(hud.round, roundStateText(snapshot.state, snapshot.round));

    const hp = Math.max(0, Math.round(local?.hp ?? 0));
    setText(hud.selfHp, String(hp));
    setClass(hud.selfHeart, 'is-empty', hp <= 0);

    const foeDown = !foe || !foe.alive || foe.hp <= 0;
    setText(hud.foeName, foeName);
    setText(hud.foeHp, foeDown ? '—' : String(Math.max(0, Math.round(foe.hp))));
    setClass(hud.foeHeart, 'is-empty', foeDown);

    const ammo = Math.round(clampNumber(local?.ammo ?? 0, 0, DUEL_RULES.maxAmmo));
    if (ammo !== this.lastAmmo) {
      this.lastAmmo = ammo;
      setText(hud.ammo, String(ammo));
      const pips = hud.ammoPips.children;
      for (let i = 0; i < pips.length; i++) {
        setClass(pips[i] as HTMLElement, 'is-on', i < ammo);
      }
    }

    const focus = Math.round(clampNumber(local?.focus ?? 0, 0, DUEL_RULES.focusMax));
    if (focus !== this.lastFocus) {
      this.lastFocus = focus;
      setText(hud.focusPct, String(focus));
      setClass(hud.focusBox, 'is-ready', focus >= DUEL_RULES.focusMax);
      hud.focusBox.setAttribute('aria-valuenow', String(focus));
      hud.focusFill.style.width = `${focus}%`;
    }

    this.updatePing(hud, ping);
    this.updateBanner(hud, snapshot, localId, selfScore, foeScore);
    this.updateWorld(hud, snapshot.timeScale);
  }

  showResult(
    winner: string | null,
    score: [number, number],
    localId: string,
    reason?: string,
  ): void {
    this.ensureResult();
    if (!this.result) return;
    const result = this.result;

    const winnerId = typeof winner === 'string' && winner.trim() ? winner.trim() : null;
    const outcome: Outcome =
      winnerId === null ? 'draw' : this.isLocalWinner(winnerId, localId) ? 'win' : 'loss';
    const titles: Record<Outcome, string> = { win: 'Vitória', loss: 'Derrota', draw: 'Empate' };
    const seals: Record<Outcome, string> = { win: '勝', loss: '負', draw: '分' };
    const subtitles: Record<Outcome, string> = {
      win: 'O servidor confirmou o último golpe.',
      loss: 'O servidor confirmou o resultado. Nada foi decidido no seu cliente.',
      draw: 'Nenhum dos lados fechou o duelo.',
    };
    const forfeit = reason === 'oponente saiu';
    const disconnected = reason === 'conexão encerrada';
    const subtitle = forfeit
      ? outcome === 'win'
        ? 'O oponente saiu do duelo.'
        : 'A partida foi encerrada.'
      : disconnected
        ? 'A conexão terminou antes do fim. O placar é o último confirmado.'
        : subtitles[outcome];

    const side = this.lastLocalSide ?? 0;
    const you = Math.max(0, Math.round(score[side] ?? 0));
    const them = Math.max(0, Math.round(score[otherSide(side)] ?? 0));

    result.card.dataset.outcome = outcome;
    setText(result.seal, disconnected ? '断' : seals[outcome]);
    setText(result.title, disconnected ? 'Conexão encerrada' : titles[outcome]);
    setText(result.sub, subtitle);
    setText(result.self, String(you));
    setText(result.foe, String(them));

    this.activate('result', this.resultSection);
    if (!document.body.classList.contains('touch')) {
      try {
        result.rematch.focus({ preventScroll: true });
      } catch {
        /* focus is a bonus, never a requirement */
      }
    }
  }

  setStatus(status: OnlineStatus, detail?: string): void {
    this.status = status;
    const info = STATUS_INFO[status];
    this.statusBox.dataset.state = status;
    setText(this.statusLabel, info.label);
    setText(this.statusDetail, detail?.trim() || info.detail);

    const down = status === 'offline' || status === 'error';
    const connecting = status === 'connecting';
    const locked = down || connecting || status === 'queued' || status === 'matched';

    setText(this.quickBtn, down ? 'Tentar de novo' : connecting ? 'Conectando…' : 'Partida rápida');
    this.quickBtn.dataset.mode = down ? 'retry' : 'quick';
    this.quickBtn.disabled = connecting || status === 'queued' || status === 'matched';
    this.createBtn.disabled = locked;
    this.codeInput.disabled = locked;
    this.joinBtn.disabled = locked || cleanCode(this.codeInput.value).length !== 6;
    this.codeInput.setAttribute('aria-disabled', String(locked));
  }

  hide(): void {
    this.clearCopyTimer();
    this.lobby.hidden = true;
    this.queue.hidden = true;
    this.hudSection.hidden = true;
    this.resultSection.hidden = true;
    this.root.hidden = true;
    this.active = null;
  }

  get visible(): boolean {
    return !this.root.hidden && this.active !== null;
  }

  private query<T extends HTMLElement = HTMLElement>(selector: string): T {
    const node = this.root.querySelector(selector);
    if (!node) throw new Error(`OnlineUI: elemento ausente (${selector})`);
    return node as T;
  }

  private activate(section: OnlineSection, node: HTMLElement): void {
    this.lobby.hidden = section !== 'lobby';
    this.queue.hidden = section !== 'queue';
    this.hudSection.hidden = section !== 'hud';
    this.resultSection.hidden = section !== 'result';
    node.hidden = false;
    this.root.hidden = false;
    this.active = section;
  }

  private bindLobby(): void {
    this.quickBtn.addEventListener('click', () => {
      if (this.quickBtn.dataset.mode === 'retry') this.actions.retry();
      else if (!this.quickBtn.disabled) this.actions.quickMatch();
    });
    this.createBtn.addEventListener('click', () => {
      if (!this.createBtn.disabled) this.actions.createRoom();
    });
    this.codeInput.addEventListener('input', () => {
      const next = cleanCode(this.codeInput.value);
      if (this.codeInput.value !== next) this.codeInput.value = next;
      this.resetJoinError();
      const locked =
        this.status === 'offline' ||
        this.status === 'error' ||
        this.status === 'connecting' ||
        this.status === 'queued' ||
        this.status === 'matched';
      this.joinBtn.disabled = locked || next.length !== 6;
    });
    this.joinForm.addEventListener('submit', (event) => {
      event.preventDefault();
      const code = cleanCode(this.codeInput.value);
      if (code.length !== 6) {
        this.joinForm.classList.add('has-error');
        setText(this.codeHint, 'Digite os 6 caracteres do código.');
        this.codeInput.focus();
        return;
      }
      if (this.joinBtn.disabled) return;
      this.actions.joinRoom(code);
    });
    this.backBtn.addEventListener('click', () => this.actions.back());
  }

  private bindQueue(): void {
    this.queueCopy.addEventListener('click', () => {
      void this.copyRoom();
    });
    this.queueCancel.addEventListener('click', () => this.actions.leave());
  }

  private resetJoinError(): void {
    this.joinForm.classList.remove('has-error');
    setText(this.codeHint, '6 caracteres · A–Z, 0–9');
  }

  private clearCopyTimer(): void {
    if (this.copyTimer !== null) {
      window.clearTimeout(this.copyTimer);
      this.copyTimer = null;
    }
  }

  private async copyRoom(): Promise<void> {
    if (!this.room) return;
    let copied = false;
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(this.room);
        copied = true;
      }
    } catch {
      copied = false;
    }
    if (!copied) {
      try {
        const area = document.createElement('textarea');
        area.value = this.room;
        area.setAttribute('readonly', '');
        area.style.position = 'fixed';
        area.style.opacity = '0';
        area.style.pointerEvents = 'none';
        document.body.appendChild(area);
        area.select();
        copied = document.execCommand('copy');
        document.body.removeChild(area);
      } catch {
        copied = false;
      }
    }
    this.queueCopy.textContent = copied ? 'Copiado' : 'Copie o código';
    this.queueCopy.classList.toggle('is-copied', copied);
    this.clearCopyTimer();
    this.copyTimer = window.setTimeout(() => {
      this.copyTimer = null;
      this.queueCopy.textContent = 'Copiar';
      this.queueCopy.classList.remove('is-copied');
    }, 1800);
  }

  private ensureHud(): void {
    if (this.hud) return;
    this.hudSection.innerHTML = `
      <div class="online-hud-top">
        <div class="online-hud-score" aria-label="Placar do duelo">
          <span class="online-score-side">VOCÊ <b class="online-score-value" data-self-score>0</b></span>
          <span class="online-score-dash" aria-hidden="true">—</span>
          <span class="online-score-side"><b class="online-score-value" data-foe-score>0</b> ELE</span>
          <span class="online-hud-state" data-round>Aguardando</span>
        </div>
      </div>

      <div class="online-hud-panel online-hud-self">
        <div class="online-hud-heading"><span class="online-hud-label">Você</span></div>
        <div class="online-vitals">
          <div class="online-vital">
            <span class="online-hud-label">vida</span>
            <span class="online-vital-value"><span class="online-heart" data-self-heart>${HEART}</span><b data-self-hp>1</b></span>
          </div>
          <div class="online-vital online-vital-ammo">
            <span class="online-hud-label">munição</span>
            <span class="online-ammo-value"><b data-ammo>${DUEL_RULES.spawnAmmo}</b><small>/${DUEL_RULES.maxAmmo}</small></span>
          </div>
        </div>
        <div class="online-ammo-pips" data-ammo-pips aria-hidden="true">${'<i class="online-ammo-pip"></i>'.repeat(DUEL_RULES.maxAmmo)}</div>
        <div class="online-focus" data-focus-box role="progressbar" aria-label="Foco" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0">
          <div class="online-focus-head"><span>foco</span><b data-focus-pct>0</b><span class="online-focus-max">/100</span></div>
          <div class="online-focus-track"><i data-focus-fill></i></div>
        </div>
      </div>

      <div class="online-hud-panel online-hud-foe">
        <div class="online-hud-heading">
          <span class="online-hud-label">Oponente</span>
          <span class="online-ping" data-ping-box><span class="online-ping-label">ping</span><b data-ping>—</b><span data-ping-note></span></span>
        </div>
        <div class="online-foe-name" data-foe-name>Oponente</div>
        <div class="online-vitals online-vitals-foe">
          <div class="online-vital">
            <span class="online-hud-label">vida</span>
            <span class="online-vital-value"><span class="online-heart" data-foe-heart>${HEART}</span><b data-foe-hp>—</b></span>
          </div>
        </div>
      </div>

      <div class="online-hud-banner" data-banner hidden>
        <span class="online-banner-kicker" data-banner-kicker></span>
        <strong class="online-banner-title" data-banner-title></strong>
        <span class="online-banner-sub" data-banner-sub></span>
      </div>

      <div class="online-hud-base">
        <span class="online-world is-stopped" data-world>
          <i class="online-world-dot" aria-hidden="true"></i>
          <span class="online-world-label">tempo</span>
          <b data-world-label>Parado</b>
        </span>
        <span class="online-hud-hints" aria-label="Controles no desktop">
          <span class="online-hint"><b class="online-key">WASD</b> mover</span>
          <span class="online-hint"><b class="online-key">clique</b> atirar</span>
          <span class="online-hint"><b class="online-key">F</b> cortar</span>
          <span class="online-hint"><b class="online-key">E</b> aparar</span>
          <span class="online-hint"><b class="online-key">Shift</b> dash</span>
          <span class="online-hint"><b class="online-key">R</b> iai</span>
        </span>
        <span class="online-hud-touch">Joystick mover · arraste mirar · botões à direita</span>
      </div>
    `;

    const q = <T extends HTMLElement>(selector: string): T => {
      const node = this.hudSection.querySelector(selector);
      if (!node) throw new Error(`OnlineUI: HUD incompleto (${selector})`);
      return node as T;
    };
    this.hud = {
      selfScore: q('[data-self-score]'),
      foeScore: q('[data-foe-score]'),
      round: q('[data-round]'),
      selfHp: q('[data-self-hp]'),
      selfHeart: q('[data-self-heart]'),
      ammo: q('[data-ammo]'),
      ammoPips: q('[data-ammo-pips]'),
      focusBox: q('[data-focus-box]'),
      focusPct: q('[data-focus-pct]'),
      focusFill: q('[data-focus-fill]'),
      foeName: q('[data-foe-name]'),
      foeHp: q('[data-foe-hp]'),
      foeHeart: q('[data-foe-heart]'),
      ping: q('[data-ping]'),
      pingNote: q('[data-ping-note]'),
      pingBox: q('[data-ping-box]'),
      banner: q('[data-banner]'),
      bannerKicker: q('[data-banner-kicker]'),
      bannerTitle: q('[data-banner-title]'),
      bannerSub: q('[data-banner-sub]'),
      world: q('[data-world]'),
      worldLabel: q('[data-world-label]'),
    };
  }

  private resetHud(): void {
    if (!this.hud) return;
    const hud = this.hud;
    hud.banner.hidden = true;
    this.lastBannerKey = '';
    this.lastWorldKey = '';
    this.lastAmmo = -1;
    this.lastFocus = -1;
    setText(hud.selfScore, '0');
    setText(hud.foeScore, '0');
    setText(hud.round, 'Aguardando');
    setText(hud.selfHp, '1');
    setClass(hud.selfHeart, 'is-empty', false);
    setText(hud.foeName, 'Oponente');
    setText(hud.foeHp, '—');
    setClass(hud.foeHeart, 'is-empty', true);
    setText(hud.ammo, String(DUEL_RULES.spawnAmmo));
    const pips = hud.ammoPips.children;
    for (let i = 0; i < pips.length; i++) {
      setClass(pips[i] as HTMLElement, 'is-on', i < DUEL_RULES.spawnAmmo);
    }
    setText(hud.focusPct, '0');
    hud.focusBox.setAttribute('aria-valuenow', '0');
    setClass(hud.focusBox, 'is-ready', false);
    hud.focusFill.style.width = '0%';
    setText(hud.ping, '—');
    setText(hud.pingNote, '');
    setClass(hud.pingBox, 'is-high', false);
    this.updateWorld(hud, 0);
  }

  private updatePing(hud: HudRefs, ping?: number): void {
    const valid = typeof ping === 'number' && Number.isFinite(ping) && ping >= 0;
    const ms = valid ? Math.round(ping) : null;
    setText(hud.ping, ms === null ? '—' : `${ms} ms`);
    const high = ms !== null && ms > 120;
    setText(hud.pingNote, high ? '· alto' : '');
    setClass(hud.pingBox, 'is-high', high);
  }

  private updateWorld(hud: HudRefs, timeScale: number): void {
    const stopped = !Number.isFinite(timeScale) || timeScale < 0.45;
    const key = stopped ? 'stopped' : 'moving';
    if (key === this.lastWorldKey) return;
    this.lastWorldKey = key;
    setClass(hud.world, 'is-stopped', stopped);
    setClass(hud.world, 'is-moving', !stopped);
    setText(hud.worldLabel, stopped ? 'Parado' : 'Andando');
  }

  private updateBanner(
    hud: HudRefs,
    snapshot: DuelSnapshot,
    localId: string,
    you: number,
    them: number,
  ): void {
    const state = snapshot.state;
    if (state !== 'countdown' && state !== 'roundEnd' && state !== 'matchEnd') {
      if (this.lastBannerKey !== 'hidden') {
        hud.banner.hidden = true;
        this.lastBannerKey = 'hidden';
      }
      return;
    }

    const roundWinner = snapshot.lastWinner;
    const matchWinner = snapshot.matchWinner;
    const roundTitle = roundWinner
      ? this.isLocalWinner(roundWinner, localId)
        ? 'Você venceu'
        : 'Você caiu'
      : 'Empate';
    const matchTitle = matchWinner
      ? this.isLocalWinner(matchWinner, localId)
        ? 'Você venceu'
        : 'Você caiu'
      : 'Empate';

    let kicker = '';
    let title = '';
    let sub = '';
    let mode = '';
    let key = '';

    if (state === 'countdown') {
      mode = 'countdown';
      kicker = `Ronda ${Math.max(1, snapshot.round)}`;
      title = String(Math.max(1, Math.ceil(snapshot.stateTimer)));
      sub = 'Prepare-se';
      key = `countdown:${snapshot.round}`;
    } else if (state === 'roundEnd') {
      mode = 'round-end';
      kicker = 'Ronda encerrada';
      title = roundTitle;
      sub = `Placar ${you} — ${them}`;
      key = `roundEnd:${roundWinner ?? 'draw'}`;
    } else {
      mode = 'match-end';
      kicker = 'Fim';
      title = matchTitle;
      sub = `Placar ${you} — ${them}`;
      key = `matchEnd:${matchWinner ?? 'draw'}`;
    }

    if (key !== this.lastBannerKey) {
      this.lastBannerKey = key;
      hud.banner.dataset.mode = mode;
      hud.banner.hidden = false;
      setText(hud.bannerKicker, kicker);
      setText(hud.bannerTitle, title);
      setText(hud.bannerSub, sub);
      return;
    }

    // Countdown and the score line change while the banner is up, but the
    // banner element itself is never rebuilt.
    if (state === 'countdown') setText(hud.bannerTitle, title);
    else setText(hud.bannerSub, sub);
  }

  private isLocalWinner(winner: string, localId: string): boolean {
    return (
      winner === localId ||
      (this.lastLocalId !== '' && winner === this.lastLocalId) ||
      (this.selfName !== '' && winner === this.selfName)
    );
  }

  private ensureResult(): void {
    if (this.result) return;
    this.resultSection.innerHTML = `
      <div class="online-result-card" data-outcome="win" role="region" aria-labelledby="online-result-title">
        <div class="online-result-head">
          <span class="online-result-seal" data-result-seal aria-hidden="true">勝</span>
          <span class="online-result-kicker">Duelo online · fim</span>
        </div>
        <h2 class="online-result-title" id="online-result-title" data-result-title>Vitória</h2>
        <p class="online-result-sub" data-result-sub></p>

        <div class="online-result-score">
          <div class="online-result-side">
            <span>Você</span>
            <b data-result-self>0</b>
          </div>
          <span class="online-result-dash" aria-hidden="true">—</span>
          <div class="online-result-side">
            <span>Oponente</span>
            <b data-result-foe>0</b>
          </div>
        </div>

        <div class="online-result-actions">
          <button class="online-btn online-btn-primary" type="button" data-rematch>Revanche</button>
          <button class="online-btn online-btn-ghost" type="button" data-result-back>Voltar ao menu</button>
        </div>
        <p class="online-fineprint">A revanche volta para a fila.</p>
      </div>
    `;

    const q = <T extends HTMLElement>(selector: string): T => {
      const node = this.resultSection.querySelector(selector);
      if (!node) throw new Error(`OnlineUI: resultado incompleto (${selector})`);
      return node as T;
    };
    const result: ResultRefs = {
      card: q('[data-outcome]'),
      seal: q('[data-result-seal]'),
      title: q('[data-result-title]'),
      sub: q('[data-result-sub]'),
      self: q('[data-result-self]'),
      foe: q('[data-result-foe]'),
      rematch: q<HTMLButtonElement>('[data-rematch]'),
      back: q<HTMLButtonElement>('[data-result-back]'),
    };
    result.rematch.addEventListener('click', () => this.actions.quickMatch());
    result.back.addEventListener('click', () => this.actions.back());
    this.result = result;
  }
}
