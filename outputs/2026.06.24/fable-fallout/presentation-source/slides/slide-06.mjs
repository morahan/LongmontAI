import { C, assets, bg, footer, imageFrame, kicker, title } from "./theme.mjs";

export async function slide06(presentation, ctx) {
  const slide = presentation.slides.add();
  bg(slide, ctx, C.green);
  kicker(slide, ctx, "Deep verification", 72, 54, C.green);

  title(
    slide,
    ctx,
    "Verification becomes a workflow.",
    "The harness checks claims, sources, and decisions separately.",
    72,
    100,
    900,
  );

  await imageFrame(slide, ctx, assets.deepVerification, 150, 292, 980, 330, {
    alt: "Deep verification workflow diagram",
  });

  footer(slide, ctx, "Deep verification diagram", 6);
  return slide;
}
