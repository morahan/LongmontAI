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

// Stable reference: May 27, 2026 noon = upcoming meetup
const REFERENCE_MEETUP = new Date(MEETUP_YEAR, MEETUP_MONTH - 1, MEETUP_DAY, MEETUP_HOUR, 0, 0, 0);

function getNextMeetup(localNow: Date): Date {
  // Advance from reference in 14-day steps until we find a future meetup
  let next = new Date(REFERENCE_MEETUP);
  while (next.getTime() <= localNow.getTime()) {
    next = new Date(next.getTime() + INTERVAL_DAYS * 24 * 60 * 60 * 1000);
  }
  return next;
}

interface TimeLeft {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  total: number;
  isLive: boolean;
  isPastToday: boolean;
}

function getEndTime(meetup: Date): Date {
  return new Date(meetup.getTime() + MEETUP_DURATION_HOURS * 60 * 60 * 1000);
}

function computeTimeLeft(): TimeLeft {
  const now = new Date();
  const nextMeetup = getNextMeetup(now);
  const endTime = getEndTime(nextMeetup);
  const diff = nextMeetup.getTime() - now.getTime();

  const live = now >= nextMeetup && now < endTime;

  if (diff <= 0 && !live) {
    return { days: 0, hours: 0, minutes: 0, seconds: 0, total: 0, isLive: false, isPastToday: true };
  }

  const seconds = Math.floor((diff / 1000) % 60);
  const minutes = Math.floor((diff / 1000 / 60) % 60);
  const hours = Math.floor((diff / 1000 / 60 / 60) % 24);
  const days = Math.floor(diff / 1000 / 60 / 60 / 24);

  return { days, hours, minutes, seconds, total: diff, isLive: live, isPastToday: false };
}

interface DigitProps {
  value: number;
  label: string;
}
const Digit: React.FC<DigitProps> = ({ value, label }) => {
  return (
    <div className="flex flex-col items-center">
      <div className="text-6xl sm:text-7xl md:text-8xl font-bold font-mono tracking-tighter leading-none text-white">
        {String(value).padStart(2, '0')}
      </div>
      <span className="text-xs sm:text-sm font-mono uppercase tracking-widest text-[var(--text-muted)] mt-2">
        {label}
      </span>
    </div>
  );
};

interface SeparatorProps {
  visible: boolean;
}

const Separator: React.FC<SeparatorProps> = ({ visible }) => (
  <div className="flex flex-col gap-2 self-start mt-4 sm:mt-5">
    <div
      className="w-2 h-2 rounded-full"
      style={{ backgroundColor: visible ? 'var(--accent-cyan)' : 'rgba(255,255,255,0.15)' }}
    />
    <div
      className="w-2 h-2 rounded-full"
      style={{ backgroundColor: visible ? 'var(--accent-cyan)' : 'rgba(255,255,255,0.15)' }}
    />
  </div>
);

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

function Confetti() {
  const pieces = React.useMemo<ConfettiPiece[]>(() => {
    return Array.from({ length: 60 }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      color: CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)],
      size: Math.random() * 8 + 4,
      delay: Math.random() * 2,
      duration: Math.random() * 2 + 2,
      rotation: Math.random() * 360,
      drift: (Math.random() - 0.5) * 120,
    }));
  }, []);

  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden z-0" aria-hidden="true">
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

const Countdown: React.FC = () => {
  const [timeLeft, setTimeLeft] = useState<TimeLeft>(computeTimeLeft);
  const rafRef = useRef<number>(0);

  useEffect(() => {
    const tick = () => {
      const t = computeTimeLeft();
      setTimeLeft(t);
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, []);

  const nextMeetup = getNextMeetup(new Date());
  const isLiveEvent = timeLeft.isLive;
  const isWednesday = new Date().getDay() === 3;

  const meetupDateStr = nextMeetup.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });

  return (
    <div className="relative min-h-[80vh] flex flex-col items-center justify-center text-center">
      {/* Live confetti */}
      {isLiveEvent && <Confetti />}

      {/* Hero badge */}
      <div className="mb-8 animate-fade-in">
        {isLiveEvent ? (
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-red-500/40 bg-red-500/10 text-red-400 text-sm font-mono uppercase tracking-widest">
            <span className="w-2 h-2 rounded-full bg-red-500 animate-live-pulse inline-block" />
            Live Now — Longmont AI Meetup
          </div>
        ) : (
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-[var(--accent-cyan)]/30 bg-[var(--accent-cyan)]/5 text-[var(--accent-cyan)] text-sm font-mono uppercase tracking-widest">
            <Calendar size={14} />
            Every Other Wednesday · {meetupDateStr}
          </div>
        )}
      </div>

      {/* Main heading */}
      <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-6 leading-tight animate-fade-in-delay">
        {isLiveEvent ? (
          <>
            <span className="text-gradient-vibrant">Meetup in Progress</span>
            <br />
            <span className="text-[var(--text-secondary)] text-xl sm:text-2xl font-normal">
              Join the gathering — you're here!
            </span>
          </>
        ) : (
          <>
            Next{' '}
            <span className="text-gradient-vibrant">Longmont AI</span>
            <br />
            <span className="text-[var(--text-secondary)] text-xl sm:text-2xl font-normal">
              Meetup Starts In
            </span>
          </>
        )}
      </h1>

      {/* Countdown display */}
      {!isLiveEvent && (
        <div className="flex items-start gap-3 sm:gap-4 md:gap-5 mb-10 animate-scale-in">
          <Digit value={timeLeft.days} label="Days" />
          <Separator visible />
          <Digit value={timeLeft.hours} label="Hours" />
          <Separator visible />
          <Digit value={timeLeft.minutes} label="Minutes" />
          <Separator visible />
          <Digit value={timeLeft.seconds} label="Seconds" />
        </div>
      )}

      {/* Live countdown ring */}
      {isLiveEvent && (
        <div className="relative w-48 h-48 mb-10 animate-scale-in">
          <svg viewBox="0 0 200 200" className="w-full h-full -rotate-90">
            <circle cx="100" cy="100" r="90" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="8" />
            <circle
              cx="100" cy="100" r="90" fill="none"
              stroke="url(#liveGradient)" strokeWidth="8" strokeLinecap="round"
              strokeDasharray={2 * Math.PI * 90}
              className="animate-ring-spin"
            />
            <defs>
              <linearGradient id="liveGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="var(--color-pink)" />
                <stop offset="100%" stopColor="var(--color-cyan)" />
              </linearGradient>
            </defs>
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-4xl font-bold font-mono text-white">60</span>
            <span className="text-sm text-[var(--text-muted)] font-mono">minutes</span>
          </div>
        </div>
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
      {!isLiveEvent && (
        <p className="mt-3 text-sm text-[var(--text-muted)] animate-fade-in-late">
          {isWednesday && !timeLeft.isPastToday
            ? "Today's Meetup — Wednesday at Noon MDT"
            : `Next Meetup — ${meetupDateStr} at Noon MDT`}
        </p>
      )}

      {/* CTA during live */}
      {isLiveEvent && (
        <div className="mt-6 animate-fade-in-late">
          <a
            href="https://www.meetup.com/longmont-ai-for-business-owners-and-creators"
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
      {!isLiveEvent && (
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
