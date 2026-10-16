// Pure geometry + SVG node builders for the hourglass. Only hourglassSVG touches
// the DOM, so the geometry can be tested outside the browser.

export const VB_W = 200;
export const VB_H = 322;
export const CX = 100;
export const Y_TOP = 26; // inner top of upper chamber
export const Y_NECK_A = 158; // bottom of upper chamber
export const Y_NECK_B = 164; // top of lower chamber
export const Y_BOT = 296; // inner floor of lower chamber
const CH = Y_NECK_A - Y_TOP; // chamber height (both chambers)
const W_MAX = 74; // widest inner half-width
const NECK = 2.4; // inner half-width of the neck
const GLASS = 3.2; // glass wall thickness
const RIM_HALF = 58;
const RIM_H = 12;

// ---- Chamber profile: monotone cubic through hand-tuned knots -------------
// u = 0 at the rim end of a chamber, u = 1 at the neck. g = relative width.
const KU = [0, 0.03, 0.08, 0.16, 0.27, 0.4, 0.53, 0.65, 0.76, 0.85, 0.92, 0.97, 1];
const KG = [0.56, 0.74, 0.88, 0.97, 1, 0.96, 0.84, 0.66, 0.45, 0.26, 0.11, 0.03, 0];
const KM = tangents(KU, KG);

function tangents(xs: number[], ys: number[]): number[] {
  const n = xs.length;
  const h: number[] = [];
  const d: number[] = [];
  for (let i = 0; i < n - 1; i++) {
    h[i] = xs[i + 1] - xs[i];
    d[i] = (ys[i + 1] - ys[i]) / h[i];
  }
  const m: number[] = new Array(n);
  m[0] = d[0];
  m[n - 1] = d[n - 2];
  for (let i = 1; i < n - 1; i++) {
    if (d[i - 1] * d[i] <= 0) m[i] = 0;
    else {
      const w1 = 2 * h[i] + h[i - 1];
      const w2 = h[i] + 2 * h[i - 1];
      m[i] = (w1 + w2) / (w1 / d[i - 1] + w2 / d[i]);
    }
  }
  return m;
}

function g(u: number): number {
  if (u <= 0) return KG[0];
  if (u >= 1) return 0;
  let i = 0;
  while (u > KU[i + 1]) i++;
  const h = KU[i + 1] - KU[i];
  const t = (u - KU[i]) / h;
  const t2 = t * t;
  const t3 = t2 * t;
  return (
    (2 * t3 - 3 * t2 + 1) * KG[i] +
    (t3 - 2 * t2 + t) * h * KM[i] +
    (-2 * t3 + 3 * t2) * KG[i + 1] +
    (t3 - t2) * h * KM[i + 1]
  );
}

const innerHalfU = (u: number): number => NECK + (W_MAX - NECK) * g(u);

/** Inner half-width of the glass at height y. */
export function halfAt(y: number): number {
  if (y <= Y_NECK_A) return innerHalfU((y - Y_TOP) / CH);
  if (y < Y_NECK_B) return NECK;
  return innerHalfU((Y_BOT - y) / CH);
}

const f = (n: number): string => n.toFixed(2);

function outline(offset: number, yA: number, yB: number): string {
  const ys: number[] = [];
  const N = 110;
  for (let i = 0; i <= N; i++) ys.push(yA + ((Y_NECK_A - yA) * i) / N);
  ys.push((Y_NECK_A + Y_NECK_B) / 2);
  for (let i = 0; i <= N; i++) ys.push(Y_NECK_B + ((yB - Y_NECK_B) * i) / N);
  const hw = (y: number) => halfAt(Math.min(Math.max(y, Y_TOP), Y_BOT)) + offset;
  const right = ys.map((y) => `${f(CX + hw(y))} ${f(y)}`);
  const left = ys.reverse().map((y) => `${f(CX - hw(y))} ${f(y)}`);
  return `M${right.join(' L')} L${left.join(' L')} Z`;
}

