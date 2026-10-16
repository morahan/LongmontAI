import { CX, VB_H, VB_W, Y_NECK_A, hourglassSVG, sandFrame } from './hourglass-art';
import { playSound, preloadSound, unlockAudio } from './audio';

type State = 'idle' | 'running' | 'paused' | 'finished';

const MIN_MINUTES = 1;
const MAX_MINUTES = 60;
const WARN_FRACTION = 0.1;

let uidSeq = 0;
let grainURL: string | null = null;

/** Tiny procedural grain texture (generated once, shared by all instances). */
function grainTexture(): string {
  if (grainURL !== null) return grainURL;
  grainURL = '';
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const g = c.getContext('2d');
  if (!g) return grainURL;
  for (let i = 0; i < 1100; i++) {
    const light = Math.random() < 0.45;
    const a = 0.12 + Math.random() * 0.45;
    g.fillStyle = light ? `rgba(255,238,190,${a})` : `rgba(105,55,10,${a})`;
    const s = Math.random() < 0.8 ? 1 : 1.7;
    g.fillRect(Math.random() * 64, Math.random() * 64, s, s);
  }
  grainURL = c.toDataURL();
  return grainURL;
}

const clampMinutes = (n: number): number => Math.min(MAX_MINUTES, Math.max(MIN_MINUTES, Math.round(n)));

function parseBool(v: string | null, fallback: boolean): boolean {
  if (v === null) return fallback;
  return !/^(false|0|off|no)$/i.test(v.trim());
}

function fmt(ms: number): string {
  const s = Math.max(0, Math.ceil(ms / 1000));
  return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
}

const STYLE = `
:host {
  all: initial;
  display: inline-block;
  width: 300px;
  max-width: 100%;
  font-family: ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", sans-serif;
  color: var(--hg-text, #f0dcb6);
  -webkit-font-smoothing: antialiased;
  --_accent: var(--hg-accent, #f4c66e);
  --_muted: var(--hg-muted, rgba(240, 220, 182, 0.8));
  --_line: rgba(255, 226, 170, 0.2);
}
:host([hidden]) { display: none; }
*, *::before, *::after { box-sizing: border-box; }
.hg { display: flex; flex-direction: column; gap: 6px; position: relative; }
svg.glass { display: block; width: 100%; height: auto; aspect-ratio: ${VB_W} / ${VB_H}; overflow: visible; }
.bar {
  display: grid; gap: 8px; padding: 10px 12px 11px;
  border-radius: 14px;
  background: var(--hg-bar-bg, rgba(30, 26, 22, 0.66));
  border: 1px solid var(--hg-bar-border, rgba(255, 226, 170, 0.14));
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.06);
  -webkit-backdrop-filter: blur(8px); backdrop-filter: blur(8px);
}
.row { display: flex; align-items: center; gap: 8px; min-width: 0; }
.time {
  margin-right: auto; line-height: 1;
  font-size: 28px; font-weight: 650; letter-spacing: 0.02em;
  font-variant-numeric: tabular-nums; color: var(--_accent);
}
.btns { display: flex; gap: 6px; }
button {
  all: unset; box-sizing: border-box; cursor: pointer;
  height: 30px; min-width: 50px; padding: 0 10px; border-radius: 9px;
  font-family: inherit; font-size: 12.5px; font-weight: 600; text-align: center;
  color: inherit; background: rgba(255, 236, 200, 0.07); border: 1px solid var(--_line);
  transition: background-color .15s, border-color .15s, opacity .15s;
}
button:hover:not(:disabled) { background: rgba(255, 236, 200, 0.14); }
button.primary { color: #2b1a05; background: linear-gradient(#f3c063, #d8952f); border-color: rgba(255, 214, 140, 0.6); }
button.primary:hover:not(:disabled) { background: linear-gradient(#f7ca72, #e0a03b); }
button.pause { min-width: 64px; }
button:disabled { opacity: 0.36; cursor: default; }
:focus-visible { outline: 2px solid var(--hg-focus, #ffd685); outline-offset: 2px; }
label { font-size: 12px; color: var(--_muted); }
input[type=range] {
  -webkit-appearance: none; appearance: none; flex: 1; min-width: 0; height: 24px;
  margin: 0; background: transparent; cursor: pointer; --fill: 0%;
}
input[type=range]::-webkit-slider-runnable-track {
  height: 4px; border-radius: 2px;
  background: linear-gradient(to right, var(--_accent) var(--fill), rgba(255, 236, 200, 0.16) var(--fill));
}
input[type=range]::-moz-range-track { height: 4px; border-radius: 2px; background: rgba(255, 236, 200, 0.16); }
input[type=range]::-moz-range-progress { height: 4px; border-radius: 2px; background: var(--_accent); }
input[type=range]::-webkit-slider-thumb {
  -webkit-appearance: none; width: 14px; height: 14px; margin-top: -5px; border-radius: 50%;
  background: var(--_accent); border: 2px solid #3a2a14; box-shadow: 0 0 0 1px rgba(255, 214, 140, 0.55);
}
input[type=range]::-moz-range-thumb {
  width: 12px; height: 12px; border-radius: 50%;
  background: var(--_accent); border: 2px solid #3a2a14; box-shadow: 0 0 0 1px rgba(255, 214, 140, 0.55);
}
input[type=number] {
  width: 46px; height: 26px; padding: 0 4px; border-radius: 7px; margin: 0;
  border: 1px solid var(--_line); background: rgba(0, 0, 0, 0.2); color: inherit;
  font-family: inherit; font-size: 13px; text-align: center; font-variant-numeric: tabular-nums;
  -moz-appearance: textfield; appearance: textfield;
}
input[type=number]::-webkit-inner-spin-button, input[type=number]::-webkit-outer-spin-button { -webkit-appearance: none; margin: 0; }
input:disabled { opacity: 0.45; cursor: default; }
.toggles { justify-content: space-between; }
.toggle { display: inline-flex; align-items: center; gap: 7px; min-height: 24px; cursor: pointer; }
.toggle input {
  -webkit-appearance: none; appearance: none; flex: none; position: relative; margin: 0; cursor: pointer;
  width: 30px; height: 17px; border-radius: 9px;
  background: rgba(255, 236, 200, 0.14); border: 1px solid rgba(255, 226, 170, 0.28);
  transition: background-color .18s, border-color .18s;
}
.toggle input::before {
  content: ""; position: absolute; top: 1px; left: 1px; width: 13px; height: 13px; border-radius: 50%;
  background: #cdbb9a; transition: transform .18s, background-color .18s;
}
.toggle input:checked { background: #d49a40; border-color: rgba(255, 214, 140, 0.75); }
.toggle input:checked::before { transform: translateX(13px); background: #fff4da; }
.sr { position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px; overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; border: 0; }
@media (prefers-reduced-motion: reduce) {
  *, *::before { transition: none !important; }
}
`;

