import React, { useState, useEffect, useRef } from 'react';
import { MapPin, Calendar, Clock } from 'lucide-react';

// ─── LongmontAI Meetup Schedule ─────────────────────────────────────────────
// Every other Wednesday at noon (America/Denver / MDT)
// Hardcoded reference: May 27, 2026 is a Wednesday meetup day.
// Subsequent meetups are every 14 days from that date.
const MEETUP_YEAR = 2026;
const MEETUP_MONTH = 5; // 1-indexed
const MEETUP_DAY = 27;
const MEETUP_HOUR = 12; // noon local
const MEETUP_DURATION_HOURS = 1;
const INTERVAL_DAYS = 14;
const FINAL_COUNTDOWN_THRESHOLD_SECONDS = 60;
const JUST_HIT_ZERO_DURATION_MS = 8000;

// Stable reference: May 27, 2026 noon = upcoming meetup
const REFERENCE_MEETUP = new Date(MEETUP_YEAR, MEETUP_MONTH - 1, MEETUP_DAY, MEETUP_HOUR, 0, 0, 0);

function getNextMeetup(localNow: Date): Date {
  // Advance from reference in 14-day steps until we find a meetup that hasn't ended yet
  let next = new Date(REFERENCE_MEETUP);
  const durationMs = MEETUP_DURATION_HOURS * 60 * 60 * 1000;
  while (next.getTime() + durationMs <= localNow.getTime()) {
    next = new Date(next.getTime() + INTERVAL_DAYS * 24 * 60 * 60 * 1000);
  }
  return next;
}

function getEndTime(meetup: Date): Date {
  return new Date(meetup.getTime() + MEETUP_DURATION_HOURS * 60 * 60 * 1000);
}

interface TimeLeft {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  total: number;
  isLive: boolean;
  isPastToday: boolean;
  isFinalCountdown: boolean;
}

function computeTimeLeft(): TimeLeft {
  const now = new Date();
  const nextMeetup = getNextMeetup(now);
  const endTime = getEndTime(nextMeetup);
  const diff = nextMeetup.getTime() - now.getTime();

  const live = now >= nextMeetup && now < endTime;

  if (diff <= 0 && !live) {
    return { days: 0, hours: 0, minutes: 0, seconds: 0, total: 0, isLive: false, isPastToday: true, isFinalCountdown: false };
  }

  const absDiff = Math.max(0, diff);
  const seconds = Math.floor((absDiff / 1000) % 60);
  const minutes = Math.floor((absDiff / 1000 / 60) % 60);
  const hours = Math.floor((absDiff / 1000 / 60 / 60) % 24);
  const days = Math.floor(absDiff / 1000 / 60 / 60 / 24);

  const isFinalCountdown = diff > 0 && diff <= FINAL_COUNTDOWN_THRESHOLD_SECONDS * 1000;

  return { days, hours, minutes, seconds, total: diff, isLive: live, isPastToday: false, isFinalCountdown };
}

// ─── Audio (lazy, gated behind first user gesture) ──────────────────────────
let audioContext: AudioContext | null = null;
let reducedMotion = false;

function ensureAudioContext(): AudioContext | null {
  if (audioContext) return audioContext;
  try {
    const Ctx = window.AudioContext || (window as any).webkitAudioContext;
    if (!Ctx) return null;
    audioContext = new Ctx();
    return audioContext;
  } catch {
    return null;
  }
}

function detectReducedMotion() {
  try {
    reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  } catch {
    reducedMotion = false;
  }
}

function playFinalTick(remainingSeconds: number) {
  if (reducedMotion) return;
  const ctx = ensureAudioContext();
  if (!ctx) return;
  const now = ctx.currentTime;
  // Base C5 + climb with urgency. Faster envelope in the final 10 seconds.
  const baseHz = 523.25;
  const urgency = Math.max(0, FINAL_COUNTDOWN_THRESHOLD_SECONDS - remainingSeconds);
  const freq = baseHz + urgency * 20;
  const isFinalTen = remainingSeconds <= 10;
  const dur = isFinalTen ? 0.15 : 0.3;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = 'triangle';
  osc.frequency.setValueAtTime(freq, now);
  gain.gain.setValueAtTime(0, now);
  gain.gain.linearRampToValueAtTime(0.12, now + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.001, now + dur);
  osc.connect(gain).connect(ctx.destination);
  osc.start(now);
  osc.stop(now + dur);
}

