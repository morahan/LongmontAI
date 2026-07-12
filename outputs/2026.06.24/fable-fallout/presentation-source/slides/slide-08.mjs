import { C, assets, bg, footer, imageFrame, kicker, title } from "./theme.mjs";

export async function slide08(presentation, ctx) {
  const slide = presentation.slides.add();
  bg(slide, ctx, C.green);
  kicker(slide, ctx, "Proof", 72, 54, C.green);

  title(
    slide,
    ctx,
    "Proof before publish.",
    "A finished AI task should show what ran, what passed, what changed, and what it cost.",
    72,
    104,
    860,
  );

  await imageFrame(slide, ctx, assets.goal, 380, 302, 520, 320, {
    alt: "Goal achieved verification screenshot",
  });

  footer(slide, ctx, "Goal Achieved screenshot", 8);
  return slide;
}
