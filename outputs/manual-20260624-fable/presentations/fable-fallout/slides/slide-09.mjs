import { C, bg, footer, kicker, rule, text, title } from "./theme.mjs";

export async function slide09(presentation, ctx) {
  const slide = presentation.slides.add();
  bg(slide, ctx, C.orange);
  kicker(slide, ctx, "Cursor + SpaceX", 72, 54, C.orange);

  title(
    slide,
    ctx,
    "Coding tools are becoming infrastructure bets.",
    "Reporting framed SpaceX's Cursor move as a $60B all-stock acquisition agreement, with compute as the strategic prize.",
    72,
    112,
    940,
  );

  rule(slide, ctx, 78, 394, 130, C.orange);
  text(slide, ctx, "The product is not just the editor.", 78, 438, 720, 48, {
    size: 38,
    bold: true,
    title: true,
  });
  text(slide, ctx, "It is the model lane, the GPU lane, and the workflow lane behind it.", 80, 508, 720, 54, {
    size: 30,
    color: C.muted,
    bold: true,
  });

  footer(slide, ctx, "Times of India June 17 + MarketWatch June 19", 9);
  return slide;
}
