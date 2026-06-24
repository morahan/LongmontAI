import { C, bg, footer, kicker, rule, text, title } from "./theme.mjs";

export async function slide01(presentation, ctx) {
  const slide = presentation.slides.add();
  bg(slide, ctx, C.orange);
  kicker(slide, ctx, "June 24 briefing", 72, 58, C.orange);

  title(
    slide,
    ctx,
    "Routing the Fallout",
    "The frontier is no longer just model quality. It is access, cost, workflow design, and proof.",
    92,
    154,
    900,
  );

  rule(slide, ctx, 94, 414, 150, C.orange);
  text(
    slide,
    ctx,
    "Use the best model you can justify. Route everything else. Verify before it leaves the building.",
    94,
    456,
    780,
    72,
    { size: 32, color: C.ink, bold: true, title: true },
  );

  text(slide, ctx, "Fable 5  •  token maxxing  •  GLM routing  •  deep verification", 96, 604, 900, 30, {
    size: 20,
    color: C.muted,
  });

  footer(slide, ctx, "Visual briefing", 1);
  return slide;
}
