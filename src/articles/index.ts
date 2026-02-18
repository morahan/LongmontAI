// Types
export * from './types';

import { Edition } from './types';

// Import markdown files as raw text
import article_2026_02_18 from './2026.02.18.md?raw';
import article_2026_02_04 from './2026.02.04.md?raw';
import article_2026_01_21 from './2026.01.21.md?raw';
import article_2026_01_07 from './2026.01.07.md?raw';
import article_2025_11_26 from './2025.11.26.md?raw';
import article_2025_11_20 from './2025.11.20.md?raw';

// Simple browser-compatible frontmatter parser
function parseFrontmatter(raw: string): { data: Record<string, string>; content: string } {
  const frontmatterRegex = /^---\n([\s\S]*?)\n---\n([\s\S]*)$/;
  const match = raw.match(frontmatterRegex);

  if (!match) {
    return { data: {}, content: raw };
  }

  const [, frontmatterStr, content] = match;
  const data: Record<string, string> = {};

  // Parse YAML-like frontmatter (simple key: value pairs)
  frontmatterStr.split('\n').forEach(line => {
    const colonIndex = line.indexOf(':');
    if (colonIndex > 0) {
      const key = line.substring(0, colonIndex).trim();
      let value = line.substring(colonIndex + 1).trim();
      // Remove surrounding quotes if present
      if ((value.startsWith('"') && value.endsWith('"')) ||
          (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1);
      }
      data[key] = value;
    }
  });

  return { data, content };
}

// Parse markdown with frontmatter into Edition objects
function parseMarkdownToEdition(raw: string): Edition {
  const { data, content } = parseFrontmatter(raw);
  return {
    id: data.id,
    date: data.date,
    title: data.title,
    summary: data.summary,
    markdownContent: content,
  };
}

// Combined editions array (newest first)
export const editions: Edition[] = [
  parseMarkdownToEdition(article_2026_02_18),
  parseMarkdownToEdition(article_2026_02_04),
  parseMarkdownToEdition(article_2026_01_21),
  parseMarkdownToEdition(article_2026_01_07),
  parseMarkdownToEdition(article_2025_11_26),
  parseMarkdownToEdition(article_2025_11_20),
];