export const INNER_PATH = outline(0, Y_TOP, Y_BOT);
export const OUTER_PATH = outline(GLASS, Y_TOP - 2, Y_BOT + 2);

// ---- Sand volume model (2D area, exactly proportional to elapsed) ---------
const DY = 0.5;
function rows(y0: number, y1: number): { y: Float64Array; w: Float64Array } {
  const n = Math.floor((y1 - y0) / DY);
  const y = new Float64Array(n);
  const w = new Float64Array(n);
  for (let i = 0; i < n; i++) {
    y[i] = y0 + DY * (i + 0.5);
    w[i] = halfAt(y[i]);
  }
  return { y, w };
}
const TOP_ROWS = rows(Y_TOP, Y_NECK_A);
const BOT_ROWS = rows(Y_NECK_B, Y_BOT);

const L_FULL = Y_TOP + 0.3 * CH; // sand level at start
const D_IDLE = 1.2; // surface sag before any sand has fallen
const D_MAX = 11; // funnel depth while draining
const R_FUNNEL = 20; // funnel width
const K_SLOPE = 0.5; // mound slope (dy/dx)
const R_TIP = 6; // mound tip rounding

/** Top surface: y = L + D / (1 + (x/R)^2) — a soft funnel dipping to the neck. */
function topArea(L: number, D: number): number {
  const { y, w } = TOP_ROWS;
  let a = 0;
  for (let i = 0; i < y.length; i++) {
    const yy = y[i];
    if (yy <= L) continue;
    if (yy >= L + D) a += 2 * w[i];
    else {
      const xo = R_FUNNEL * Math.sqrt(D / (yy - L) - 1);
      if (xo < w[i]) a += 2 * (w[i] - xo);
    }
  }
  return a * DY;
}

/** Bottom surface: rounded cone y = P + k(√(x²+r²) − r). */
function bottomArea(P: number): number {
  const { y, w } = BOT_ROWS;
  let a = 0;
  for (let i = 0; i < y.length; i++) {
    const yy = y[i];
    if (yy < P) continue;
    const q = (yy - P) / K_SLOPE + R_TIP;
    a += 2 * Math.min(w[i], Math.sqrt(q * q - R_TIP * R_TIP));
  }
  return a * DY;
}

export const SAND_TOTAL = topArea(L_FULL, D_IDLE);

function bisect(fn: (v: number) => number, target: number, lo: number, hi: number): number {
  // fn is decreasing in v on [lo, hi]
  for (let i = 0; i < 40; i++) {
    const mid = (lo + hi) / 2;
    if (fn(mid) > target) lo = mid;
    else hi = mid;
  }
  return (lo + hi) / 2;
}

const smoothstep = (a: number, b: number, x: number): number => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

export interface SandFrame {
  top: string | null;
  topSurf: string | null;
  bottom: string | null;
  bottomSurf: string | null;
  /** y where the falling stream lands */
  landY: number;
  topLevel: number;
  peakY: number;
  topAreaCheck: number;
  bottomAreaCheck: number;
}

const XS: number[] = [];
for (let x = -W_MAX - 6; x <= W_MAX + 6; x += 2) XS.push(x);

