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
5. Commit and push to `main` — Vercel auto-deploys

## Quality Standards
- Every screenshot must have a written explanation
- Group by theme, not chronological order
- Write for a general AI-interested audience
- Include specific numbers, dates, and sources when available
- Proofread before publishing
