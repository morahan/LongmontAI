// Types
export * from './types';

import { Edition } from './types';
import matter from 'gray-matter';

// Import markdown files as raw text
import article_2026_01_21 from './2026.01.21.md?raw';
import article_2026_01_07 from './2026.01.07.md?raw';
import article_2025_11_26 from './2025.11.26.md?raw';
import article_2025_11_20 from './2025.11.20.md?raw';

// Parse markdown with frontmatter into Edition objects
function parseMarkdownToEdition(raw: string): Edition {
  const { data, content } = matter(raw);
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
  parseMarkdownToEdition(article_2026_01_21),
  parseMarkdownToEdition(article_2026_01_07),
  parseMarkdownToEdition(article_2025_11_26),
  parseMarkdownToEdition(article_2025_11_20),
];
