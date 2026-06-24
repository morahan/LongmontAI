import { C, bg, footer, kicker, panel, text, title } from "./theme.mjs";

function lane(slide, ctx, x, label, body, color) {
  panel(slide, ctx, x, 340, 244, 150);
  text(slide, ctx, label, x + 28, 374, 188, 40, {
    size: 30,
    color,
    bold: true,
    title: true,
    align: "center",
  });
  text(slide, ctx, body, x + 30, 434, 184, 46, {
    size: 19,
    color: C.muted,
    align: "center",
  });
}

export async function slide07(presentation, ctx) {
  const slide = presentation.slides.add();
  bg(slide, ctx, C.cyan);
  kicker(slide, ctx, "GLM local / cloud inference", 72, 54, C.cyan);

  title(
    slide,
    ctx,
    "Route the model, not the belief.",
    "GLM is a lane to evaluate. Frontier APIs are another. The harness chooses the job.",
    72,
    112,
    880,
  );

  lane(slide, ctx, 74, "Classify", "cheap and fast", C.cyan);
  lane(slide, ctx, 368, "Research", "GLM lane", C.green);
  lane(slide, ctx, 662, "Synthesize", "frontier when worth it", C.orange);
  lane(slide, ctx, 956, "Verify", "adversarial checks", C.yellow);

  text(slide, ctx, "Cloud first for comparison. Local when the workload repeats or the data matters.", 172, 560, 930, 38, {
    size: 28,
    color: C.ink,
    bold: true,
    align: "center",
  });

  footer(slide, ctx, "GLM routing action step", 7);
  return slide;
}
