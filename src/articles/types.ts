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
  title: string;
  summary: string;
  items?: ContentItem[];
  markdownContent?: string;
}
