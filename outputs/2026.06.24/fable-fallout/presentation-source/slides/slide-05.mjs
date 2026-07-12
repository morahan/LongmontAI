import { C, assets, bg, footer, imageFrame, kicker, title } from "./theme.mjs";

export async function slide05(presentation, ctx) {
  const slide = presentation.slides.add();
  bg(slide, ctx, C.green);
  kicker(slide, ctx, "Harnesses", 72, 54, C.green);

  title(
    slide,
    ctx,
    "The workflow is the product surface.",
    "Classify, fan out, verify, filter, compete, and loop only until the stop condition is real.",
    72,
    100,
    900,
  );

  await imageFrame(slide, ctx, assets.workflows, 140, 308, 1000, 306, {
    alt: "Six workflow patterns",
  });

  footer(slide, ctx, "Six workflow patterns diagram", 5);
  return slide;
}
