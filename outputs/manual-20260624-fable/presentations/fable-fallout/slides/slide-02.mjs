import { C, assets, bg, footer, imageFrame, kicker, text, title } from "./theme.mjs";

export async function slide02(presentation, ctx) {
  const slide = presentation.slides.add();
  bg(slide, ctx, C.cyan);
  kicker(slide, ctx, "The big picture", 72, 54, C.cyan);

  title(
    slide,
    ctx,
    "Inference got cheaper.",
    "The baseline cost collapse is the starting point for the story.",
    72,
    100,
    820,
  );

  await imageFrame(slide, ctx, assets.intelligence, 270, 280, 740, 350, {
    alt: "Cost of intelligence collapse chart",
  });

  footer(slide, ctx, "Stanford AI Index screenshot", 2);
  return slide;
}
