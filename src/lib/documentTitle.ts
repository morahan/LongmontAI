import { useEffect } from 'react';

const SITE_TITLE = 'LongmontAI';

export function pageTitle(label?: string): string {
  return label ? `${label} | ${SITE_TITLE}` : SITE_TITLE;
}

export function useDocumentTitle(label?: string): void {
  useEffect(() => {
    const title = pageTitle(label);
    document.title = title;
    return () => {
      if (document.title === title) document.title = SITE_TITLE;
    };
  }, [label]);
}

export { SITE_TITLE };
