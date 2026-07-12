import { C, assets, bg, footer, imageFrame, kicker, text, title } from "./theme.mjs";

export async function slide04(presentation, ctx) {
  const slide = presentation.slides.add();
  bg(slide, ctx, C.orange);
  kicker(slide, ctx, "Access", 72, 54, C.orange);

  title(
    slide,
    ctx,
    "A top model can become a fragile dependency.",
    "Access changes should be a routing event, not a system failure.",
    72,
    100,
    920,
  );

  await imageFrame(slide, ctx, assets.fable, 140, 318, 1000, 286, {
    alt: "Fable 5 agentic coding benchmark screenshot",
  });

  text(slide, ctx, "Keep it portable.", 72, 622, 420, 34, {
    size: 30,
    color: C.ink,
    bold: true,
    title: true,
  });

  footer(slide, ctx, "Fable 5 screenshot", 4);
  return slide;
}
