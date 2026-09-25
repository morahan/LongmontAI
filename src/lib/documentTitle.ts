import { useEffect } from 'react';
import { matchPath } from 'react-router-dom';

export const SITE_TITLE = 'LongmontAI';

const routeTitles: ReadonlyArray<readonly [string, string | undefined]> = [
  ['/', undefined],
  ['/edition/:id', 'Edition'],
  ['/countdown', 'Meetup Countdown'],
  ['/tools', 'AI Capabilities Matrix'],
  ['/model-watch', 'Model Watch'],
  ['/leaderboard', 'Leaderboard'],
  ['/timeline', 'AI Timeline'],
  ['/newsletter', 'Newsletter'],
  ['/about', 'About'],
];

export function routeTitle(pathname: string): string | undefined {
  const route = routeTitles.find(([path]) => matchPath(path, pathname));
  return route ? route[1] : 'Page Not Found';
}

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
