export const C = {
  bg: "#07090D",
  panel: "#101620",
  line: "#253142",
  ink: "#F8FAFC",
  muted: "#A9B4C3",
  dim: "#64748B",
  cyan: "#42D9EA",
  orange: "#FF7A59",
  green: "#37D99E",
  yellow: "#F5C86A",
  white: "#FFFFFF",
};

export const assets = {
  intelligence: "outputs/manual-20260624-fable/presentations/fable-fallout/assets/intelligence-cost-collapse.jpg",
  fable: "outputs/manual-20260624-fable/presentations/fable-fallout/assets/fable5-agentic-coding.png",
  tokens: "outputs/manual-20260624-fable/presentations/fable-fallout/assets/agentic-workflows-cost-more.png",
  workflows: "outputs/manual-20260624-fable/presentations/fable-fallout/assets/six-workflow-patterns.png",
  deepVerification: "outputs/manual-20260624-fable/presentations/fable-fallout/assets/deep-verification-workflow.png",
  goal: "outputs/manual-20260624-fable/presentations/fable-fallout/assets/goal-achieved-verification.png",
};

export function bg(slide, ctx, color = C.cyan) {
  ctx.addShape(slide, { x: 0, y: 0, w: 1280, h: 720, fill: C.bg, line: ctx.line("transparent", 0) });
  ctx.addShape(slide, { x: 0, y: 0, w: 1280, h: 8, fill: color, line: ctx.line("transparent", 0) });
}

export function text(slide, ctx, body, x, y, w, h, opts = {}) {
  return ctx.addText(slide, {
    text: body,
    x, y, w, h,
    fontSize: opts.size ?? 26,
    color: opts.color ?? C.ink,
    bold: opts.bold ?? false,
    typeface: opts.face ?? (opts.title ? ctx.fonts.title : ctx.fonts.body),
    align: opts.align ?? "left",
    valign: opts.valign ?? "top",
    insets: opts.insets ?? { left: 0, right: 0, top: 0, bottom: 0 },
    fill: opts.fill ?? "transparent",
    line: opts.line ?? ctx.line("transparent", 0),
  });
}

export function kicker(slide, ctx, label, x = 72, y = 56, color = C.cyan) {
  ctx.addShape(slide, { x, y: y + 12, w: 42, h: 3, fill: color, line: ctx.line("transparent", 0) });
  text(slide, ctx, label.toUpperCase(), x + 58, y, 600, 26, {
    size: 13,
    color: C.muted,
    face: ctx.fonts.mono,
    bold: true,
  });
}

export function title(slide, ctx, headline, support, x = 72, y = 112, w = 820) {
  text(slide, ctx, headline, x, y, w, 118, { size: 52, bold: true, title: true });
  if (support) {
    text(slide, ctx, support, x + 2, y + 132, Math.min(w, 780), 60, { size: 22, color: C.muted });
  }
}

export function rule(slide, ctx, x, y, w, color = C.cyan) {
  ctx.addShape(slide, { x, y, w, h: 3, fill: color, line: ctx.line("transparent", 0) });
}

export function panel(slide, ctx, x, y, w, h, fill = C.panel) {
  ctx.addShape(slide, { x, y, w, h, fill, line: ctx.line(C.line, 1) });
}

export async function imageFrame(slide, ctx, path, x, y, w, h, opts = {}) {
  panel(slide, ctx, x, y, w, h, opts.fill ?? C.panel);
  await ctx.addImage(slide, {
    path,
    x: x + 18,
    y: y + 18,
    w: w - 36,
    h: h - 36,
    fit: opts.fit ?? "contain",
    alt: opts.alt ?? "",
  });
}

export function footer(slide, ctx, label, n) {
  text(slide, ctx, label, 72, 682, 760, 18, { size: 10, color: C.dim, face: ctx.fonts.mono });
  text(slide, ctx, String(n).padStart(2, "0"), 1160, 682, 48, 18, {
    size: 10,
    color: C.dim,
    face: ctx.fonts.mono,
    align: "right",
  });
}
