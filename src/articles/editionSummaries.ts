import type { Edition } from './types';

export type EditionSummary = Omit<Edition, 'markdownContent' | 'items'>;

const summariesByPath = import.meta.glob<EditionSummary>('./20*.md', {
  eager: true,
  import: 'default',
  query: '?summary',
});

/** Build-time frontmatter only: article bodies remain in lazy edition chunks. */
export const editionSummaries = Object.values(summariesByPath).sort((left, right) => {
  const leftTime = Date.parse(left.publishAt ?? `${left.date}T00:00:00`);
  const rightTime = Date.parse(right.publishAt ?? `${right.date}T00:00:00`);
  return rightTime - leftTime;
});
