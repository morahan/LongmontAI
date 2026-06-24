# Longmont AI · Brand Assets

Everything you need for the website, social channels, and pitch decks lives here. SVGs are the source of truth — PNGs are pre-rendered for convenience and ready to upload.

Open `guidelines/index.html` in a browser for the full visual brand guide.

## Layout

```
public/brand/
├── source/      Original AI-generated artwork & high-res master
├── logo/        Wordmark + parrot mark (SVG, PNG, WebM)
├── favicon/     All favicon sizes + manifest + <head> snippet
├── social/      OG image, banners, avatars per platform
├── deck/        1920×1080 pitch deck slide masters
├── palette/     Color tokens (CSS / JSON / Tailwind / SVG sheet)
└── guidelines/  Single-page HTML brand guide
```

## Logo system

The mark is a stylized cubist parrot that doubles as the letter **I** in the wordmark. It always sits at cap height, baseline-aligned with the text.

| File | Use |
|---|---|
| `logo/wordmark-horizontal-color.svg` | Default lockup, light backgrounds |
| `logo/wordmark-horizontal-on-dark.svg` | Default lockup, dark backgrounds |
| `logo/wordmark-stacked-color.svg` | Square / portrait spaces, has tagline |
| `logo/wordmark-horizontal-mono-dark.svg` | Single-color print, dark on light |
| `logo/wordmark-horizontal-mono-light.svg` | Single-color print, light on dark |
| `logo/parrot-color.svg` | Mark only — when wordmark won't fit |
| `logo/parrot-mono-dark.svg` | Mark only — single-color dark |
| `logo/parrot-mono-light.svg` | Mark only — single-color light |
| `logo/parrot-single-sunset.svg` | Mark only — single-color brand orange |
| `logo/logo-animated.webm` | Web-optimized motion logo (~640 KB) |
| `logo/logo-animated-512.mp4` | MP4 fallback (~410 KB) |
| `logo/logo-animated-poster.png` | Poster frame for video tags |

## Favicon

Drop `favicon/HEAD-SNIPPET.html` into `<head>` of `index.html`. All sizes are pre-generated:

- `favicon.ico` — multi-resolution (16/32/48)
- `favicon-16.png`, `favicon-32.png`, `favicon-48.png`
- `apple-touch-icon.png` (180×180)
- `android-chrome-192.png`, `android-chrome-512.png`
- `favicon-mark.svg` — modern browsers (preferred)
- `favicon-mark-mono.svg` — Safari pinned tab
- `site.webmanifest`

## Social

| Platform | Asset | Size |
|---|---|---|
| OG / Twitter card | `og-image.png` | 1200 × 630 |
| X / Twitter header | `twitter-header.png` | 1500 × 500 |
| LinkedIn banner | `linkedin-banner.png` | 1584 × 396 |
| YouTube channel | `youtube-banner.png` | 2560 × 1440 |
| Facebook cover | `facebook-cover.png` | 820 × 312 |
| Avatar (square, circle-safe) | `avatar-1080.png` | 1080 × 1080 |
| Avatar small | `avatar-400.png`, `avatar-300.png` | for older platforms |

## Pitch deck

Four 1920×1080 master slides in `deck/`. Import the PNG (or SVG) as a slide background in Keynote / Google Slides / PowerPoint, then layer your editable text on top of the `{{ placeholders }}`:

- `slide-cover.png` — title slide with eyebrow, headline, speaker
- `slide-section.png` — section divider
- `slide-content.png` — header bar + body region for talks
- `slide-closing.png` — thank-you / call-to-action

## Color palette

One palette, sourced from the running site (`src/index.css`). Use these tokens in any brand asset — slides, social cards, OG images, deck PNGs, printed merch. Don't invent new shades.

### Surfaces — Zinc dark glass
| Token | Hex | Role |
|---|---|---|
| `--la-bg-deep` | `#09090b` | Page background (Zinc 950). Default canvas. |
| `--la-bg-card` | `#18181b` | Cards, panels, glass surfaces (Zinc 900). |
| `--la-bg-card-hover` | `#27272a` | Card hover state (Zinc 800). |

