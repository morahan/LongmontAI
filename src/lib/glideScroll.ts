import { useEffect, useRef, type MouseEvent } from 'react';
import { animate } from 'framer-motion';

const MIN_SECONDS = 1;
const MAX_SECONDS = 1.8;
const PIXELS_PER_SECOND = 700;
const TAKEOVER_EVENTS = ['wheel', 'touchstart', 'keydown', 'pointerdown'] as const;

// Read fresh on every frame because content above the target can still be loading.
function restingScrollY(target: HTMLElement): number {
  const margin = Number.parseFloat(getComputedStyle(target).scrollMarginTop) || 0;
  const top = target.getBoundingClientRect().top + window.scrollY - margin;
  const max = document.documentElement.scrollHeight - window.innerHeight;
  return Math.max(0, Math.min(top, max));
}

/** Returns a cancel function. `onSettle` runs exactly once, with whether the glide arrived. */
export function glideTo(target: HTMLElement, onSettle: (arrived: boolean) => void): () => void {
  let position = window.scrollY;
  let lastProgress = 0;
  let settled = false;
  const seconds = Math.abs(restingScrollY(target) - position) / PIXELS_PER_SECOND;

  const settle = (arrived: boolean) => {
    if (settled) return;
    settled = true;
    controls.stop();
    for (const type of TAKEOVER_EVENTS) window.removeEventListener(type, cancel);
    onSettle(arrived);
  };
  const cancel = () => settle(false);
  const controls = animate(0, 1, {
    duration: Math.min(MAX_SECONDS, Math.max(MIN_SECONDS, seconds)),
    ease: [0.65, 0, 0.35, 1],
    onUpdate: (progress) => {
      // Close the same share of the remaining distance as of the remaining
      // progress, so a target that moves bends the path instead of jumping it.
      const share = lastProgress < 1 ? (progress - lastProgress) / (1 - lastProgress) : 1;
      position += (restingScrollY(target) - position) * share;
      lastProgress = progress;
      window.scrollTo({ top: position, behavior: 'instant' });
    },
    onComplete: () => settle(true),
  });
  for (const type of TAKEOVER_EVENTS) window.addEventListener(type, cancel, { passive: true });

  return cancel;
}

/** Click handler for same-page `#hash` links. It leaves the native jump alone when a glide is unwanted. */
export function useGlideLink(): (event: MouseEvent<HTMLAnchorElement>) => void {
  const cancelGlide = useRef<(() => void) | undefined>(undefined);

  useEffect(() => () => cancelGlide.current?.(), []);

  return (event) => {
    const link = event.currentTarget;
    const target = document.getElementById(link.hash.slice(1));
    const modified = event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey;
    if (!target || modified || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    // RouteNavigation snaps to the anchor every frame once the hash changes, so the URL stays untouched.
    event.preventDefault();
    cancelGlide.current?.();
    link.dataset.gliding = '';
    cancelGlide.current = glideTo(target, (arrived) => {
      delete link.dataset.gliding;
      // preventDefault also dropped the focus move a native anchor jump gives keyboard users.
      if (arrived) target.focus({ preventScroll: true });
    });
  };
}
