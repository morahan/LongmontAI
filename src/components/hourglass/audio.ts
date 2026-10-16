// One shared AudioContext + decoded-buffer cache for every <hourglass-timer> on the page.

type AudioCtor = typeof AudioContext;

let ctx: AudioContext | null = null;
const cache = new Map<string, Promise<AudioBuffer | null>>();

/** Call from a user gesture (Start click) so playback is allowed later. */
export function unlockAudio(): void {
  try {
    if (!ctx) {
      const C: AudioCtor | undefined =
        window.AudioContext ?? (window as unknown as { webkitAudioContext?: AudioCtor }).webkitAudioContext;
      if (!C) return;
      ctx = new C();
    }
    if (ctx.state === 'suspended') void ctx.resume();
    // A silent one-sample blip fully unlocks iOS/Safari.
    const src = ctx.createBufferSource();
    src.buffer = ctx.createBuffer(1, 1, 22050);
    src.connect(ctx.destination);
    src.start(0);
  } catch {
    /* audio unavailable */
  }
}

export function preloadSound(url: string): void {
  if (!ctx || cache.has(url)) return;
  const c = ctx;
  cache.set(
    url,
    fetch(url)
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.arrayBuffer();
      })
      .then((buf) => c.decodeAudioData(buf))
      .catch(() => null),
  );
}

function fallback(url: string): void {
  try {
    void new Audio(url).play().catch(() => undefined);
  } catch {
    /* ignore */
  }
}

export function playSound(url: string): void {
  if (!ctx) return fallback(url);
  preloadSound(url);
  const c = ctx;
  void cache.get(url)!.then((buf) => {
    if (!buf) return fallback(url);
    if (c.state === 'suspended') void c.resume();
    const src = c.createBufferSource();
    src.buffer = buf;
    src.connect(c.destination);
    src.start();
  });
}
