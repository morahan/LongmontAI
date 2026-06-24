# Countdown Page — Final Countdown + Animated Logo + 1h Confetti Plan

> **For Hermes:** Single-page visual feature. Execute directly, do not delegate (focused change, one TSX + one CSS file, needs the visual-verification loop from CLAUDE.md).

**Goal:** Make the `/countdown` page exciting in the final minute, show the looping animated logo at the center of the screen for the full 1-hour meetup window, and persist confetti throughout.

**Architecture:** Extend the existing state machine in `Countdown.tsx`. Keep `getNextMeetup` / `isLive` logic intact — add new UI states gated by remaining time. Web Audio for musical ticks (no assets to ship). Animated logo served from `public/brand/logo/`.

**Tech Stack:** React + Framer Motion (already a dep), Web Audio API (built-in), `<video>` element, existing CSS keyframes.

---

## State machine

| State | Trigger | Visual | Audio |
|---|---|---|---|
| `countdown` | > 60 s remaining | Existing 4-digit row | Silent |
| `finalCountdown` | ≤ 60 s, > 0 s | Huge pulsing "FINAL COUNTDOWN" + giant seconds digit | 4-note rising arpeggio, pitch climbs each second, tempo accelerates |
| `justHitZero` | First 8 s after zero | "IT'S TIME!" overlay + flash + 120 confetti | 4-note celebration chime (existing) |
| `live` | now ≥ 0 s AND < endTime (1 h meetup window) | Animated logo looping centered + persistent 30-piece confetti + live progress ring behind | Silent (chime already played) |
| `countdown` (next meetup) | now ≥ endTime | Auto-resets — `getNextMeetup` advances to next meetup | Silent |

No "tail" beyond the 1-hour meetup. `isLiveEvent` keeps its current definition (`now >= nextMeetup && now < endTime`), which is exactly the 1-hour meetup window.

## Sound design

Single Web Audio context, lazily created on first user interaction (browser autoplay policy). Functions:
- `startAudio()` — create context on first click/keydown
- `playFinalTick(remainingSeconds)` — single sine note, pitch = `C5 + (60 - remainingSeconds) * 50` Hz stepped, gain ramps over 80ms
- `playCelebrationChime()` — existing 4-note C major arpeggio (already in code)

`prefers-reduced-motion`: silence audio, replace final-countdown visual with static "Final Countdown" text, replace celebration flash with no flash.

## Files to change

### 1. `src/pages/Countdown.tsx`