function playCelebrationSound() {
  if (reducedMotion) return;
  try {
    const context = ensureAudioContext();
    if (!context) return;

    const masterGain = context.createGain();
    masterGain.gain.setValueAtTime(0.15, context.currentTime);
    masterGain.connect(context.destination);

    const playNote = (freq: number, startTime: number, duration: number) => {
      const osc = context.createOscillator();
      const g = context.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, startTime);

      g.gain.setValueAtTime(0, startTime);
      g.gain.linearRampToValueAtTime(0.2, startTime + 0.05);
      g.gain.exponentialRampToValueAtTime(0.001, startTime + duration);

      osc.connect(g);
      g.connect(masterGain);

      osc.start(startTime);
      osc.stop(startTime + duration);
    };

    const now = context.currentTime;
    playNote(523.25, now, 0.8);      // C5
    playNote(659.25, now + 0.1, 0.8); // E5
    playNote(783.99, now + 0.2, 0.8); // G5
    playNote(1046.50, now + 0.3, 1.2); // C6
  } catch (e) {
    console.error('Audio playback failed', e);
  }
}

// ─── Demo override (dev only) ───────────────────────────────────────────────
function readDemoOverride(): 'final' | 'zero' | null {
  // Only honored in dev so production users see real timer behavior.
  // import.meta.env.DEV is replaced by Vite at build time.
  // @ts-ignore
  if (typeof import.meta === 'undefined' || !import.meta.env?.DEV) return null;
  const p = new URLSearchParams(window.location.search);
  const v = p.get('demo');
  if (v === 'final' || v === 'zero') return v;
  return null;
}

// ─── Display components ─────────────────────────────────────────────────────
interface DigitProps {
  value: number;
  label: string;
}
const Digit: React.FC<DigitProps> = ({ value, label }) => {
  return (
    <div className="flex flex-col items-center min-w-[2.5rem] sm:min-w-0">
      <div className="text-4xl sm:text-6xl md:text-7xl lg:text-8xl font-bold font-mono tracking-tighter leading-none text-white">
        {String(value).padStart(2, '0')}
      </div>
      <span className="text-[10px] sm:text-sm font-mono uppercase tracking-widest text-[var(--text-muted)] mt-1 sm:mt-2">
        {label}
      </span>
    </div>
  );
};

interface SeparatorProps {
  visible: boolean;
}

const Separator: React.FC<SeparatorProps> = ({ visible }) => (
  <div className="flex flex-col gap-1 sm:gap-1.5 self-center mt-0">
    <div
      className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full"
      style={{ backgroundColor: visible ? 'var(--accent-cyan)' : 'rgba(255,255,255,0.15)' }}
    />
    <div
      className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full"
      style={{ backgroundColor: visible ? 'var(--accent-cyan)' : 'rgba(255,255,255,0.15)' }}
    />
  </div>
);

const FinalCountdownDisplay: React.FC<{ seconds: number }> = ({ seconds }) => {
  const isFinalTen = seconds <= 10;
  return (
    <div className="flex flex-col items-center gap-3 my-6">
      <div className={`text-xs sm:text-base font-mono uppercase tracking-[0.4em] ${isFinalTen ? 'text-[var(--color-pink)]' : 'text-[var(--color-cyan)]'} animate-final-pulse`}>
        🎵 Final Countdown 🎵
      </div>
      <div
        className={`font-black font-mono text-white tabular-nums leading-none ${
          isFinalTen ? 'animate-final-thump' : 'animate-final-pulse'
        }`}
        style={{
          fontSize: 'clamp(8rem, 30vw, 18rem)',
          textShadow: isFinalTen
            ? '0 0 60px rgba(255, 0, 128, 0.7), 0 0 30px rgba(255, 0, 128, 0.4)'
            : '0 0 40px rgba(0, 240, 255, 0.6)',
        }}
      >
        {String(seconds).padStart(2, '0')}
      </div>
      <div className="text-sm font-mono uppercase tracking-widest text-[var(--text-muted)]">
        {isFinalTen ? 'almost there…' : 'seconds to showtime'}
      </div>
    </div>
  );
};

