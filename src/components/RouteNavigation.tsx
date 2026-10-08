import { useLayoutEffect, useRef } from 'react';
import { useLocation, useNavigationType } from 'react-router-dom';

/** Keep history-entry positions, not pathname positions; wait for lazy route layout. */
export default function RouteNavigation() {
  const location = useLocation();
  const navigationType = useNavigationType();
  const positions = useRef(new Map<string, { x: number; y: number }>());

  useLayoutEffect(() => {
    const previous = window.history.scrollRestoration;
    window.history.scrollRestoration = 'manual';
    return () => { window.history.scrollRestoration = previous; };
  }, []);

  useLayoutEffect(() => {
    // Native same-document anchors can inherit React Router's history key.
    const entryKey = `${location.key}:${location.pathname}${location.search}${location.hash}`;
    const saved = navigationType === 'POP' ? positions.current.get(entryKey) : undefined;
    const started = performance.now();
    let frame = 0;
    let restoring = true;
    let anchorPosition: number | undefined;
    let anchorStableSince = started;
    let hash = '';
    try { hash = decodeURIComponent(location.hash.slice(1)); } catch { /* malformed hash: use top */ }

    const record = () => {
      if (!restoring) positions.current.set(entryKey, { x: window.scrollX, y: window.scrollY });
    };
    const stop = () => {
      restoring = false;
      cancelAnimationFrame(frame);
      record();
    };
    const restore = () => {
      const anchor = hash ? document.getElementById(hash) : null;
      const pending = document.querySelector('main [data-route-loading]');
      if (saved) {
        window.scrollTo({ left: saved.x, top: saved.y, behavior: 'instant' });
      } else if (anchor) {
        anchor.scrollIntoView({ behavior: 'instant' });
      } else {
        window.scrollTo({ left: 0, top: 0, behavior: 'instant' });
      }
      if (anchor && !saved) {
        const position = anchor.getBoundingClientRect().top + window.scrollY;
        if (anchorPosition === undefined || Math.abs(position - anchorPosition) > 0.5) {
          anchorStableSince = performance.now();
          anchorPosition = position;
        }
      }
      const reached = saved ? Math.abs(window.scrollY - saved.y) < 2
        : !hash || Boolean(anchor && performance.now() - anchorStableSince >= 150);
      if ((!pending && reached) || performance.now() - started > 3000) {
        if (!saved && navigationType !== 'POP') {
          // Do not change the scroll position while handing keyboard users the new page.
          document.getElementById('main-content')?.focus({ preventScroll: true });
        }
        stop();
      } else frame = requestAnimationFrame(restore);
    };
    window.addEventListener('scroll', record, { passive: true });
    window.addEventListener('wheel', stop, { passive: true });
    window.addEventListener('touchstart', stop, { passive: true });
    window.addEventListener('keydown', stop);
    frame = requestAnimationFrame(restore);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('scroll', record);
      window.removeEventListener('wheel', stop);
      window.removeEventListener('touchstart', stop);
      window.removeEventListener('keydown', stop);
    };
  }, [location.key, location.pathname, location.search, location.hash, navigationType]);

  return null;
}
