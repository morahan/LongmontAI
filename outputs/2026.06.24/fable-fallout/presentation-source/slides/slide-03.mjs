import { C, assets, bg, footer, imageFrame, kicker, title } from "./theme.mjs";

export async function slide03(presentation, ctx) {
  const slide = presentation.slides.add();
  bg(slide, ctx, C.cyan);
  kicker(slide, ctx, "Token maxxing", 72, 54, C.cyan);

  title(
    slide,
    ctx,
    "Work got hungrier.",
    "Agents can turn cheaper tokens into a larger total task bill.",
    72,
    100,
    820,
  );

  await imageFrame(slide, ctx, assets.tokens, 150, 294, 980, 300, {
    alt: "Agentic workflow token cost diagram",
  });

  footer(slide, ctx, "Token-maxxing diagram", 3);
  return slide;
}
