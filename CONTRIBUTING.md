# Contributing to LongmontAI

## Bi-Weekly Edition Workflow

Every other Wednesday, a new edition is published. Here's the standard process.

## Directory Structure

```
public/weekly-screenshots/
  YYYY.MM.DD/           ← Screenshots for that edition
    descriptive-name.png
    another-topic.png
    ...

public/slideshows/
  YYYY.MM.DD/
    post-slug/           ← Slide images, source decks, and deck-only assets
      slide-01.png
      deck-name.pptx
      assets/

public/documents/
  YYYY.MM.DD/            ← PDFs and previews embedded in that edition

outputs/
  YYYY.MM.DD/
    post-slug/           ← Tracked source/archive material for one post

output/
  playwright/
    YYYY.MM.DD/
      post-slug/         ← Ignored local validation screenshots
  ocr/
    YYYY.MM.DD/
      post-slug/         ← Ignored local source/OCR captures

src/articles/
  YYYY.MM.DD.md         ← Article markdown with frontmatter
  index.ts              ← Must be updated to include new article
  types.ts              ← Edition type definition
```

## Date Format
- **Always use `YYYY.MM.DD`** (dots, not dashes) for both folder names and article filenames.
- Example: `2026.02.18` for February 18, 2026.

## Screenshot Conventions

### Naming
- Use **descriptive kebab-case** names: `openclaw-agent-dashboard.png`
- No generic names like `screenshot_01.png`
- Group related screenshots by topic prefix: `openclaw-xxx.png`, `cursor-xxx.png`

### Format
- Prefer `.png` for screenshots, `.jpg` for photos
- No size limit but keep reasonable (under 2MB per image)

### Organization
- All screenshots for one edition go in ONE folder: `public/weekly-screenshots/YYYY.MM.DD/`
- Reference them in markdown as: `/weekly-screenshots/YYYY.MM.DD/filename.png`
- Slideshows for one edition go in `public/slideshows/YYYY.MM.DD/post-slug/`
- Documents for one edition go in `public/documents/YYYY.MM.DD/`
- Tracked source material and generated archives go in `outputs/YYYY.MM.DD/post-slug/`
- Local validation screenshots and OCR captures stay ignored under `output/<tool>/YYYY.MM.DD/post-slug/`
- Do not add article assets directly under `outputs/`, `public/weekly-screenshots/`, or an undated public folder.

## Article Format

### Frontmatter (required)
```yaml
---
id: edition-YYYY-MM-DD-short-description
date: YYYY-MM-DD
title: "Edition Title Here"
summary: "One-line summary of what this edition covers."
---
```

Note: `id` and `date` use dashes, folder/filename use dots.

### Content Structure
- Group screenshots by **theme** (e.g., "OpenClaw Updates", "Model Releases", "Hardware")
- Each theme gets a `## Heading`
- Each screenshot gets:
  - An `![Alt text](/weekly-screenshots/YYYY.MM.DD/filename.png)` image tag
  - A paragraph explaining what it shows and why it matters
- Use `---` horizontal rules between major sections
- End with data sources if applicable

### Example Section
```markdown
## Theme Name

![Descriptive Alt Text](/weekly-screenshots/2026.02.18/example-screenshot.png)

Paragraph explaining what this screenshot shows, the context around it,
and why it's significant for the AI community.
```

## Adding a New Edition

1. Create screenshot folder: `public/weekly-screenshots/YYYY.MM.DD/`
2. Add renamed, organized screenshots to that folder
3. Create article: `src/articles/YYYY.MM.DD.md` with proper frontmatter
4. Update `src/articles/index.ts`:
   - Add import: `import article_YYYY_MM_DD from './YYYY.MM.DD.md?raw';`
   - Add to editions array (newest first): `parseMarkdownToEdition(article_YYYY_MM_DD),`
5. If you add a slideshow, add its deck metadata to `src/articles/slideshows.ts` and keep every `sourceUrl`, slide, and asset path under `/slideshows/YYYY.MM.DD/post-slug/`
6. If you add an embedded PDF, add its metadata to `src/articles/documents.ts` and keep the PDF plus preview under `/documents/YYYY.MM.DD/`
7. Run `npm run content:check-assets` and `npm run build`
8. Commit and push to `main` — Vercel auto-deploys

## Quality Standards
- Every screenshot must have a written explanation
- Group by theme, not chronological order
- Write for a general AI-interested audience
- Include specific numbers, dates, and sources when available
- Proofread before publishing