### Accents — vibrant editorial
| Token | Hex | Role |
|---|---|---|
| `--la-sunset` | `#FF9E64` | Warm orange highlight — eyebrow accents, hero type. |
| `--la-pink` | `#FF0080` | Magenta — gradient stop, callouts. |
| `--la-purple` | `#7928CA` | Primary gradient stop, card hover glow, focus rings. |
| `--la-cyan` | `#00F0FF` | Editorial energy — sparkles, AI-Generated-Art eyebrows. |
| `--la-blue` | `#007CF0` | UI chrome — links, primary CTAs. |

### Text
| Token | Hex | Role |
|---|---|---|
| `--la-text-primary` | `#FFFFFF` | Headlines, body. |
| `--la-text-secondary` | `#A1A1AA` | Muted body, captions (Zinc 400). |
| `--la-text-muted` | `#71717A` | Metadata, timestamps, footer copyright (Zinc 500). |

### Glass
| Token | Value | Role |
|---|---|---|
| `--la-glass-bg` | `rgba(24, 24, 27, 0.7)` | Translucent panel background. |
| `--la-glass-border` | `rgba(255, 255, 255, 0.08)` | Hairline borders. |
| `--la-glass-highlight` | `rgba(255, 255, 255, 0.15)` | Top-edge highlight. |

### Gradients
| Token | Definition | Used for |
|---|---|---|
| `--la-grad-vibrant` | `linear-gradient(to right, #007CF0 0%, #7928CA 50%, #FF0080 100%)` | Hero headline "Unleashed", signature brand gradient. |
| `--la-grad-blue-purple` | `linear-gradient(to right, #007CF0, #7928CA)` | Secondary accents. |
| `--la-grad-cyan-purple` | `linear-gradient(135deg, #00F0FF, #7928CA)` | Cool mix. |
| `--la-grad-sunset-pink` | `linear-gradient(135deg, #FF9E64, #FF0080)` | Warm mix. |

### Semantic aliases
| Token | Resolves to | When to reach for it |
|---|---|---|
| `--la-bg` | `--la-bg-deep` | Page background. |
| `--la-fg` | `--la-text-primary` | Body text. |
| `--la-fg-muted` | `--la-text-secondary` | Secondary text. |
| `--la-accent` | `--la-cyan` | Editorial energy (eyebrows, sparkles). |
| `--la-accent-ui` | `--la-blue` | UI chrome (links, buttons). |
| `--la-link` | `--la-blue` | Hyperlinks. |

### Which accent for what
Two cyans look similar but pull in different directions — pick deliberately:
- **`--la-cyan` (`#00F0FF`)** — for *content energy*. Hero eyebrow ("AI-GENERATED ART"), sparkles icon, gradient text. Reads as "AI / future."
- **`--la-blue` (`#007CF0`)** — for *UI chrome*. Nav links, the Countdown pill border, info banners. Reads as "trustworthy link."

Token files: `palette/colors.css` (CSS vars), `palette/colors.json`, `palette/tailwind.snippet.ts`. Visual reference: `palette/palette.svg` / `.png`.

## Wiring it into the site

```html
<!-- In index.html <head> -->
<link rel="stylesheet" href="/brand/palette/colors.css" />
<!-- ...then drop in the tags from /brand/favicon/HEAD-SNIPPET.html -->
<meta property="og:image" content="https://longmontai.com/brand/social/og-image.png" />
<meta property="og:image:width" content="1200" />
<meta property="og:image:height" content="630" />
<meta name="twitter:card" content="summary_large_image" />
<meta name="twitter:image" content="https://longmontai.com/brand/social/og-image.png" />
```

## Regenerating assets

The SVGs are the source. To regenerate the PNGs after editing an SVG:

```bash
# Single asset
magick -background none -density 200 logo/wordmark-horizontal-color.svg \
  logo/wordmark-horizontal-color-preview.png

# Favicon set
cd favicon && \
  for size in 16 32 48 180 192 512; do
    magick -background none -density 600 favicon-mark.svg -resize ${size}x${size} \
      "favicon-${size}.png"
  done && \
  magick favicon-16.png favicon-32.png favicon-48.png favicon.ico
```

## Source artwork

The original AI-generated artwork (parrot, 5s, 624×624) lives in `source/logo-original.mp4`. A still master at `source/logo-master-frame.png` and a Lanczos-upscaled `source/logo-master-2048.png` are available for any pixel work that wants the original cubist rendering rather than the simplified vector mark.
