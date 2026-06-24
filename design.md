# Longmont AI — Design System

> **Live site:** https://longmontai.com
> **Repo:** `/Users/msfm/Creations/Coding/LongmontAI`
> **Audience:** Designers, developers, and contributors touching the Longmont AI meetup site, brand, or pitch materials.
> **Source of truth:** this file. Implementation lives in `src/index.css` + `public/brand/`.

---

## 1. Brand essence

**Longmont AI** is a Colorado-based community of AI-curious people who meet to cut through the noise. The brand has to do three things at once:

1. **Signal "AI"** without leaning on tired cliches (no circuit-board wallpaper, no robot heads, no glowing brains unless they're intentional).
2. **Feel like a local meetup** — warm, approachable, a little playful. The parrot mark is the proof of that.
3. **Read as editorial** — every weekly edition is a curated briefing, so the visual language borrows from longform publication design: serif display type, generous spacing, restrained chrome.

The tension between **futuristic minimalism** (dark UI, glass panels, gradient text) and **warm editorial craft** (serif display, the cubist parrot) is the brand. Don't resolve it — preserve it.

### Voice
- Headlines: confident, short, a little bit opinionated. ("Intelligence Unleashed", "The Agent Economy Gets Real".)
- Body: clear, plain English, no jargon for jargon's sake.
- Tagline (footer): *"Curated insights into the rapidly evolving world of AI."*
- Sign-off: *"Curated by Intelligence."*

---

## 2. The mark

### 2.1 What it is
A **stylized cubist parrot** that doubles as the letter **I** in the wordmark. It always sits at cap height, baseline-aligned with the surrounding text. The parrot is also the friendly wink at Longmont — the town's name is famously debated (Longmont vs. "Lonmont"), and the parrot is a callback to local character.

### 2.2 Construction
- **Mark only height:** matches cap height of the wordmark.
- **Alignment:** the parrot's "feet" sit on the baseline of the text; its head never crosses the cap line.
- **Stroke language:** the simplified vector parrot uses flat color planes (no gradients, no outlines).
- **Source artwork:** `public/brand/source/logo-original.mp4` is the AI-generated original (5s, 624×624). `logo-master-frame.png` and `logo-master-2048.png` are the stills used for any pixel-perfect need.

### 2.3 Logo lockups
| File | When to use |
|---|---|
| `public/brand/logo/wordmark-horizontal-color.svg` | **Default.** Light backgrounds. |
| `public/brand/logo/wordmark-horizontal-on-dark.svg` | Default on dark backgrounds (this is what the site uses). |
| `public/brand/logo/wordmark-stacked-color.svg` | Square / portrait slots, has the tagline. |
| `public/brand/logo/wordmark-horizontal-mono-dark.svg` | Single-color print, dark on light. |
| `public/brand/logo/wordmark-horizontal-mono-light.svg` | Single-color print, light on dark. |
| `public/brand/logo/parrot-color.svg` | Mark only — when the wordmark won't fit (favicons, avatars). |
| `public/brand/logo/parrot-mono-dark.svg` | Mark only, single-color dark. |
| `public/brand/logo/parrot-mono-light.svg` | Mark only, single-color light. |
| `public/brand/logo/parrot-single-sunset.svg` | Mark only, single-color brand orange. |

### 2.4 Animated logo
- `logo-animated.webm` — primary motion logo (~640 KB), web-optimized.
- `logo-animated-512.mp4` — MP4 fallback (~410 KB).
- `logo-animated-poster.png` — poster frame for `<video poster="...">`.

Use the animated mark on the **landing hero** and in **slide intros**. Never autoplay with sound.

### 2.5 Clear space & sizing
- **Clear space:** equal to the cap height of the wordmark on all four sides.
- **Minimum width:** 96 px for the horizontal lockup, 24 px for the mark alone.
- **Don't:** rotate, recolor outside the approved palette, add drop shadows, outline the parrot, or stretch non-uniformly.

---

## 3. Color

**One palette. The running site is the source of truth — every token ships 1:1 from `src/index.css` to `public/brand/palette/colors.css` to the standalone HTML guidelines.** No diverging sets.

### 3.1 Surfaces — Zinc dark glass
| Token | Hex | Role |
|---|---|---|
| `--bg-deep` | `#09090b` | Page background (Zinc 950). The default canvas. |
| `--bg-card` | `#18181b` | Cards, panels, glass surfaces (Zinc 900). |
| `--bg-card-hover` | `#27272a` | Card hover state (Zinc 800). |

### 3.2 Accents — vibrant editorial
| Token | Hex | Role |
|---|---|---|
| `--color-sunset` | `#FF9E64` | Warm orange highlight — eyebrow accents, hero type. |
| `--color-pink` | `#FF0080` | Magenta — gradient stop, callouts. |
| `--color-purple` | `#7928CA` | Primary gradient stop, card hover glow. |
| `--color-cyan` | `#00F0FF` | Editorial energy — sparkles, AI-Generated-Art eyebrows. |
| `--color-blue` | `#007CF0` | UI chrome — links, primary CTAs. |

### 3.3 Text
| Token | Hex | Role |
|---|---|---|
| `--text-primary` | `#FFFFFF` | Headlines, body. |
| `--text-secondary` | `#A1A1AA` | Muted body, captions (Zinc 400). |
| `--text-muted` | `#71717A` | Metadata, timestamps, footer copyright (Zinc 500). |

### 3.4 Glass
| Token | Value | Role |
|---|---|---|
| `--glass-bg` | `rgba(24, 24, 27, 0.7)` | Translucent panel background. |
| `--glass-border` | `rgba(255, 255, 255, 0.08)` | Hairline borders. |
| `--glass-highlight` | `rgba(255, 255, 255, 0.15)` | Top-edge highlight. |

### 3.5 Semantic mapping
| Use | Token |
|---|---|
| Page background | `--bg-deep` |
| Card / panel | `--bg-card` |
| Card hover / lift | `--bg-card-hover` + purple border tint |
| Body text | `--text-primary` |
| Muted body, captions | `--text-secondary` |
| Metadata, timestamps | `--text-muted` |
| Hero eyebrow, sparkles icon | `--color-cyan` |
| Nav links, Countdown pill border, info banners | `--accent-cyan` (alias for `--color-blue`) |
| Gradient text | `--color-blue` → `--color-purple` → `--color-pink` |

### 3.6 Two cyans — pick deliberately
The codebase has two blue-leaning accents that read very differently. Don't mix them up.

| Token | Hex | Use |
|---|---|---|
| `--color-cyan` | `#00F0FF` | **Editorial energy.** Hero eyebrow ("AI-GENERATED ART"), sparkles icon, gradient text. Reads as "AI / future." |
| `--accent-cyan` (alias of `--color-blue`) | `#007CF0` | **UI chrome.** Nav links, the Countdown pill border, info banners. Reads as "trustworthy link." |

Rule of thumb: **content energy → `#00F0FF`**, **UI chrome → `#007CF0`**.

> Note: the alias `--accent-cyan` is wired to `#007CF0` in the brand token export. The legacy Tailwind-blue `#3b82f6` you may see in older CSS one-offs is deprecated — replace it with `--accent-cyan` / `--color-blue`.

### 3.7 Gradients
```css
/* Vibrant editorial gradient — hero headline "Unleashed" */
.text-gradient-vibrant {
  background: linear-gradient(to right,
    var(--color-blue),    /* #007CF0 */
    var(--color-purple),  /* #7928CA */
    var(--color-pink));   /* #FF0080 */
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
}

/* Cool mix — secondary accents */
--la-grad-cyan-purple:  linear-gradient(135deg, #00F0FF, #7928CA);

/* Warm mix — callouts */
--la-grad-sunset-pink:  linear-gradient(135deg, #FF9E64, #FF0080);

/* Blue → purple — bridge */
--la-grad-blue-purple:  linear-gradient(to right, #007CF0, #7928CA);
```

### 3.8 Background atmosphere
The site uses a fixed, blurred radial-gradient mesh (`#bg-mesh`):
- Purple haze at 15% / 50% (`rgba(121, 40, 202, 0.08)`)
- Cyan haze at 85% / 30% (`rgba(0, 240, 255, 0.08)`)
- Subtle blue haze at 50% / 0% (`rgba(59, 130, 246, 0.05)`)
- All filtered with `blur(60px)`, behind every page.

**Don't fight it.** When adding new sections, keep them on a transparent / card surface — never a solid color that would clash with the mesh.

---

## 4. Typography

### 4.1 Font stack
| Role | Family | Weight |
|---|---|---|
| Display (`h1`–`h6`, hero, edition titles) | **Beleza**, serif | 700 |
| Body (paragraphs, UI labels) | **Beleza**, serif | 400 / 500 |
| Eyebrow labels, tags, mono metadata | **JetBrains Mono**, monospace | 400 / 500 |

Both fonts are loaded via `<link>` tags in `index.html`. **Beleza** is the voice of the brand — a high-contrast didone-influenced serif that gives the site its editorial feel. **JetBrains Mono** is reserved for technical / metadata moments ("AI-GENERATED ART", timestamps, the Countdown pill).

### 4.2 Base size
```css
:root { font-size: 19.2px; }  /* 20% larger than the 16px default */
@media (max-width: 760px) { :root { font-size: 17px; } }
```
The 20% bump is deliberate — it lets the hero lockup stay display-sized without dominating the viewport. **Don't override this** at the component level.

### 4.3 Scale (clamp-based, fluid)
| Class | Size | Use |
|---|---|---|
| `text-xs` | 0.75rem | Tag chips, micro labels |
| `text-sm` | 0.875rem | Body small, nav, footer |
| `text-base` | 1rem | Default body |
| `text-lg` | 1.125rem | Lead paragraphs |
| `text-xl` | 1.25rem | Subheads |
| `text-2xl` | `clamp(1.45rem, 4vw, 1.875rem)` | Card titles |
| `text-3xl` | `clamp(1.75rem, 6vw, 2.25rem)` | Section heads |
| `text-4xl` | `clamp(2.1rem, 8vw, 3rem)` | Page titles |
| `text-5xl` | `clamp(2.35rem, 10vw, 3.75rem)` | Large display |
| `text-6xl` | `clamp(2.6rem, 12vw, 4.5rem)` | Hero h1 |
| `text-7xl` | `clamp(3rem, 14vw, 5rem)` | Reserved for Countdown |
| `text-8xl` | `clamp(3.5rem, 16vw, 6rem)` | Reserved for Countdown |

### 4.4 Heading rules
- All `h1`–`h6`: `font-family: var(--font-display)`, `font-weight: 700`, `letter-spacing: -0.025em`.
- Hero `h1` uses `leading-tight` (1.15).
- Body uses `leading-relaxed` (1.65).

### 4.5 Voice in headlines
- **Sentence case** for headlines ("The Agent Economy Gets Real", "Intelligence Unleashed"). Not Title Case.
- **Eyebrow labels** (above hero h1) are uppercase, tracked, mono — e.g. `AI-GENERATED ART`. Always paired with the cyan sparkles icon.

---

## 5. Layout & spacing

### 5.1 Container
```css
.container {
  max-width: 1100px;       /* --container-width */
  margin: 0 auto;
  padding: 0 1.5rem;       /* mobile: 1rem */
  width: 100%;
}
```
- **Default content column:** 1100 px max.
- **Hero / featured feed:** 64 rem (`max-w-5xl`).
- **Article body:** narrower, ~42 rem (`max-w-2xl`).

### 5.2 Vertical rhythm
- Section gap: `mb-16` (4 rem) between major sections.
- Card grid gap: `gap-6` (1.5 rem).
- Inside a card: `p-6` to `p-8`.
- Hero section height: `60vh`, `min-h-[500px]`.

### 5.3 Spacing tokens (Tailwind-like)
The codebase uses a hand-rolled utility layer in `index.css`. Common values:

| Token | rem | px |
|---|---|---|
| `gap-1` | 0.25 | 4 |
| `gap-2` | 0.5 | 8 |
| `gap-3` | 0.75 | 12 |
| `gap-4` | 1 | 16 |
| `gap-6` | 1.5 | 24 |
| `gap-8` | 2 | 32 |
| `gap-10` | 2.5 | 40 |
| `gap-16` | 4 | 64 |

### 5.4 Responsive breakpoints
- **Mobile:** `< 760px` — single column, font shrinks to 17px, container padding to 1rem, nav compresses.
- **Tablet:** 760 px – 1024 px — generous spacing, two-column card grids.
- **Desktop:** `> 1024 px` — full layout, max-width 1100 px content column, hero at 60vh.

---

## 6. Components

### 6.1 Header (`<header>`, sticky)
- **Position:** `fixed top-0`, `z-50`, full width.
- **Height:** 4 rem on mobile (`h-16`), 5 rem on desktop (`sm:h-20`).
- **Surface:** `rgba(9, 9, 11, 0.8)` + `backdrop-filter: blur(12px)` (the `.header-glass` class). Subtle border-bottom using `--glass-border`.
- **Contents:** Logo mark (BrainCircuit icon in cyan, currently inline) + wordmark on the left, nav links on the right.
- **Nav items:** Blog (`/`), Countdown (`/countdown` — pill button with cyan border).
- **Transition:** 300 ms fade-in on scroll-class change.

### 6.2 Hero (Feed page only)
- 60vh tall (`min-h-[500px]`), `rounded-2xl`, overflow-hidden.
- Background: full-bleed hero image (`/images/hero/hero-1.png`, `/images/hero/hero-2.png`) on an 8s crossfade cycle with dot pagination bottom-right.
- Bottom-to-top gradient overlay: `from-[#09090b] via-[#09090b]/50 to-transparent` — guarantees readable type.
- **Content stack:** `Sparkles` icon + `AI-GENERATED ART` mono eyebrow → h1 "Intelligence **Unleashed**" (Unleashed uses `.text-gradient-vibrant`) → lead paragraph.
- All hero text appears with `motion.div` `delay: 0.3s, duration: 0.8s, ease: [0.16, 1, 0.3, 1]` (custom ease-out).

### 6.3 Cards / `.glass-panel`
The workhorse component. Defaults:
```css
background:    var(--bg-card);          /* #18181b */
border:        1px solid var(--glass-border);  /* rgba(255,255,255,0.08) */
border-radius: 16px;
box-shadow:    0 4px 6px -1px rgba(0,0,0,0.1), 0 2px 4px -1px rgba(0,0,0,0.06);
transition:    all 0.4s cubic-bezier(0.16, 1, 0.3, 1);
```
**Hover/focus-within state:**
- Background → `--bg-card-hover` (`#27272a`).
- Border → `rgba(121, 40, 202, 0.3)` (purple tint).
- Box-shadow → `0 0 30px rgba(121, 40, 202, 0.1)` (subtle purple glow).
- Transform → `translateY(-2px)` (lift).
- Focus-visible: 2 px solid `#818cf8` outline + 4 px glow.

### 6.4 Edition card (`EditionCard.tsx`)
- Built on `.glass-panel`.
- Date in `text-xs text-text-muted`, uppercase mono, top of card.
- Title in `font-bold`, sentence case.
- Optional dek (excerpt) in `text-sm text-text-secondary`, line-clamped to 2 or 3 lines.
- "Read more" affordance appears as a `Read full edition` link in the all-editions grid.

### 6.5 Buttons
Three flavors, no other variants:

| Flavor | Use | Look |
|---|---|---|
| **Link** | Default nav, in-card actions | Inherit color, hover lifts to `--text-primary`. |
| **Pill (cyan)** | `Countdown` nav, banner CTAs | `border: 1px solid cyan/40`, `bg: cyan/5`, `text: cyan`, hover → `cyan/15` background. |
| **Primary (solid)** | Reserved — use sparingly | `bg: cyan, color: black`. |

Don't introduce a fourth button style without updating this doc.

### 6.6 Eyebrow labels
- Always **uppercase**, **tracking-wider**, **mono** (`font-mono`), **text-xs** (0.75 rem).
- Color: `--accent-cyan` or `--color-cyan` (see §3.4).
- Always paired with a small leading icon (`Sparkles`, `BookOpen`, `Clock`, `BrainCircuit`).

### 6.7 Footer
- Top border using `--glass-border`, `bg-[#09090b]`, `py-12`.
- Three columns on desktop: brand + tagline · Quick Links · Connect.
- Brand block reuses the header mark (BrainCircuit in cyan tile) + wordmark.
- Bottom strip: `border-top`, `pt-6`, `text-text-muted text-sm text-center`, copyright + tagline `"Curated by Intelligence."`.

### 6.8 Skip link
First focusable element in `<body>`. Hidden by default, becomes a cyan bar on focus. Don't remove it — it's an accessibility requirement.

### 6.9 Countdown page (`/countdown`)
- Heavy use of `--color-cyan` and oversized type (`text-7xl` / `text-8xl`).
- Number roll animation (`@keyframes digit-roll`).
- Confetti rain on zero (`@keyframes confetti-fall`) — brand-colored only.
- Celebration pop at zero (`@keyframes celebration-pop`).

---

## 7. Iconography

Icons come from **Lucide React**. Use them at these sizes:

| Size | When |
|---|---|
| 12 px | Inline with 12 px body text (rare). |
| 14 px | Default nav icon. |
| 16 px | Default content icon (eyebrows, card meta). |
| 18 px | Header mark. |
| 20 px | Footer brand mark. |
| 24+ px | Hero / feature icons. |

Icons inherit color from `currentColor` — pair them with the right text color (cyan for energy, white for chrome, slate for muted).

---

## 8. Motion

### 8.1 Easing
- **Default UI transition:** `180 ms ease` (defined in `.transition-all`).
- **Page enter / hero fade:** `cubic-bezier(0.16, 1, 0.3, 1)` — a "spring-out" that decelerates hard. Use for any element entering the viewport.
- **Card hover:** `400 ms cubic-bezier(0.16, 1, 0.3, 1)`.

### 8.2 Page transitions
Every route change fades + lifts:
```tsx
<motion.div
  key={location.pathname}
  initial={{ opacity: 0, y: 20 }}
  animate={{ opacity: 1, y: 0 }}
  transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
/>
```

### 8.3 Hero crossfade
- 8 s auto-advance, 1 s opacity fade between slides, dot pagination reflects state.

### 8.4 Keyframes in the codebase
`shine` (gradient sweep), `digit-roll` (countdown digits), `confetti-fall` (countdown celebration), `fade-in`, `fade-in-delay`, `fade-in-late`, `scale-in`, `celebration-pop`, `flash-in-out`.

### 8.5 Rules
- **Respect `prefers-reduced-motion`.** Framer Motion does this automatically; CSS keyframes need a media query.
- **No autoplaying audio.**
- **Don't animate layout-triggering properties** (`width`, `height`, `top`, `left`). Animate `transform` and `opacity` only.

---

## 9. Information architecture

The site is intentionally small:

```
/                  Feed        — hero + latest 3 editions + all editions grid
/countdown         Countdown   — days/hours/minutes/seconds to next meetup
/edition/:id       Edition     — single article (Markdown from src/articles)
/tools             Tools       — stack used to build the site
/model-watch       Model Watch — source map for AI model updates
/about             Placeholder — keep the route, fill in later
```

Routes are defined in `src/App.tsx`. The footer exposes Home, Latest Edition, Model Watch, Tools Used, Meetup Page.

---

## 10. Content patterns

### 10.1 Hero copy
- **Eyebrow:** mono uppercase, cyan.
- **Headline:** serif display, gradient on the "punch" word.
- **Dek:** one sentence, max-width 36 rem, slate.

### 10.2 Edition card copy
- **Date:** ISO format `YYYY-MM-DD`, mono, muted.
- **Title:** sentence case, bold, serif.
- **Excerpt:** plain prose, line-clamped to 2 (featured) or 3 (grid).

### 10.3 Banner (Meetup CTA)
- Light cyan tint background (`cyan/10`), 1 px cyan/20 border, `rounded-lg`, centered single-line copy with inline link.

### 10.4 Tone rules
- First-person plural for the meetup ("Welcome to Longmont AI…").
- No exclamation points in headlines. One per page max in body copy.
- Don't apologize for being a meetup. The site is the publication, not the meetup — meetup logistics belong on the banner and the `Countdown` page.

---

## 11. Accessibility

- **Skip-to-main link** is the first focusable element.
- **Color contrast:** `--text-secondary` on `--bg-deep` = ~7.5:1 (AAA). `--text-muted` on `--bg-deep` = ~4.6:1 (AA). Don't go lighter than `--text-muted` for body copy.
- **Focus rings:** every interactive element gets a visible focus-visible state. Cards get a 2 px `#818cf8` outline + glow.
- **Semantic landmarks:** `<header>`, `<main id="main-content">`, `<nav>` with `aria-label`, `<footer role="contentinfo">`.
- **Animated hero:** no autoplay sound, alt text `"Longmont AI Hero"`.
- **Form / interactive states:** all buttons use real `<button>` / `<a>` elements, never divs.

---

## 12. Asset inventory

### 12.1 Logos & marks
See §2.3. Source: `public/brand/logo/` and `public/brand/source/`.

### 12.2 Favicons
Pre-generated in `public/brand/favicon/`:
- `favicon.ico` (16/32/48 multi-resolution)
- `favicon-{16,32,48}.png`
- `apple-touch-icon.png` (180×180)
- `android-chrome-{192,512}.png`
- `favicon-mark.svg` (modern browsers)
- `favicon-mark-mono.svg` (Safari pinned tab)
- `site.webmanifest`

`HEAD-SNIPPET.html` has the full `<link>` block — paste it into the site `<head>`.

### 12.3 Social
| Platform | File | Size |
|---|---|---|
| OG / Twitter card | `social/og-image.png` | 1200×630 |
| X / Twitter header | `social/twitter-header.png` | 1500×500 |
| LinkedIn banner | `social/linkedin-banner.png` | 1584×396 |
| YouTube banner | `social/youtube-banner.png` | 2560×1440 |
| Facebook cover | `social/facebook-cover.png` | 820×312 |
| Avatar (square) | `social/avatar-1080.png` | 1080×1080 |
| Avatar (small) | `social/avatar-400.png`, `avatar-300.png` | — |

### 12.4 Pitch deck
Four 1920×1080 masters in `public/brand/deck/`:
- `slide-cover.png` (title slide)
- `slide-section.png` (section divider)
- `slide-content.png` (header bar + body region)
- `slide-closing.png` (thank-you / CTA)

Layer editable text on top of the `{{ placeholder }}` regions.

### 12.5 Hero artwork
Source artwork lives at `public/images/hero/hero-1.png` and `hero-2.png`. Regenerate at 1920×1080 minimum; prefer 2:1 or 16:9 ratios. Treat them like the brand photography they are — no logos, no busy text.

### 12.6 Regenerating PNGs from SVGs
SVGs are the source. Re-render via ImageMagick:
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

---

## 13. Tech stack (for contributors)

| Layer | Choice |
|---|---|
| Framework | React 19 + Vite |
| Language | TypeScript |
| Styling | Vanilla CSS + CSS variables (custom utility layer in `src/index.css`) — **not Tailwind**, despite the class names |
| Routing | `react-router-dom` v6 |
| Animations | Framer Motion + CSS keyframes |
| Icons | Lucide React |
| Hosting | Vercel (auto-deploy from `main`) |
| Lint/format | Whatever's in `package.json` — keep the existing config |

**Why no Tailwind?** The class names look Tailwind-y but are hand-rolled in `index.css`. Adding Tailwind would create two competing class systems. If you need a new utility, add it to `index.css` first.

---

## 14. Working with the visual verification loop

`CLAUDE.md` defines a strict visual-verification workflow for UI changes. Read it before touching anything visual. TL;DR:

1. Commit + push.
2. Wait 1–2 min for Vercel.
3. Screenshot the change with Puppeteer.
4. If broken → fix, commit, push, re-verify.
5. After **3 failed attempts** → stop and ping the user.

This applies to color, type, spacing, layout, and motion changes. Pure logic changes don't need it.

---

## 15. What's still TBD

Open design questions the next contributor should think about:

- **Light mode.** The site is dark-only by design choice. If a light theme is ever needed, it must derive from the same token names in `src/index.css` and `public/brand/palette/colors.css` — never a separate palette. Discuss before starting.
- **Animated logo placement.** Where on the live site should `logo-animated.webm` actually appear? Hero pre-roll? About page? Easter-egg only?
- **Edition page typography.** Long-form article reading on dark backgrounds has its own rules (max line length ~70ch, drop-cap or no?, code block styling). Document it when we have ≥3 editions using the same template.
- **The "Tools" page.** Currently listed as `/tools` in routes but not yet designed.
- **`#3b82f6` cleanup.** The deprecated Tailwind-blue accent still appears in a few one-off spots in `src/index.css`. Sweep and replace with `var(--accent-cyan)` / `var(--color-blue)` (`#007CF0`) when convenient.

When any of these gets decided, update this file. **This document is meant to drift toward truth.**