export function sandFrame(pIn: number): SandFrame {
  const p = Math.min(1, Math.max(0, pIn));
  const topTarget = (1 - p) * SAND_TOTAL;
  const botTarget = p * SAND_TOTAL;
  const D = D_IDLE + (D_MAX - D_IDLE) * smoothstep(0, 0.05, p);

  let top: string | null = null;
  let topSurf: string | null = null;
  let L = Y_NECK_A;
  let topAreaCheck = 0;
  if (topTarget > 0.5) {
    L = bisect((v) => topArea(v, D), topTarget, Y_TOP - D - 4, Y_NECK_A);
    topAreaCheck = topArea(L, D);
    const pts = XS.map((x) => `${f(CX + x)} ${f(L + D / (1 + (x / R_FUNNEL) ** 2))}`);
    topSurf = `M${pts.join(' L')}`;
    const xr = CX + XS[XS.length - 1];
    const xl = CX + XS[0];
    top = `${topSurf} L${f(xr)} ${Y_NECK_B} L${f(xl)} ${Y_NECK_B} Z`;
  }

  let bottom: string | null = null;
  let bottomSurf: string | null = null;
  let P = Y_BOT;
  let bottomAreaCheck = 0;
  if (botTarget > 0.5) {
    P = bisect(bottomArea, botTarget, Y_NECK_B - 40, Y_BOT);
    bottomAreaCheck = bottomArea(P);
    const pts = XS.map((x) => {
      const y = Math.min(Y_BOT + 3, P + K_SLOPE * (Math.sqrt(x * x + R_TIP * R_TIP) - R_TIP));
      return `${f(CX + x)} ${f(y)}`;
    });
    bottomSurf = `M${pts.join(' L')}`;
    const xr = CX + XS[XS.length - 1];
    const xl = CX + XS[0];
    bottom = `${bottomSurf} L${f(xr)} ${Y_BOT + 4} L${f(xl)} ${Y_BOT + 4} Z`;
  }

  return { top, topSurf, bottom, bottomSurf, landY: bottom ? P : Y_BOT, topLevel: L, peakY: P, topAreaCheck, bottomAreaCheck };
}

// ---- Static SVG markup ----------------------------------------------------
function curve(chamber: 'top' | 'bot', side: -1 | 1, frac: number, u0: number, u1: number, offset = 0): string {
  const pts: string[] = [];
  for (let i = 0; i <= 40; i++) {
    const u = u0 + ((u1 - u0) * i) / 40;
    const y = chamber === 'top' ? Y_TOP + u * CH : Y_BOT - u * CH;
    const x = CX + side * (innerHalfU(u) * frac + offset);
    pts.push(`${f(x)} ${f(y)}`);
  }
  return `M${pts.join(' L')}`;
}

type Attrs = Record<string, string | number>;

const SVG_NS = 'http://www.w3.org/2000/svg';

/** Build one SVG element from attributes and children (no markup strings). */
function s(tag: string, attrs: Attrs = {}, children: SVGElement[] = []): SVGElement {
  const el = document.createElementNS(SVG_NS, tag);
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, String(v));
  el.append(...children);
  return el;
}

const stops = (list: Array<[number, string, number?]>): SVGElement[] =>
  list.map(([offset, color, opacity]) =>
    s('stop', opacity === undefined ? { offset, 'stop-color': color } : { offset, 'stop-color': color, 'stop-opacity': opacity }),
  );

function rim(y: number, id: string): SVGElement[] {
  const x = CX - RIM_HALF;
  const w = RIM_HALF * 2;
  return [
    s('rect', { x, y, width: w, height: RIM_H, rx: 3.2, fill: `url(#rim-${id})`, stroke: 'rgba(226,236,248,0.62)', 'stroke-width': 0.9 }),
    s('rect', { x: x + 1.2, y: y + 1.2, width: w - 2.4, height: RIM_H - 2.4, rx: 2.4, fill: 'none', stroke: 'rgba(255,255,255,0.12)', 'stroke-width': 0.6 }),
    s('path', { d: `M${x + 5} ${y + 2.2} L${x + w * 0.68} ${y + 2.2}`, stroke: 'rgba(255,255,255,0.78)', 'stroke-width': 1, 'stroke-linecap': 'round' }),
    s('path', { d: `M${x + w * 0.76} ${y + 2.2} L${x + w * 0.84} ${y + 2.2}`, stroke: 'rgba(255,255,255,0.5)', 'stroke-width': 0.8, 'stroke-linecap': 'round' }),
    s('path', { d: `M${x + 4} ${y + RIM_H - 1.8} L${x + w - 4} ${y + RIM_H - 1.8}`, stroke: 'rgba(110,130,150,0.32)', 'stroke-width': 0.8, 'stroke-linecap': 'round' }),
  ];
}