export class HourglassTimer extends HTMLElement {
  static get observedAttributes(): string[] {
    return ['duration', 'sound', 'warning'];
  }

  private readonly uid = `hg${++uidSeq}`;
  private readonly root: ShadowRoot;
  private readonly svg: SVGSVGElement;
  private readonly timeEl: HTMLElement;
  private readonly startBtn: HTMLButtonElement;
  private readonly pauseBtn: HTMLButtonElement;
  private readonly resetBtn: HTMLButtonElement;
  private readonly range: HTMLInputElement;
  private readonly num: HTMLInputElement;
  private readonly soundBox: HTMLInputElement;
  private readonly warnBox: HTMLInputElement;
  private readonly live: HTMLElement;
  private readonly k: Record<string, SVGElement> = {};

  private state: State = 'idle';
  private minutes = 1;
  private soundOn = true;
  private warnOn = true;
  private elapsedBase = 0; // ms accumulated before the current run segment
  private startedAt = 0; // performance.now() when the current run segment began
  private warned = false;
  private raf = 0;
  private interval = 0;
  private lastTime = '';
  private lastAriaStep = -1;
  private reduceMotion: MediaQueryList | null = null;

  constructor() {
    super();
    this.root = this.attachShadow({ mode: 'open' });
    const id = this.uid;
    const h = (tag: string, attrs: Record<string, string> = {}, children: Array<Node | string> = []): HTMLElement => {
      const el = document.createElement(tag);
      for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v);
      el.append(...children);
      return el;
    };
    const glass = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    for (const [k, v] of Object.entries({ class: 'glass', part: 'hourglass', viewBox: `0 0 ${VB_W} ${VB_H}`, role: 'img', 'aria-label': 'Hourglass, full' })) {
      glass.setAttribute(k, v);
    }
    glass.append(...hourglassSVG(id, grainTexture()));
    const minutes = { min: String(MIN_MINUTES), max: String(MAX_MINUTES), step: '1', value: '1' };
    const toggle = (cls: string, text: string): HTMLElement =>
      h('label', { class: 'toggle' }, [
        h('input', { type: 'checkbox', role: 'switch', class: cls, checked: '' }),
        h('span', {}, [text]),
      ]);
    this.root.append(
      h('style', {}, [STYLE]),
      h('div', { class: 'hg', part: 'container' }, [
        glass,
        h('div', { class: 'bar', part: 'controls', role: 'group', 'aria-label': 'Hourglass timer controls' }, [
          h('div', { class: 'row' }, [
            h('div', { class: 'time', role: 'timer', 'aria-label': 'Time remaining', 'aria-atomic': 'true' }, ['01:00']),
            h('div', { class: 'btns' }, [
              h('button', { type: 'button', class: 'primary start', 'aria-label': 'Start timer' }, ['Start']),
              h('button', { type: 'button', class: 'pause', 'aria-label': 'Pause timer' }, ['Pause']),
              h('button', { type: 'button', class: 'reset', 'aria-label': 'Reset timer' }, ['Reset']),
            ]),
          ]),
          h('div', { class: 'row' }, [
            h('label', { for: `${id}-range` }, ['Minutes']),
            h('input', { id: `${id}-range`, type: 'range', ...minutes }),
            h('input', { type: 'number', ...minutes, inputmode: 'numeric', 'aria-label': 'Minutes (number)' }),
          ]),
          h('div', { class: 'row toggles' }, [toggle('sound', 'Sound'), toggle('warn', '10% warning')]),
        ]),
        h('div', { class: 'sr', 'aria-live': 'polite' }),
      ]),
    );

