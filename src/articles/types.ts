export interface ContentItem {
  type: 'text' | 'image' | 'video' | 'link' | 'code' | 'markdown';
  content?: string;
  url?: string;
  caption?: string;
  title?: string;
  description?: string;
  language?: string;
}

export interface Edition {
  id: string;
  date: string;
  publishAt?: string;
  title: string;
  summary: string;
  items?: ContentItem[];
  markdownContent?: string;
}

export interface ScheduledEditionResponse {
  edition: Edition;
  slideshows?: Record<string, import('./slideshows').SlideshowDeck>;
}

export function isEditionPublished(edition: Edition, now = Date.now()): boolean {
  if (!edition.publishAt) {
    return true;
  }

  const publishTime = Date.parse(edition.publishAt);
  return Number.isFinite(publishTime) && publishTime <= now;
}