function highlights(ch: 'top' | 'bot', id: string): SVGElement[] {
  const spotU = 0.13;
  const spotY = ch === 'top' ? Y_TOP + spotU * CH : Y_BOT - spotU * CH;
  const spotX = CX - innerHalfU(spotU) * 0.6;
  const line = { 'stroke-linecap': 'round', fill: 'none' };
  return [
    s('path', { d: curve(ch, -1, 0.8, 0.07, 0.6), stroke: `url(#hl-${id})`, 'stroke-width': 5.5, ...line, filter: `url(#soft-${id})`, opacity: 0.75 }),
    s('path', { d: curve(ch, -1, 1, 0.1, 0.5, 1.4), stroke: 'rgba(255,255,255,0.55)', 'stroke-width': 1.1, ...line }),
    s('path', { d: curve(ch, 1, 0.84, 0.18, 0.52), stroke: 'rgba(255,255,255,0.22)', 'stroke-width': 2.6, ...line, filter: `url(#soft-${id})` }),
    s('path', { d: curve(ch, 1, 1, 0.12, 0.42, 1.5), stroke: 'rgba(255,255,255,0.3)', 'stroke-width': 0.7, ...line }),
    s('path', { d: curve(ch, -1, 1, 0.78, 0.97, 1.6), stroke: 'rgba(255,255,255,0.45)', 'stroke-width': 0.8, ...line }),
    s('ellipse', {
      cx: f(spotX), cy: f(spotY), rx: 2.6, ry: 6,
      transform: `rotate(${ch === 'top' ? 28 : -28} ${f(spotX)} ${f(spotY)})`,
      fill: 'rgba(255,255,255,0.7)', filter: `url(#soft-${id})`,
    }),
  ];
}