    const $ = <T extends Element>(sel: string): T => this.root.querySelector(sel) as T;
    this.svg = $('svg');
    this.timeEl = $('.time');
    this.startBtn = $('.start');
    this.pauseBtn = $('.pause');
    this.resetBtn = $('.reset');
    this.range = $('input[type=range]');
    this.num = $('input[type=number]');
    this.soundBox = $('.sound');
    this.warnBox = $('.warn');
    this.live = $('.sr');
    this.svg.querySelectorAll<SVGElement>('[data-k]').forEach((el) => (this.k[el.dataset.k!] = el));

    this.startBtn.addEventListener('click', () => {
      this.start();
      if (this.state === 'running') this.pauseBtn.focus();
    });
    this.pauseBtn.addEventListener('click', () => {
      unlockAudio();
      if (this.state === 'running') this.pause();
      else if (this.state === 'paused') this.resume();
    });
    this.resetBtn.addEventListener('click', () => {
      this.reset();
      this.startBtn.focus();
    });
    this.range.addEventListener('input', () => this.setMinutes(Number(this.range.value), true));
    this.num.addEventListener('change', () => this.setMinutes(Number(this.num.value), true));
    this.num.addEventListener('input', () => {
      const v = Number(this.num.value);
      if (Number.isInteger(v) && v >= MIN_MINUTES && v <= MAX_MINUTES) this.setMinutes(v, true);
    });
    this.soundBox.addEventListener('change', () => {
      if (this.soundBox.checked) unlockAudio();
      this.soundOn = this.soundBox.checked;
      this.reflect('sound', String(this.soundOn));
    });
    this.warnBox.addEventListener('change', () => {
      this.warnOn = this.warnBox.checked;
      this.reflect('warning', String(this.warnOn));
    });
  }

  // ---- lifecycle -----------------------------------------------------------
  connectedCallback(): void {
    this.reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)') ?? null;
    this.syncControls();
    this.render();
    if (this.state === 'running') this.startLoop();
  }

  disconnectedCallback(): void {
    this.stopLoop();
  }

  attributeChangedCallback(name: string, _old: string | null, value: string | null): void {
    if (name === 'duration') {
      const n = value === null ? 1 : parseFloat(value);
      if (Number.isFinite(n)) this.setMinutes(n, false);
    } else if (name === 'sound') {
      this.soundOn = parseBool(value, true);
      this.soundBox.checked = this.soundOn;
    } else if (name === 'warning') {
      this.warnOn = parseBool(value, true);
      this.warnBox.checked = this.warnOn;
    }
  }

  // ---- public API ----------------------------------------------------------
  get duration(): number {
    return this.minutes;
  }
  set duration(v: number) {
    this.setAttribute('duration', String(clampMinutes(Number(v))));
  }
  get sound(): boolean {
    return this.soundOn;
  }
  set sound(v: boolean) {
    this.setAttribute('sound', String(!!v));
  }
  get warning(): boolean {
    return this.warnOn;
  }
  set warning(v: boolean) {
    this.setAttribute('warning', String(!!v));
  }
  get status(): State {
    return this.state;
  }
  /** Remaining time in milliseconds. */
  get remaining(): number {
    return this.durationMs - this.elapsed(performance.now());
  }

  start(): void {
    if (this.state === 'running' || this.state === 'paused') return;
    unlockAudio();
    preloadSound(this.chimeSrc);
    preloadSound(this.gongSrc);
    this.elapsedBase = 0;
    this.warned = false;
    this.startedAt = performance.now();
    this.state = 'running';
    this.emit('hourglass-start', { duration: this.minutes });
    this.announce('Timer started');
    this.syncControls();
    this.startLoop();
  }

  pause(): void {
    if (this.state !== 'running') return;
    const now = performance.now();
    this.check(now);
    if (this.state !== 'running') return; // finished on this very check
    this.elapsedBase = this.elapsed(now);
    this.state = 'paused';
    this.stopLoop();
    this.announce('Paused');
    this.syncControls();
    this.render();
  }

  resume(): void {
    if (this.state !== 'paused') return;
    this.startedAt = performance.now();
    this.state = 'running';
    this.announce('Resumed');
    this.syncControls();
    this.startLoop();
  }

  reset(): void {
    this.stopLoop();
    this.state = 'idle';
    this.elapsedBase = 0;
    this.warned = false;
    this.announce('Reset');
    this.syncControls();
    this.render();
  }

  // ---- internals -----------------------------------------------------------
  private get durationMs(): number {
    return this.minutes * 60_000;
  }
  private get chimeSrc(): string {
    return this.getAttribute('chime-src') ?? '/chime.wav';
  }
  private get gongSrc(): string {
    return this.getAttribute('gong-src') ?? '/gong.mp3';
  }

  private elapsed(now: number): number {
    const e = this.state === 'running' ? this.elapsedBase + (now - this.startedAt) : this.elapsedBase;
    return Math.min(this.durationMs, Math.max(0, e));
  }

  private reflect(name: string, value: string): void {
    if (this.getAttribute(name) !== value) this.setAttribute(name, value);
  }

  private setMinutes(n: number, fromUser: boolean): void {
    const m = clampMinutes(n);
    if (m !== this.minutes) {
      this.minutes = m;
      // A new duration always starts from a full top chamber.
      if (this.state !== 'idle') this.reset();
    }
    if (fromUser) this.reflect('duration', String(m));
    this.syncControls();
    this.render();
  }

  /** Threshold checks; flags guarantee each sound fires at most once per run. */
  private check(now: number): void {
    if (this.state !== 'running') return;
    const remaining = this.durationMs - this.elapsed(now);
    if (!this.warned && remaining <= this.durationMs * WARN_FRACTION) {
      this.warned = true;
      this.emit('hourglass-warning', { remaining });
      this.announce('10% of time remaining');
      if (this.soundOn && this.warnOn) playSound(this.chimeSrc);
    }
    if (remaining <= 0) {
      this.state = 'finished';
      this.elapsedBase = this.durationMs;
      this.stopLoop();
      this.emit('hourglass-finish', { duration: this.minutes });
      this.announce("Time's up");
      if (this.soundOn) playSound(this.gongSrc);
      const hadFocus = this.root.activeElement === this.pauseBtn;
      this.syncControls();
      if (hadFocus) this.startBtn.focus();
      this.render();
    }
  }

  private startLoop(): void {
    this.stopLoop();
    const tick = () => {
      this.check(performance.now());
      this.render();
      if (this.state === 'running') this.raf = requestAnimationFrame(tick);
    };
    this.raf = requestAnimationFrame(tick);
    // rAF pauses in background tabs; keep sound timing honest there.
    this.interval = window.setInterval(() => this.check(performance.now()), 200);
  }

  private stopLoop(): void {
    cancelAnimationFrame(this.raf);
    clearInterval(this.interval);
    this.raf = 0;
    this.interval = 0;
  }

  private emit(type: string, detail: Record<string, unknown>): void {
    this.dispatchEvent(new CustomEvent(type, { detail, bubbles: true, composed: true }));
  }

  private announce(msg: string): void {
    this.live.textContent = msg;
  }

  private syncControls(): void {
    const s = this.state;
    const active = s === 'running' || s === 'paused';
    this.startBtn.disabled = active;
    this.pauseBtn.disabled = !active;
    this.pauseBtn.textContent = s === 'paused' ? 'Resume' : 'Pause';
    this.pauseBtn.setAttribute('aria-label', s === 'paused' ? 'Resume timer' : 'Pause timer');
    this.resetBtn.disabled = s === 'idle';
    this.range.disabled = this.num.disabled = active;
    this.range.value = this.num.value = String(this.minutes);
    this.range.style.setProperty('--fill', `${((this.minutes - MIN_MINUTES) / (MAX_MINUTES - MIN_MINUTES)) * 100}%`);
    this.range.setAttribute('aria-valuetext', `${this.minutes} minute${this.minutes === 1 ? '' : 's'}`);
    this.soundBox.checked = this.soundOn;
    this.warnBox.checked = this.warnOn;
  }

  private setD(key: string, d: string | null): void {
    const el = this.k[key];
    if (d) el.setAttribute('d', d);
    else el.removeAttribute('d');
  }

  private render(): void {
    const now = performance.now();
    const e = this.elapsed(now);
    const p = e / this.durationMs;
    const fr = sandFrame(p);
    this.setD('tS', fr.top);
    this.setD('tH', fr.top);
    this.setD('tG', fr.top);
    this.setD('tL', fr.topSurf);
    this.setD('bS', fr.bottom);
    this.setD('bH', fr.bottom);
    this.setD('bG', fr.bottom);
    this.setD('bL', fr.bottomSurf);

    const flowing = this.state === 'running' && p < 1;
    const stream = this.k.stream;
    stream.style.display = flowing ? '' : 'none';
    if (flowing) {
      const y1 = Y_NECK_A - 2;
      const y2 = fr.landY + 0.5;
      for (const key of ['s1', 's2', 's3']) {
        this.k[key].setAttribute('y1', String(y1));
        this.k[key].setAttribute('y2', y2.toFixed(2));
      }
      const still = this.reduceMotion?.matches ?? false;
      const t = still ? 0 : now;
      this.k.s2.setAttribute('stroke-dashoffset', String(-(t * 0.09) % 28));
      this.k.s3.setAttribute('stroke-dashoffset', String(-(t * 0.075) % 36));
      // A few grains bouncing off the top of the mound.
      ['g1', 'g2', 'g3'].forEach((key, i) => {
        const el = this.k[key];
        if (still) return el.setAttribute('r', '0');
        const ph = ((t / 420 + i / 3) % 1 + 1) % 1;
        const dir = i === 1 ? -1 : 1;
        el.setAttribute('r', i === 1 ? '0.6' : '0.72');
        el.setAttribute('cx', (CX + dir * (1 + ph * (3 + i))).toFixed(2));
        el.setAttribute('cy', (fr.landY - 3 * Math.sin(Math.PI * ph) + ph * 1.5).toFixed(2));
        el.setAttribute('opacity', (1 - ph).toFixed(2));
      });
    }

    const text = fmt(this.durationMs - e);
    if (text !== this.lastTime) {
      this.lastTime = text;
      this.timeEl.textContent = text;
    }
    const step = Math.round(p * 10);
    if (step !== this.lastAriaStep) {
      this.lastAriaStep = step;
      this.svg.setAttribute(
        'aria-label',
        step === 0 ? 'Hourglass, full' : step === 10 ? 'Hourglass, all sand has fallen' : `Hourglass, ${step * 10}% of sand has fallen`,
      );
    }
  }
}

if (!customElements.get('hourglass-timer')) customElements.define('hourglass-timer', HourglassTimer);

declare global {
  interface HTMLElementTagNameMap {
    'hourglass-timer': HourglassTimer;
  }
}
