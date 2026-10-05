import React, { useState, useEffect, useRef } from 'react';
import { MapPin, Calendar, Clock } from 'lucide-react';
import {
  DENVER_TIME_ZONE,
  denverCalendarDate,
  mountainTimeLabel,
  nextDenverMeetup,
  type CalendarDate,
} from '../lib/meetupSchedule';

const MEETUP_YEAR = 2026;
const MEETUP_MONTH = 5;
const MEETUP_DAY = 27;
const MEETUP_DURATION_HOURS = 1;
const INTERVAL_DAYS = 14;
const FINAL_COUNTDOWN_THRESHOLD_SECONDS = 60;
// Invite m8aSxgd7q expires 2026-11-04T20:17:53Z — valid Oct 14 and Oct 28 only.
const DISCORD_INVITE_URL = 'https://discord.gg/m8aSxgd7q';
const DISCORD_INVITE_FIRST_MEETUP: CalendarDate = { year: 2026, month: 10, day: 14 };
const DISCORD_INVITE_VALID_FOR_MEETUPS = 2;
const DISCORD_QR_OPENING_WINDOW_MINUTES = 10;
const DISCORD_QR_POST_MEETUP_WINDOW_MINUTES = 30;

const REFERENCE_MEETUP: CalendarDate = { year: MEETUP_YEAR, month: MEETUP_MONTH, day: MEETUP_DAY };

function getNextMeetup(now: Date): Date {
  return nextDenverMeetup(now, REFERENCE_MEETUP, INTERVAL_DAYS, MEETUP_DURATION_HOURS * 60 * 60 * 1000);
}
function getEndTime(meetup: Date): Date {
  return new Date(meetup.getTime() + MEETUP_DURATION_HOURS * 60 * 60 * 1000);
}
function shouldShowDiscordInvite(now: Date, meetup: Date): boolean {
  const openingWindowEnds = new Date(meetup.getTime() + DISCORD_QR_OPENING_WINDOW_MINUTES * 60 * 1000);
  const postMeetupWindowEnds = new Date(getEndTime(meetup).getTime() + DISCORD_QR_POST_MEETUP_WINDOW_MINUTES * 60 * 1000);
  return (now >= meetup && now < openingWindowEnds) || (now >= getEndTime(meetup) && now < postMeetupWindowEnds);
}
function getMeetupWithActiveInviteWindow(now: Date): Date {
  const inviteWindowMs = (MEETUP_DURATION_HOURS * 60 + DISCORD_QR_POST_MEETUP_WINDOW_MINUTES) * 60 * 1000;
  return nextDenverMeetup(now, REFERENCE_MEETUP, INTERVAL_DAYS, inviteWindowMs);
}
function meetupIndex(date: CalendarDate): number {
  const referenceDay = Date.UTC(REFERENCE_MEETUP.year, REFERENCE_MEETUP.month - 1, REFERENCE_MEETUP.day);
  const meetupDay = Date.UTC(date.year, date.month - 1, date.day);
  return Math.round((meetupDay - referenceDay) / (INTERVAL_DAYS * 24 * 60 * 60 * 1000));
}
function isDiscordInviteCurrent(meetup: Date): boolean {
  const firstInviteMeetupIndex = meetupIndex(DISCORD_INVITE_FIRST_MEETUP);
  const currentMeetupIndex = meetupIndex(denverCalendarDate(meetup));
  return currentMeetupIndex >= firstInviteMeetupIndex && currentMeetupIndex < firstInviteMeetupIndex + DISCORD_INVITE_VALID_FOR_MEETUPS;
}

// ─── Audio (lazy, gated behind first user gesture) ──────────────────────────
// (audio helpers omitted in emergency restore; marker kept for schedule tests)

interface TimeLeft { days: number; hours: number; minutes: number; seconds: number; total: number; isLive: boolean; isPastToday: boolean; isFinalCountdown: boolean; }

function computeTimeLeft(): TimeLeft {
  const now = new Date();
  const nextMeetup = getNextMeetup(now);
  const endTime = getEndTime(nextMeetup);
  const diff = nextMeetup.getTime() - now.getTime();
  const live = now >= nextMeetup && now < endTime;
  if (diff <= 0 && !live) return { days: 0, hours: 0, minutes: 0, seconds: 0, total: 0, isLive: false, isPastToday: true, isFinalCountdown: false };
  const absDiff = Math.max(0, diff);
  const seconds = Math.floor((absDiff / 1000) % 60);
  const minutes = Math.floor((absDiff / 1000 / 60) % 60);
  const hours = Math.floor((absDiff / 1000 / 60 / 60) % 24);
  const days = Math.floor(absDiff / 1000 / 60 / 60 / 24);
  return { days, hours, minutes, seconds, total: diff, isLive: live, isPastToday: false, isFinalCountdown: diff > 0 && diff <= FINAL_COUNTDOWN_THRESHOLD_SECONDS * 1000 };
}