/** Full static SVG body as DOM nodes. `id` makes defs unique per instance. */
export function hourglassSVG(id: string, grainHref: string): SVGElement[] {
  const xl = CX - W_MAX - GLASS;
  const xr = CX + W_MAX + GLASS;
  const glassBlue = 'rgb(214,228,242)';
  const sandLayer = (cls: string, k: string, shade: string, lineOpacity: number): SVGElement =>
    s('g', { class: cls }, [
      s('path', { 'data-k': `${k}S`, fill: `url(#sand-${id})` }),
      s('path', { 'data-k': `${k}H`, fill: `url(#${shade}-${id})` }),
      s('path', { 'data-k': `${k}G`, fill: `url(#grain-${id})`, opacity: 0.7 }),
      s('path', { 'data-k': `${k}L`, fill: 'none', stroke: '#ffe3a3', 'stroke-opacity': lineOpacity, 'stroke-width': 0.9 }),
    ]);

  return [
    s('defs', {}, [
      s('clipPath', { id: `clip-${id}` }, [s('path', { d: INNER_PATH })]),
      s('linearGradient', { id: `glass-${id}`, gradientUnits: 'userSpaceOnUse', x1: xl, y1: 0, x2: xr, y2: 0 }, stops([
        [0, glassBlue, 0.24], [0.16, glassBlue, 0.07], [0.5, glassBlue, 0.025], [0.84, glassBlue, 0.07], [1, glassBlue, 0.2],
      ])),
      s('linearGradient', { id: `sheen-${id}`, gradientUnits: 'userSpaceOnUse', x1: xl, y1: 0, x2: xr, y2: 0 }, stops([
        [0, '#fff', 0.3], [0.1, '#fff', 0.08], [0.28, '#fff', 0], [0.74, '#fff', 0], [0.92, '#fff', 0.06], [1, '#fff', 0.2],
      ])),
      s('linearGradient', { id: `sand-${id}`, gradientUnits: 'userSpaceOnUse', x1: CX - W_MAX, y1: 0, x2: CX + W_MAX, y2: 0 }, stops([
        [0, '#a5621a'], [0.2, '#d4912f'], [0.42, '#f0bb58'], [0.55, '#f5c666'], [0.78, '#dc9b3a'], [1, '#9c5b17'],
      ])),
      s('linearGradient', { id: `shadeT-${id}`, x1: 0, y1: 0, x2: 0, y2: 1 }, stops([
        [0, '#fff1c8', 0.45], [0.18, '#fff1c8', 0], [0.7, '#5a2e08', 0.12], [1, '#4a2405', 0.42],
      ])),
      s('linearGradient', { id: `shadeB-${id}`, x1: 0, y1: 0, x2: 0, y2: 1 }, stops([
        [0, '#fff1c8', 0.5], [0.3, '#fff1c8', 0], [0.75, '#5a2e08', 0.12], [1, '#4a2405', 0.38],
      ])),
      s('linearGradient', { id: `rim-${id}`, x1: 0, y1: 0, x2: 0, y2: 1 }, stops([
        [0, '#fff', 0.46], [0.45, glassBlue, 0.16], [1, glassBlue, 0.32],
      ])),
      s('linearGradient', { id: `hl-${id}`, x1: 0, y1: 0, x2: 0, y2: 1 }, stops([
        [0, '#fff', 0], [0.25, '#fff', 0.85], [0.7, '#fff', 0.5], [1, '#fff', 0],
      ])),
      s('radialGradient', { id: `shadow-${id}`, cx: 0.5, cy: 0.5, r: 0.5 }, stops([
        [0, '#000', 0.32], [1, '#000', 0],
      ])),
      s('pattern', { id: `grain-${id}`, patternUnits: 'userSpaceOnUse', width: 32, height: 32 }, [
        s('image', { href: grainHref, width: 32, height: 32, preserveAspectRatio: 'none' }),
      ]),
      s('filter', { id: `soft-${id}`, x: '-50%', y: '-50%', width: '200%', height: '200%' }, [
        s('feGaussianBlur', { stdDeviation: 0.9 }),
      ]),
    ]),

    s('ellipse', { cx: CX, cy: Y_BOT + 2 + RIM_H + 4, rx: 74, ry: 5, fill: `url(#shadow-${id})` }),
    s('path', { d: OUTER_PATH, fill: `url(#glass-${id})` }),

    s('g', { 'clip-path': `url(#clip-${id})` }, [
      sandLayer('sand-top', 't', 'shadeT', 0.55),
      sandLayer('sand-bot', 'b', 'shadeB', 0.6),
      s('g', { 'data-k': 'stream', style: 'display:none' }, [
        s('line', { 'data-k': 's1', x1: CX, x2: CX, stroke: '#d8962f', 'stroke-width': 1.7, 'stroke-linecap': 'round' }),
        s('line', { 'data-k': 's2', x1: CX - 0.25, x2: CX - 0.25, stroke: '#ffe0a0', 'stroke-opacity': 0.85, 'stroke-width': 0.9, 'stroke-dasharray': '0.6 2.2' }),
        s('line', { 'data-k': 's3', x1: CX + 0.35, x2: CX + 0.35, stroke: '#8a4f12', 'stroke-opacity': 0.7, 'stroke-width': 0.8, 'stroke-dasharray': '0.5 3.1' }),
        s('circle', { 'data-k': 'g1', r: 0.75, fill: '#f2c063' }),
        s('circle', { 'data-k': 'g2', r: 0.6, fill: '#c9852a' }),
        s('circle', { 'data-k': 'g3', r: 0.7, fill: '#f6cf7a' }),
      ]),
    ]),

    s('path', { d: `${OUTER_PATH} ${INNER_PATH}`, 'fill-rule': 'evenodd', fill: 'rgba(235,244,255,0.1)' }),
    s('path', { d: INNER_PATH, fill: `url(#sheen-${id})` }),
    s('path', { d: OUTER_PATH, fill: 'none', stroke: 'rgba(196,214,232,0.62)', 'stroke-width': 1.05 }),
    s('path', { d: INNER_PATH, fill: 'none', stroke: 'rgba(255,255,255,0.2)', 'stroke-width': 0.6 }),
    ...highlights('top', id),
    ...highlights('bot', id),
    ...rim(Y_TOP - 2 - RIM_H, id),
    ...rim(Y_BOT + 2, id),
  ];
}