**Constants:**
```ts
const FINAL_COUNTDOWN_THRESHOLD_SECONDS = 60;
const JUST_HIT_ZERO_DURATION_MS = 8000;
```
(`MEETUP_DURATION_HOURS = 1` already exists — that's the live window.)

**Extend `getNextMeetup`** (already correct as-is — advances 14 days once the 1-hour meetup window ends):
```ts
function getNextMeetup(localNow: Date): Date {
  let next = new Date(REFERENCE_MEETUP);
  const durationMs = MEETUP_DURATION_HOURS * 60 * 60 * 1000; // 1 hour
  while (next.getTime() + durationMs <= localNow.getTime()) {
    next = new Date(next.getTime() + INTERVAL_DAYS * 24 * 60 * 60 * 1000);
  }
  return next;
}
```
No change needed — current behavior is correct.

**Add audio helpers (top of file):**
```tsx
let audioContext: AudioContext | null = null;
function ensureAudioContext(): AudioContext | null {
  if (audioContext) return audioContext;
  try {
    const Ctx = window.AudioContext || (window as any).webkitAudioContext;
    if (!Ctx) return null;
    audioContext = new Ctx();
    return audioContext;
  } catch { return null; }
}

function playFinalTick(remainingSeconds: number, reducedMotion: boolean) {
  if (reducedMotion) return;
  const ctx = ensureAudioContext();
  if (!ctx) return;
  const now = ctx.currentTime;
  // Base C5 + climb with urgency; faster tempo in last 10s
  const baseHz = 523.25;
  const urgency = Math.max(0, FINAL_COUNTDOWN_THRESHOLD_SECONDS - remainingSeconds);
  const freq = baseHz + urgency * 20;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = 'triangle';
  osc.frequency.setValueAtTime(freq, now);
  gain.gain.setValueAtTime(0, now);
  gain.gain.linearRampToValueAtTime(0.12, now + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.001, now + (remainingSeconds <= 10 ? 0.15 : 0.3));
  osc.connect(gain).connect(ctx.destination);
  osc.start(now);
  osc.stop(now + 0.3);
}
```

**Auto-arm audio on first interaction** (one `useEffect`):
```tsx
useEffect(() => {
  const arm = () => { ensureAudioContext(); window.removeEventListener('click', arm); window.removeEventListener('keydown', arm); };
  window.addEventListener('click', arm, { once: true });
  window.addEventListener('keydown', arm, { once: true });
  return () => { window.removeEventListener('click', arm); window.removeEventListener('keydown', arm); };
}, []);
```

**Extend `TimeLeft`:**
```ts
interface TimeLeft {
  days: number; hours: number; minutes: number; seconds: number;
  total: number; isLive: boolean; isPastToday: boolean;
  isFinalCountdown: boolean; // total <= 60_000 && total > 0
}
```
Compute `isFinalCountdown = total > 0 && total <= 60_000`.

**Tick audio on the final minute:** in the `requestAnimationFrame` loop, detect when `timeLeft.seconds` decreases while in `finalCountdown`, fire `playFinalTick`.

**New components:**
```tsx
const FinalCountdownDisplay: React.FC<{ seconds: number }> = ({ seconds }) => (
  <div className="flex flex-col items-center gap-3 animate-final-countdown">
    <div className="text-xs sm:text-sm font-mono uppercase tracking-[0.4em] text-[var(--color-cyan)]">
      🎵 Final Countdown 🎵
    </div>
    <div className="text-[clamp(8rem,30vw,18rem)] leading-none font-black font-mono text-white
                    drop-shadow-[0_0_40px_rgba(0,240,255,0.6)] tabular-nums">
      {String(seconds).padStart(2, '0')}
    </div>
    <div className="text-sm font-mono uppercase tracking-widest text-[var(--text-muted)]">
      {seconds <= 10 ? 'almost there…' : 'seconds to showtime'}
    </div>
  </div>
);

const AnimatedLogo: React.FC = () => (
  <div className="relative flex items-center justify-center my-6">
    <div className="absolute inset-0 blur-3xl opacity-60 animate-logo-glow
                    bg-[radial-gradient(circle,var(--color-purple)_0%,var(--color-cyan)_50%,transparent_70%)]" />
    <video
      autoPlay loop muted playsInline preload="auto"
      poster="/brand/logo/logo-animated-poster.png"
      className="relative w-[min(60vw,480px)] h-auto drop-shadow-[0_0_60px_rgba(121,40,202,0.5)]"
    >
      <source src="/brand/logo/logo-animated.webm" type="video/webm" />
      <source src="/brand/logo/logo-animated-512.mp4" type="video/mp4" />
      <img src="/brand/logo/logo-animated-poster.png" alt="Longmont AI" />
    </video>
  </div>
);
```

**Page-level render branches:**
- `isFinalCountdown && !isLiveEvent`: hide normal countdown, show `<FinalCountdownDisplay seconds={timeLeft.seconds} />`
- `isLiveEvent`: hide 4-digit row, show `<AnimatedLogo />` above the existing live progress ring
- `!isLiveEvent && !isFinalCountdown`: existing behavior

### 2. `src/index.css`

Append at end (around line 1174):
```css
@keyframes final-countdown-pulse {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.04); }
}
.animate-final-countdown { animation: final-countdown-pulse 1s ease-in-out infinite; }

@keyframes logo-glow {
  0%, 100% { opacity: 0.5; transform: scale(1); }
  50% { opacity: 0.8; transform: scale(1.1); }
}
.animate-logo-glow { animation: logo-glow 4s ease-in-out infinite; }

@media (prefers-reduced-motion: reduce) {
  .animate-final-countdown, .animate-logo-glow, .animate-flash-in-out,
  .animate-celebration-pop, .confetti-fall, .animate-live-pulse {
    animation: none !important;
  }
  /* AudioContext.playFinalTick and playCelebrationSound guard on reducedMotion too */
}
```

The reduced-motion CSS handles visuals; the JS audio calls also check `window.matchMedia('(prefers-reduced-motion: reduce)').matches`.

## Verification (per CLAUDE.md)

1. **Commit + push** the changes.
2. **Wait 1–2 min** for Vercel deploy.
3. **Puppeteer screenshot** the countdown page in three states:
   - Normal (`> 60 s`) — confirm no regression
   - `?demo=final` — confirm big "FINAL COUNTDOWN" text + huge seconds digit
   - `?demo=zero` — confirm animated logo centered + persistent confetti

**Demo mode override** (debugging affordance — only activates with explicit URL param):
```tsx
const urlParams = new URLSearchParams(window.location.search);
const demoState = urlParams.get('demo'); // 'final' | 'zero' | null
// In render: if demoState === 'final' treat as finalCountdown regardless of total
//             if demoState === 'zero' treat as liveEvent regardless of total
```
Important: demo override is gated to local development OR behind a build flag — for Vercel production this should be a no-op unless `import.meta.env.DEV` or a future feature flag. For now, gate on `import.meta.env.DEV` so screenshots work but the live site ignores `?demo=`.

4. If visual issue: fix, commit, push, re-verify (max 3 attempts).

## Risks & open questions

- **Audio autoplay**: Web Audio needs user gesture. We arm on first click/keydown, so the first tick of the final countdown might be silent if the user lands on the page and never interacts. Acceptable — they'll be silent for at most one tick.
- **Vercel deployment**: animated logo is ~640 KB WebM. Acceptable load.
- **Demo override security**: `?demo=` only honors in dev build, so production users see real timer behavior. Confirmed safe.

## Out of scope

- Animated logo on any page other than `/countdown`
- Audio on other pages
- Persistent confetti settings in localStorage (always on, no toggle)