const AnimatedLogo: React.FC = () => (
  <div className="relative flex items-center justify-center my-6">
    <div
      className="absolute inset-0 blur-3xl opacity-60 animate-logo-glow pointer-events-none"
      style={{
        background:
          'radial-gradient(circle, var(--color-purple) 0%, var(--color-cyan) 50%, transparent 70%)',
      }}
      aria-hidden="true"
    />
    <video
      autoPlay
      loop
      muted
      playsInline
      preload="auto"
      poster="/brand/logo/logo-animated-poster.png"
      className="relative w-[min(60vw,480px)] h-auto drop-shadow-[0_0_60px_rgba(121,40,202,0.5)] rounded-2xl"
      aria-label="Longmont AI animated logo"
    >
      <source src="/brand/logo/logo-animated.webm" type="video/webm" />
      <source src="/brand/logo/logo-animated-512.mp4" type="video/mp4" />
      <img src="/brand/logo/logo-animated-poster.png" alt="Longmont AI" />
    </video>
  </div>
);

// ─── Confetti ───────────────────────────────────────────────────────────────
interface ConfettiPiece {
  id: number;
  x: number;
  color: string;
  size: number;
  delay: number;
  duration: number;
  rotation: number;
  drift: number;
}

const CONFETTI_COLORS = [
  'var(--color-cyan)',
  'var(--color-purple)',
  'var(--color-pink)',
  'var(--color-sunset)',
  'var(--color-blue)',
  '#ffffff',
];

function Confetti({ count = 60 }: { count?: number }) {
  const pieces = React.useMemo<ConfettiPiece[]>(() => {
    return Array.from({ length: count }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      color: CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)],
      size: Math.random() * 8 + 4,
      delay: Math.random() * 5,
      duration: Math.random() * 3 + 3,
      rotation: Math.random() * 360,
      drift: (Math.random() - 0.5) * 150,
    }));
  }, [count]);

  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden z-[60]" aria-hidden="true">
      {pieces.map((p) => (
        <div
          key={p.id}
          className="confetti-fall"
          style={
            {
              '--cx': `${p.x}vw`,
              '--cdrift': `${p.drift}px`,
              '--crot': `${p.rotation}deg`,
              '--cdur': `${p.duration}s`,
              '--cdelay': `${p.delay}s`,
              position: 'absolute',
              width: p.size,
              height: p.size,
              backgroundColor: p.color,
              borderRadius: Math.random() > 0.5 ? '50%' : '2px',
              top: 0,
              left: 0,
            } as React.CSSProperties
          }
        />
      ))}
    </div>
  );
}

const CelebrationOverlay: React.FC = () => {
  return (
    <div className="fixed inset-0 flex items-center justify-center z-50 pointer-events-none">
      <div className="text-center animate-celebration-pop">
        <h2 className="text-6xl sm:text-8xl font-black text-white tracking-tighter mb-4 drop-shadow-[0_0_30px_rgba(255,255,255,0.3)]">
          IT'S TIME!
        </h2>
        <div className="h-1 w-24 bg-gradient-to-r from-transparent via-[var(--accent-cyan)] to-transparent mx-auto" />
      </div>
    </div>
  );
};