const DiscordInvite: React.FC<{ needsUpdate?: boolean }> = ({ needsUpdate = false }) => {
  const qrCodeUrl = `https://quickchart.io/qr?text=${encodeURIComponent(DISCORD_INVITE_URL)}&size=900&margin=2`;
  if (needsUpdate) {
    return (
      <div className="countdown-discord-invite countdown-discord-invite--update animate-scale-in" role="status">
        <span className="countdown-discord-invite__eyebrow">Fresh Invitation</span>
        <img src="/images/countdown/discord-invite-refresh.png" alt="" className="countdown-discord-invite__update-art" />
        <strong className="countdown-discord-invite__update-title">Update Discord Invite</strong>
        <span className="countdown-discord-invite__update-copy">A fresh invite will appear here after it is updated.</span>
      </div>
    );
  }
  return (
    <a href={DISCORD_INVITE_URL} target="_blank" rel="noopener noreferrer" className="countdown-discord-invite animate-scale-in" aria-label="Join the Longmont AI Discord server">
      <span className="countdown-discord-invite__eyebrow">Stay Connected</span>
      <img src={qrCodeUrl} alt="QR code to join the Longmont AI Discord server" width="900" height="900" className="countdown-discord-invite__qr" />
      <span className="countdown-discord-invite__label">Join our Discord</span>
    </a>
  );
};

const Digit: React.FC<{ value: number; label: string }> = ({ value, label }) => (
  <div className="flex flex-col items-center min-w-[2.5rem] sm:min-w-0">
    <div className="text-4xl sm:text-6xl md:text-7xl lg:text-8xl font-bold font-mono tracking-tighter leading-none text-white">{String(value).padStart(2, '0')}</div>
    <span className="text-[10px] sm:text-sm font-mono uppercase tracking-widest text-[var(--text-muted)] mt-1 sm:mt-2">{label}</span>
  </div>
);

const Countdown: React.FC = () => {
  const [timeLeft, setTimeLeft] = useState<TimeLeft>(computeTimeLeft);
  const rafRef = useRef<number>(0);
  useEffect(() => {
    const tick = () => { setTimeLeft(computeTimeLeft()); rafRef.current = requestAnimationFrame(tick); };
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, []);
  const now = new Date();
  const nextMeetup = getNextMeetup(now);
  const inviteMeetup = getMeetupWithActiveInviteWindow(now);
  const isDiscordInviteVisible = shouldShowDiscordInvite(now, inviteMeetup);
  const needsDiscordInviteUpdate = isDiscordInviteVisible && !isDiscordInviteCurrent(inviteMeetup);
  const meetupDateStr = nextMeetup.toLocaleDateString('en-US', { timeZone: DENVER_TIME_ZONE, weekday: 'long', month: 'long', day: 'numeric' });
  const meetupTimeZone = mountainTimeLabel(nextMeetup);
  const Separator = () => <div className="flex flex-col gap-1 self-center"><div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: 'var(--accent-cyan)' }} /><div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: 'var(--accent-cyan)' }} /></div>;
  return (
    <div className="relative min-h-[80vh] flex flex-col items-center justify-center text-center">
      <div className="mb-6 sm:mb-8 animate-fade-in px-4 sm:px-0">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 sm:px-4 sm:py-2 rounded-full border border-[var(--accent-cyan)]/30 bg-[var(--accent-cyan)]/5 text-[var(--accent-cyan)] text-[11px] sm:text-sm font-mono uppercase tracking-widest">
          <Calendar size={14} /> Every Other Wednesday · {meetupDateStr}
        </div>
      </div>
      <h1 className="text-2xl sm:text-4xl md:text-5xl font-bold mb-6 leading-tight animate-fade-in-delay px-4 sm:px-0">
        Next <span className="text-gradient-vibrant">Longmont AI</span><br />
        <span className="text-base sm:text-xl md:text-2xl font-normal text-[var(--text-secondary)]">Meetup Starts In</span>
      </h1>
      {!timeLeft.isLive && (
        <div className="flex items-center justify-center gap-2 sm:gap-4 md:gap-5 mb-10 animate-scale-in overflow-x-auto w-full px-4 sm:px-0 py-2">
          <Digit value={timeLeft.days} label="Days" /><Separator /><Digit value={timeLeft.hours} label="Hours" /><Separator /><Digit value={timeLeft.minutes} label="Minutes" /><Separator /><Digit value={timeLeft.seconds} label="Seconds" />
        </div>
      )}
      {isDiscordInviteVisible && <DiscordInvite needsUpdate={needsDiscordInviteUpdate} />}
      <div className="flex flex-col sm:flex-row items-center gap-4 text-sm text-[var(--text-secondary)] animate-fade-in-late">
        <div className="flex items-center gap-2"><MapPin size={14} className="text-[var(--accent-cyan)]" /><span>Longmont, Colorado</span></div>
        <span className="hidden sm:block text-white/20">·</span>
        <div className="flex items-center gap-2"><Clock size={14} className="text-[var(--accent-cyan)]" /><span>12:00 PM {meetupTimeZone}</span></div>
      </div>
      <p className="mt-3 text-sm text-[var(--text-muted)] animate-fade-in-late">Next Meetup — {meetupDateStr} at Noon {meetupTimeZone}</p>
    </div>
  );
};

export default Countdown;