// ─── Main page ──────────────────────────────────────────────────────────────
const Countdown: React.FC = () => {
  const [timeLeft, setTimeLeft] = useState<TimeLeft>(computeTimeLeft);
  const [isCelebrationActive, setIsCelebrationActive] = useState(false);
  const [isFlashing, setIsFlashing] = useState(false);
  const rafRef = useRef<number>(0);
  const prevIsLive = useRef(timeLeft.isLive);
  const prevSeconds = useRef<number>(-1);

  // Arm audio + detect reduced motion on mount
  useEffect(() => {
    detectReducedMotion();
    const arm = () => {
      ensureAudioContext();
      window.removeEventListener('click', arm);
      window.removeEventListener('keydown', arm);
      window.removeEventListener('touchstart', arm);
    };
    window.addEventListener('click', arm, { once: true, passive: true });
    window.addEventListener('keydown', arm, { once: true });
    window.addEventListener('touchstart', arm, { once: true, passive: true });
    return () => {
      window.removeEventListener('click', arm);
      window.removeEventListener('keydown', arm);
      window.removeEventListener('touchstart', arm);
    };
  }, []);

  // Main tick loop
  useEffect(() => {
    const tick = () => {
      const t = computeTimeLeft();
      setTimeLeft(t);

      // Detect entering live state (just hit zero)
      if (t.isLive && !prevIsLive.current) {
        playCelebrationSound();
        setIsCelebrationActive(true);
        setIsFlashing(true);
        setTimeout(() => setIsCelebrationActive(false), JUST_HIT_ZERO_DURATION_MS);
        setTimeout(() => setIsFlashing(false), 2000);
      }
      prevIsLive.current = t.isLive;

      // Final-countdown musical tick on each whole-second decrease
      if (
        t.isFinalCountdown &&
        t.seconds !== prevSeconds.current &&
        prevSeconds.current !== -1
      ) {
        playFinalTick(t.seconds);
      }
      prevSeconds.current = t.seconds;

      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, []);

  // Demo override (dev only) — forces visual state for screenshot verification
  const demo = readDemoOverride();
  const isFinalCountdownEffective = demo === 'final' ? true : timeLeft.isFinalCountdown;
  const isLiveEvent = demo === 'zero' ? true : timeLeft.isLive;

  const nextMeetup = getNextMeetup(new Date());

  // Calculate live minutes remaining
  const endTime = getEndTime(nextMeetup);
  const liveDiff = Math.max(0, endTime.getTime() - new Date().getTime());
  const liveMinutes = Math.floor(liveDiff / (1000 * 60));
  const liveProgress = liveMinutes / (MEETUP_DURATION_HOURS * 60);

  const meetupDateStr = nextMeetup.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });

  return (
    <div className="relative min-h-[80vh] flex flex-col items-center justify-center text-center">
      {/* Live confetti: High density for initial celebration, sparse for general live state */}
      {isCelebrationActive && <Confetti count={120} />}
      {!isCelebrationActive && isLiveEvent && <Confetti count={30} />}

      {/* Celebration Overlay */}
      {isCelebrationActive && <CelebrationOverlay />}

      {/* Background Flash */}
      {isFlashing && (
        <div className="fixed inset-0 bg-white/5 z-[55] pointer-events-none animate-flash-in-out" />
      )}

      {/* Hero badge */}
      <div className="mb-6 sm:mb-8 animate-fade-in px-4 sm:px-0">
        {isLiveEvent ? (
          <div className="inline-flex items-center gap-2 px-3 py-1.5 sm:px-4 sm:py-2 rounded-full border border-red-500/40 bg-red-500/10 text-red-400 text-[11px] sm:text-sm font-mono uppercase tracking-widest">
            <span className="w-2 h-2 rounded-full bg-red-500 animate-live-pulse inline-block" />
            Live Now — Longmont AI Meetup
          </div>
        ) : isFinalCountdownEffective ? (
          <div className="inline-flex items-center gap-2 px-3 py-1.5 sm:px-4 sm:py-2 rounded-full border border-[var(--color-pink)]/40 bg-[var(--color-pink)]/10 text-[var(--color-pink)] text-[11px] sm:text-sm font-mono uppercase tracking-widest animate-final-pulse">
            🎵 Final Countdown
          </div>
        ) : (
          <div className="inline-flex items-center gap-2 px-3 py-1.5 sm:px-4 sm:py-2 rounded-full border border-[var(--accent-cyan)]/30 bg-[var(--accent-cyan)]/5 text-[var(--accent-cyan)] text-[11px] sm:text-sm font-mono uppercase tracking-widest">
            <Calendar size={12} className="sm:!hidden" />
            <Calendar size={14} className="hidden sm:block" />
            Every Other Wednesday · {meetupDateStr}
          </div>
        )}
      </div>

      {/* Main heading */}
      <h1 className="text-2xl sm:text-4xl md:text-5xl font-bold mb-6 leading-tight animate-fade-in-delay px-4 sm:px-0">
        {isLiveEvent ? (
          <>
            <span className="text-gradient-vibrant">Meetup in Progress</span>
            <br />
            <span className="text-base sm:text-xl md:text-2xl font-normal text-[var(--text-secondary)]">
              Join the gathering — you're here!
            </span>
          </>
        ) : isFinalCountdownEffective ? (
          <>
            <span className="text-gradient-vibrant">Showtime</span>
            <br />
            <span className="text-base sm:text-xl md:text-2xl font-normal text-[var(--text-secondary)]">
              Starting any moment…
            </span>
          </>
        ) : (
          <>
            Next{' '}
            <span className="text-gradient-vibrant">Longmont AI</span>
            <br />
            <span className="text-base sm:text-xl md:text-2xl font-normal text-[var(--text-secondary)]">
              Meetup Starts In
            </span>
          </>
        )}
      </h1>

      {/* Countdown display: final countdown takes over the 4-digit row */}
      {!isLiveEvent && isFinalCountdownEffective && (
        <FinalCountdownDisplay seconds={timeLeft.seconds} />
      )}

      {/* Standard 4-digit row */}
      {!isLiveEvent && !isFinalCountdownEffective && (
        <div className="flex items-center justify-center gap-2 sm:gap-4 md:gap-5 mb-10 animate-scale-in overflow-x-auto w-full px-4 sm:px-0 py-2">
          <Digit value={timeLeft.days} label="Days" />
          <Separator visible />
          <Digit value={timeLeft.hours} label="Hours" />
          <Separator visible />
          <Digit value={timeLeft.minutes} label="Minutes" />
          <Separator visible />
          <Digit value={timeLeft.seconds} label="Seconds" />
        </div>
      )}

      {/* Animated logo + live countdown ring during the live window */}
      {isLiveEvent && (
        <>
          <AnimatedLogo />
          <div className="relative w-48 h-48 mb-10 animate-scale-in">
            <svg viewBox="0 0 200 200" className="w-full h-full -rotate-90">
              <circle cx="100" cy="100" r="90" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="8" />
              <circle
                cx="100" cy="100" r="90" fill="none"
                stroke="url(#liveGradient)" strokeWidth="8" strokeLinecap="round"
                strokeDasharray={2 * Math.PI * 90}
                strokeDashoffset={2 * Math.PI * 90 * (1 - liveProgress)}
                className="transition-all duration-1000 ease-linear"
              />
              <defs>
                <linearGradient id="liveGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="var(--color-pink)" />
                  <stop offset="100%" stopColor="var(--color-cyan)" />
                </linearGradient>
              </defs>
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-4xl font-bold font-mono text-white">{liveMinutes}</span>
              <span className="text-sm text-[var(--text-muted)] font-mono">minutes</span>
            </div>
          </div>
        </>
      )}

      {/* Meetup details */}
      <div className="flex flex-col sm:flex-row items-center gap-4 text-sm text-[var(--text-secondary)] animate-fade-in-late">
        <div className="flex items-center gap-2">
          <MapPin size={14} className="text-[var(--accent-cyan)]" />
          <span>Longmont, Colorado</span>
        </div>
        <span className="hidden sm:block text-white/20">·</span>
        <div className="flex items-center gap-2">
          <Clock size={14} className="text-[var(--accent-cyan)]" />
          <span>12:00 PM MDT</span>
        </div>
      </div>

      {/* Next meetup date */}
      {!isLiveEvent && !isFinalCountdownEffective && (
        <p className="mt-3 text-sm text-[var(--text-muted)] animate-fade-in-late">
          Next Meetup — {meetupDateStr} at Noon MDT
        </p>
      )}

      {/* CTA during live */}
      {isLiveEvent && (
        <div className="mt-6 animate-fade-in-late">
          <a
            href="https://www.meetup.com/longmontai"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl text-base font-semibold text-white transition-all"
            style={{
              background: 'linear-gradient(135deg, var(--color-purple), var(--color-pink))',
            }}
          >
            Join the Meetup
          </a>
        </div>
      )}

      {/* Pulsing glow behind the counter */}
      {!isLiveEvent && !isFinalCountdownEffective && (
        <div
          className="absolute inset-0 -z-10 flex items-center justify-center pointer-events-none"
          aria-hidden="true"
        >
          <div
            className="w-64 h-64 rounded-full opacity-10 blur-3xl"
            style={{
              background: 'radial-gradient(circle, var(--color-cyan) 0%, transparent 70%)',
            }}
          />
        </div>
      )}
    </div>
  );
};

export default Countdown;