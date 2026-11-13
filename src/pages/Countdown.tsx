import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Calendar, Clock, MapPin, VolumeX } from 'lucide-react';
import {
  DENVER_TIME_ZONE,
  denverCalendarDate,
  mountainTimeLabel,
  nextDenverMeetup,
  type CalendarDate,
} from '../lib/meetupSchedule';
import {
  CELEBRATION_MS,
  FINAL_COUNTDOWN_MS,
  SONG,
  finalEnergy,
  showPhase,
  songFrame,
  songJoin,
  songVideoTime,
  type Phase,
  type SongFrame,
} from '../lib/countdownShow';

// ─── LongmontAI Meetup Schedule ─────────────────────────────────────────────
// Every other Wednesday at noon (America/Denver, MST or MDT)
// Hardcoded reference: May 27, 2026 is a Wednesday meetup day.
// Subsequent meetups are every 14 days from that date.
const MEETUP_YEAR = 2026;
const MEETUP_MONTH = 5; // 1-indexed
const MEETUP_DAY = 27;
const MEETUP_DURATION_HOURS = 1;
const INTERVAL_DAYS = 14;
// Update these together when rotating Discord invites (match Discord expires_at).
// Invite rU9JxSmXj expires 2026-12-11T17:47:58Z (Dec 11, 2026 10:47 AM MST), so
// valid for Nov 11, Nov 25, and Dec 9 — Dec 23 noon Denver is after expiry.
// The QR code and its click-through link both derive from this one URL (quickchart).
const DISCORD_INVITE_URL = 'https://discord.gg/rU9JxSmXj';
const DISCORD_INVITE_FIRST_MEETUP: CalendarDate = { year: 2026, month: 11, day: 11 };
const DISCORD_INVITE_VALID_FOR_MEETUPS = 3;
const DISCORD_QR_OPENING_WINDOW_MINUTES = 10;
const DISCORD_QR_POST_MEETUP_WINDOW_MINUTES = 30;

// Stable reference: May 27, 2026 at noon in America/Denver.
const REFERENCE_MEETUP: CalendarDate = {
  year: MEETUP_YEAR,
  month: MEETUP_MONTH,
  day: MEETUP_DAY,
};

function getNextMeetup(now: Date): Date {
  return nextDenverMeetup(
    now,
    REFERENCE_MEETUP,
    INTERVAL_DAYS,
    MEETUP_DURATION_HOURS * 60 * 60 * 1000,
  );
}

function getEndTime(meetup: Date): Date {
  return new Date(meetup.getTime() + MEETUP_DURATION_HOURS * 60 * 60 * 1000);
}

function shouldShowDiscordInvite(now: Date, meetup: Date): boolean {
  const openingWindowEnds = new Date(meetup.getTime() + DISCORD_QR_OPENING_WINDOW_MINUTES * 60 * 1000);
  const postMeetupWindowEnds = new Date(
    getEndTime(meetup).getTime() + DISCORD_QR_POST_MEETUP_WINDOW_MINUTES * 60 * 1000,
  );

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

  return currentMeetupIndex >= firstInviteMeetupIndex
    && currentMeetupIndex < firstInviteMeetupIndex + DISCORD_INVITE_VALID_FOR_MEETUPS;
}

interface TimeParts {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
}

function timeParts(msUntilMeetup: number): TimeParts {
  const totalSeconds = Math.floor(Math.max(0, msUntilMeetup) / 1000);
  return {
    days: Math.floor(totalSeconds / 86400),
    hours: Math.floor(totalSeconds / 3600) % 24,
    minutes: Math.floor(totalSeconds / 60) % 60,
    seconds: totalSeconds % 60,
  };
}

// ─── Audio (lazy, gated behind first user gesture) ──────────────────────────
let audioContext: AudioContext | null = null;
let reducedMotion = false;

function armAudioContext() {
  try {
    const Ctx = window.AudioContext || (window as any).webkitAudioContext;
    if (!Ctx) return;
    audioContext ??= new Ctx();
    if (audioContext.state === 'suspended') void audioContext.resume();
  } catch {
    audioContext = null;
  }
}

function playableAudioContext(): AudioContext | null {
  if (reducedMotion || !audioContext || audioContext.state !== 'running') return null;
  return audioContext;
}

function hasUserActivation(): boolean {
  return navigator.userActivation?.hasBeenActive ?? false;
}

function detectReducedMotion() {
  try {
    reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  } catch {
    reducedMotion = false;
  }
}

// Unpitched so it sits under the song instead of clashing with its key.
function playSubKick() {
  const ctx = playableAudioContext();
  if (!ctx) return;
  const now = ctx.currentTime;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(110, now);
  osc.frequency.exponentialRampToValueAtTime(45, now + 0.18);
  gain.gain.setValueAtTime(0, now);
  gain.gain.linearRampToValueAtTime(0.26, now + 0.006);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
  osc.connect(gain).connect(ctx.destination);
  osc.start(now);
  osc.stop(now + 0.32);
}

function playZeroHit() {
  const ctx = playableAudioContext();
  if (!ctx) return;
  const now = ctx.currentTime;
  const master = ctx.createGain();
  master.gain.setValueAtTime(0.22, now);
  master.connect(ctx.destination);

  const voice = (
    type: OscillatorType,
    freq: number,
    start: number,
    duration: number,
    peak: number,
    destination: AudioNode = master,
  ) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, start);
    gain.gain.setValueAtTime(0, start);
    gain.gain.linearRampToValueAtTime(peak, start + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.001, start + duration);
    osc.connect(gain).connect(destination);
    osc.start(start);
    osc.stop(start + duration + 0.02);
    return osc;
  };

  const boom = voice('sine', 110, now, 1.8, 1);
  boom.frequency.exponentialRampToValueAtTime(55, now + 0.12);

  const stabFilter = ctx.createBiquadFilter();
  stabFilter.type = 'lowpass';
  stabFilter.frequency.setValueAtTime(2400, now);
  stabFilter.frequency.exponentialRampToValueAtTime(500, now + 1.3);
  stabFilter.connect(master);
  for (const freq of [440, 554.37, 659.25, 880]) {
    voice('sawtooth', freq, now, 1.5, 0.13, stabFilter);
  }

  [880, 1108.73, 1318.51, 1760].forEach((freq, index) => {
    voice('triangle', freq, now + 0.45 + index * 0.09, 0.4, 0.16);
  });
}

// ─── Demo override (dev only) ───────────────────────────────────────────────
type DemoOverride = 'final' | 'zero' | 'invite' | 'invite-expired' | 'post-invite';

const DEMO_STAGE: Record<DemoOverride, { phase: Phase; invite: boolean }> = {
  final: { phase: 'final', invite: false },
  zero: { phase: 'live', invite: false },
  invite: { phase: 'live', invite: true },
  'invite-expired': { phase: 'live', invite: true },
  'post-invite': { phase: 'afterparty', invite: true },
};

function readDemoOverride(): DemoOverride | null {
  // Only honored in dev so production users see real timer behavior.
  // import.meta.env.DEV is replaced by Vite at build time.
  // @ts-ignore
  if (typeof import.meta === 'undefined' || !import.meta.env?.DEV) return null;
  const v = new URLSearchParams(window.location.search).get('demo');
  return v !== null && v in DEMO_STAGE ? (v as DemoOverride) : null;
}

// ─── Song layer ─────────────────────────────────────────────────────────────
// The site CSP is script-src 'self', so the YouTube IFrame API script cannot load.
// The embed speaks the same JSON protocol over postMessage without it.
const YOUTUBE_ORIGIN = 'https://www.youtube-nocookie.com';
const YOUTUBE_PLAYING = 1;
const YOUTUBE_BUFFERING = 3;
const SONG_DRIFT_TOLERANCE_SECONDS = 1;
const SONG_SEEK_INTERVAL_MS = 2000;
const SONG_RETRY_INTERVAL_MS = 500;
const SOUND_PROMPT_LEAD_SECONDS = 600;

interface PlayerReport {
  currentTime?: number;
  playerState?: number;
  muted?: boolean;
}

function parsePlayerReport(data: unknown): PlayerReport | null {
  if (typeof data !== 'string') return null;
  try {
    const message = JSON.parse(data);
    const info = message?.info;
    if (!info || typeof info !== 'object') return null;
    const report: PlayerReport = {};
    if (typeof info.currentTime === 'number') report.currentTime = info.currentTime;
    if (typeof info.playerState === 'number') report.playerState = info.playerState;
    if (typeof info.muted === 'boolean') report.muted = info.muted;
    return report;
  } catch {
    return null;
  }
}

interface SongLayerProps {
  frame: SongFrame;
  soundArmed: boolean;
  videoTimeNow: () => number;
  onSoundBlocked: () => void;
}

const SongLayer: React.FC<SongLayerProps> = ({ frame, soundArmed, videoTimeNow, onSoundBlocked }) => {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  // Always starts at SONG.startAt, even when joining mid-song: an embed asked to autoplay
  // from a later start sometimes never leaves the unstarted state. The drift correction
  // below seeks a late joiner to the right place once playback is running.
  const src = `${YOUTUBE_ORIGIN}/embed/${SONG.videoId}?enablejsapi=1&autoplay=1&mute=1&controls=0`
    + `&start=${SONG.startAt}&playsinline=1&rel=0&disablekb=1&iv_load_policy=3`
    + `&origin=${encodeURIComponent(window.location.origin)}`;
  const player = useRef({
    loaded: false,
    heard: false,
    inSync: false,
    captionsOff: false,
    unmuteSent: false,
    report: {} as PlayerReport,
    sentVolume: -1,
    listenedAt: 0,
    unmutedAt: 0,
    playedAt: 0,
    soughtAt: 0,
  });

  const post = useCallback((message: Record<string, unknown>) => {
    iframeRef.current?.contentWindow?.postMessage(
      JSON.stringify({ ...message, id: 1, channel: 'widget' }),
      YOUTUBE_ORIGIN,
    );
  }, []);

  useEffect(() => {
    const onMessage = (event: MessageEvent) => {
      if (event.origin !== YOUTUBE_ORIGIN || event.source !== iframeRef.current?.contentWindow) return;
      const state = player.current;
      state.heard = true;
      const report = parsePlayerReport(event.data);
      if (!report) return;
      Object.assign(state.report, report);
      if (report.currentTime === undefined || state.report.playerState !== YOUTUBE_PLAYING) return;

      const expected = videoTimeNow();
      state.inSync = Math.abs(report.currentTime - expected) <= SONG_DRIFT_TOLERANCE_SECONDS;
      if (!state.inSync && performance.now() - state.soughtAt > SONG_SEEK_INTERVAL_MS) {
        state.soughtAt = performance.now();
        post({ event: 'command', func: 'seekTo', args: [expected, true] });
      }
    };
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, [post, videoTimeNow]);

  // Runs on every clock frame: each branch only posts when the player is behind the frame.
  useEffect(() => {
    const state = player.current;
    if (!state.loaded) return;
    const at = performance.now();

    if (!state.heard) {
      if (at - state.listenedAt > SONG_RETRY_INTERVAL_MS) {
        state.listenedAt = at;
        post({ event: 'listening' });
      }
      return;
    }

    if (!state.captionsOff && state.report.playerState === YOUTUBE_PLAYING) {
      state.captionsOff = true;
      post({ event: 'command', func: 'unloadModule', args: ['captions'] });
    }

    const { playerState } = state.report;
    // Unmuting before playback has started turns the muted autoplay into a blocked unmuted one,
    // and a late joiner stays silent until the seek to the right place has landed.
    if (soundArmed && playerState === YOUTUBE_PLAYING && state.inSync) {
      if (frame.volume !== state.sentVolume) {
        state.sentVolume = frame.volume;
        post({ event: 'command', func: 'setVolume', args: [frame.volume] });
      }
      if (state.report.muted !== false && at - state.unmutedAt > SONG_RETRY_INTERVAL_MS) {
        state.unmutedAt = at;
        state.unmuteSent = true;
        post({ event: 'command', func: 'unMute', args: [] });
      }
    }

    if (playerState !== YOUTUBE_PLAYING && playerState !== YOUTUBE_BUFFERING && at - state.playedAt > SONG_SEEK_INTERVAL_MS) {
      state.playedAt = at;
      if (state.unmuteSent) {
        // The browser stopped playback when we unmuted, so the page's activation did not
        // reach the player. Fall back to muted playback and ask for a fresh gesture.
        state.unmuteSent = false;
        state.sentVolume = -1;
        post({ event: 'command', func: 'mute', args: [] });
        onSoundBlocked();
      }
      // An autoplay that never left the unstarted state ignores playVideo alone.
      post({ event: 'command', func: 'seekTo', args: [videoTimeNow(), true] });
      post({ event: 'command', func: 'playVideo', args: [] });
    }
  });

  return (
    <div className="countdown-song" style={{ opacity: frame.opacity }}>
      <iframe
        ref={iframeRef}
        src={src}
        title="The Final Countdown by Europe"
        allow="autoplay; encrypted-media"
        referrerPolicy="strict-origin-when-cross-origin"
        tabIndex={-1}
        aria-hidden="true"
        onLoad={() => {
          player.current.loaded = true;
          player.current.listenedAt = performance.now();
          player.current.playedAt = performance.now();
          post({ event: 'listening' });
        }}
      />
      <div className="countdown-song__scrim" />
    </div>
  );
};

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

type FinalTier = 'calm' | 'beat' | 'ten';

const RING_RADIUS = 96;
const RING_LENGTH = 2 * Math.PI * RING_RADIUS;

function finalTier(seconds: number): FinalTier {
  if (seconds <= 10) return 'ten';
  if (seconds <= 30) return 'beat';
  return 'calm';
}

const FinalCountdownDisplay: React.FC<{ seconds: number; progress: number }> = ({ seconds, progress }) => {
  const tier = finalTier(seconds);
  const isSlam = seconds <= 3;
  const motion = isSlam ? 'slam' : tier === 'calm' ? 'breathe' : 'beat';
  return (
    <div className="countdown-final" data-tier={tier}>
      <h1 className="countdown-final__eyebrow">{tier === 'ten' ? 'Here we go' : 'The Final Countdown'}</h1>
      <div className="countdown-final__dial">
        <svg className="countdown-final__ring" viewBox="0 0 200 200" aria-hidden="true">
          <defs>
            <linearGradient id="countdown-ring-gradient" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" style={{ stopColor: 'var(--color-cyan)' }} />
              <stop offset="55%" style={{ stopColor: 'var(--color-purple)' }} />
              <stop offset="100%" style={{ stopColor: 'var(--color-pink)' }} />
            </linearGradient>
          </defs>
          <circle className="countdown-final__ring-track" cx="100" cy="100" r={RING_RADIUS} />
          <circle
            className="countdown-final__ring-progress"
            cx="100"
            cy="100"
            r={RING_RADIUS}
            stroke="url(#countdown-ring-gradient)"
            strokeDasharray={RING_LENGTH}
            strokeDashoffset={RING_LENGTH * (1 - progress)}
          />
        </svg>
        {/* Keyed by the second so each one-shot animation replays in step with the clock. */}
        {tier !== 'calm' && <span key={`pulse-${seconds}`} className="countdown-final__pulse" />}
        {tier === 'ten' && (
          <span key={`echo-${seconds}`} className="countdown-final__pulse countdown-final__pulse--echo" />
        )}
        <div
          key={isSlam ? `shake-${seconds}` : 'steady'}
          className={`countdown-final__number${isSlam ? ' countdown-final__number--shake' : ''}`}
          style={{ '--core': tier === 'ten' ? (10 - seconds) / 9 : 0 } as React.CSSProperties}
        >
          <span
            key={tier === 'calm' ? 'calm' : seconds}
            className={`countdown-final__digit countdown-final__digit--${motion}`}
            role="timer"
          >
            {seconds}
          </span>
        </div>
      </div>
      <p className="countdown-final__caption">{tier === 'ten' ? 'almost there' : 'seconds to showtime'}</p>
    </div>
  );
};

const LOGO_INTRO_MS = 5000;
const LOGO_SEQUENCE_URL = '/brand/logo/logo-sequence.mp4';
// The orbit clip's three loops fill the first 435 frames at 24 fps, then the AI to SI morph begins.
const LOGO_MORPH_AT_S = 435 / 24;

// No single video format with alpha plays in every browser, so the logo sequence is an
// H.264 video with premultiplied colour stacked over its alpha. WebGL recombines the halves.
const QUAD_SHADER = `
attribute vec2 position;
varying vec2 uv;
void main() {
  uv = vec2(position.x * 0.5 + 0.5, 0.5 - position.y * 0.5);
  gl_Position = vec4(position, 0.0, 1.0);
}`;
const STACKED_ALPHA_SHADER = `
precision mediump float;
uniform sampler2D frame;
varying vec2 uv;
void main() {
  vec3 colour = texture2D(frame, vec2(uv.x, uv.y * 0.5)).rgb;
  float alpha = texture2D(frame, vec2(uv.x, 0.5 + uv.y * 0.5)).r;
  gl_FragColor = vec4(colour, alpha);
}`;

// Plays the stacked video once onto the canvas, holding its last frame. Returns a stop function.
function playStackedAlphaVideo(
  canvas: HTMLCanvasElement,
  src: string,
  delayMs: number,
  onFirstFrame: () => void,
  cue: { atSeconds: number; run: () => void },
) {
  const gl = canvas.getContext('webgl', { premultipliedAlpha: true });
  if (!gl) return () => {};
  const program = gl.createProgram()!;
  for (const [type, source] of [[gl.VERTEX_SHADER, QUAD_SHADER], [gl.FRAGMENT_SHADER, STACKED_ALPHA_SHADER]] as const) {
    const shader = gl.createShader(type)!;
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    gl.attachShader(program, shader);
  }
  gl.linkProgram(program);
  gl.useProgram(program);
  gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
  const position = gl.getAttribLocation(program, 'position');
  gl.enableVertexAttribArray(position);
  gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);
  gl.bindTexture(gl.TEXTURE_2D, gl.createTexture());
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);

  const video = document.createElement('video');
  video.muted = true;
  video.playsInline = true;
  video.preload = 'auto';
  video.src = src;

  let frame = 0;
  let drawn = false;
  let cued = false;
  const draw = () => {
    if (canvas.width !== video.videoWidth) {
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight / 2;
      gl.viewport(0, 0, canvas.width, canvas.height);
    }
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, video);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    if (!drawn) {
      drawn = true;
      onFirstFrame();
    }
    if (!cued && video.currentTime >= cue.atSeconds) {
      cued = true;
      cue.run();
    }
  };
  const loop = () => {
    draw();
    if (!video.ended) frame = requestAnimationFrame(loop);
  };
  video.addEventListener('ended', draw);
  const timer = window.setTimeout(() => {
    video.play().then(() => { frame = requestAnimationFrame(loop); }).catch(() => {});
  }, delayMs);

  return () => {
    window.clearTimeout(timer);
    cancelAnimationFrame(frame);
    video.removeEventListener('ended', draw);
    video.pause();
    video.removeAttribute('src');
    video.load();
  };
}

// The first logo plays for five seconds, then the orbit clip runs three times and
// turns into the AI to SI morph, which holds on its last frame.
const AnimatedLogo: React.FC<{ compact?: boolean; onMorph?: () => void }> = ({ compact = false, onMorph }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [sequenceShown, setSequenceShown] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    return playStackedAlphaVideo(canvas, LOGO_SEQUENCE_URL, LOGO_INTRO_MS, () => setSequenceShown(true), {
      atSeconds: LOGO_MORPH_AT_S,
      run: () => onMorph?.(),
    });
  }, [onMorph]);

  return (
    <div
      className={`countdown-logo relative flex items-center justify-center my-6 ${compact ? 'countdown-logo-compact' : ''}`}
      data-stage={sequenceShown ? 'sequence' : 'intro'}
    >
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
        className="countdown-logo__intro relative w-[min(60vw,480px)] h-auto drop-shadow-[0_0_60px_rgba(121,40,202,0.5)] rounded-2xl"
        aria-label="Longmont AI animated logo"
      >
        <source src="/brand/logo/logo-animated.webm" type="video/webm" />
        <source src="/brand/logo/logo-animated-512.mp4" type="video/mp4" />
        <img src="/brand/logo/logo-animated-poster.png" alt="Longmont AI" />
      </video>
      <canvas ref={canvasRef} className="countdown-logo__sequence" aria-hidden="true" />
    </div>
  );
};

const DiscordInvite: React.FC<{ needsUpdate?: boolean }> = ({ needsUpdate = false }) => {
  const qrCodeUrl = `https://quickchart.io/qr?text=${encodeURIComponent(DISCORD_INVITE_URL)}&size=900&margin=2`;

  if (needsUpdate) {
    return (
      <div className="countdown-discord-invite countdown-discord-invite--update animate-scale-in" role="status">
        <span className="countdown-discord-invite__eyebrow">Fresh Invitation</span>
        <img
          src="/images/countdown/discord-invite-refresh.png"
          alt=""
          className="countdown-discord-invite__update-art"
        />
        <strong className="countdown-discord-invite__update-title">Update Discord Invite</strong>
        <span className="countdown-discord-invite__update-copy">A fresh invite will appear here after it is updated.</span>
      </div>
    );
  }

  return (
    <a
      href={DISCORD_INVITE_URL}
      target="_blank"
      rel="noopener noreferrer"
      className="countdown-discord-invite animate-scale-in"
      aria-label="Join the Longmont AI Discord server"
    >
      <span className="countdown-discord-invite__eyebrow">Stay Connected</span>
      <img
        src={qrCodeUrl}
        alt="QR code to join the Longmont AI Discord server"
        width="900"
        height="900"
        className="countdown-discord-invite__qr"
      />
      <span className="countdown-discord-invite__label">Join our Discord</span>
    </a>
  );
};

// ─── Confetti ───────────────────────────────────────────────────────────────
const CONFETTI_COLORS = [
  'var(--color-cyan)',
  'var(--color-purple)',
  'var(--color-pink)',
  'var(--color-sunset)',
  'var(--color-blue)',
  '#ffffff',
];

function randomConfettiColor(): string {
  return CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)];
}

const Confetti = React.memo(function Confetti({ count, stopped }: { count: number; stopped: boolean }) {
  const [pieces] = useState(() =>
    Array.from({ length: count }, (_, id) => ({
      id,
      style: {
        '--cx': `${Math.random() * 100}vw`,
        '--cdrift': `${(Math.random() - 0.5) * 150}px`,
        '--crot': `${Math.random() * 360}deg`,
        '--cdur': `${Math.random() * 3 + 3}s`,
        '--cdelay': `${Math.random() * 5}s`,
        width: Math.random() * 8 + 4,
        aspectRatio: '1',
        backgroundColor: randomConfettiColor(),
        borderRadius: Math.random() > 0.5 ? '50%' : '2px',
      } as React.CSSProperties,
    })),
  );

  return (
    <div className={`countdown-confetti${stopped ? ' countdown-confetti--stopped' : ''}`} aria-hidden="true">
      {pieces.map((piece) => (
        <div key={piece.id} className="confetti-fall" style={piece.style} />
      ))}
    </div>
  );
});

const BURST_PIECES = 110;

const ConfettiBurst = React.memo(function ConfettiBurst() {
  const [pieces] = useState(() =>
    Array.from({ length: BURST_PIECES }, (_, id) => ({
      id,
      style: {
        '--burst-angle': `${Math.random() * 360}deg`,
        '--burst-distance': `${12 + Math.random() * 46}vmax`,
        '--burst-spin': `${(Math.random() - 0.5) * 1080}deg`,
        '--burst-size': `${6 + Math.random() * 10}px`,
        '--burst-color': randomConfettiColor(),
        '--delay': `${Math.random() * 0.12}s`,
      } as React.CSSProperties,
    })),
  );

  return (
    <div className="countdown-burst">
      {pieces.map((piece) => (
        <span key={piece.id} className="countdown-burst__piece" style={piece.style}>
          <i />
        </span>
      ))}
    </div>
  );
});

// Every animation is offset by how far into the celebration the page mounted, so a
// reload or a demo that starts after zero lands on the same frame as everyone else.
const Celebration: React.FC<{ elapsedMs: number }> = ({ elapsedMs }) => {
  const [mountedAtMs] = useState(elapsedMs);
  return (
    <div
      className="countdown-celebration"
      style={
        {
          '--celebration-elapsed': `${mountedAtMs}ms`,
          '--celebration-duration': `${CELEBRATION_MS}ms`,
        } as React.CSSProperties
      }
    >
      <span className="countdown-celebration__shockwave" aria-hidden="true" />
      <span className="countdown-celebration__shockwave" aria-hidden="true" />
      <span className="countdown-celebration__shockwave" aria-hidden="true" />
      <ConfettiBurst />
      <div className="countdown-celebration__headline">
        <h1 className="countdown-celebration__title">IT'S TIME!</h1>
        <p className="countdown-celebration__subtitle">Longmont AI Meetup is live</p>
      </div>
      <div className="countdown-celebration__flash" aria-hidden="true" />
    </div>
  );
};

// ─── Main page ──────────────────────────────────────────────────────────────
interface Tick {
  now: Date;
  nextMeetup: Date;
  songJoinedAt: number | null;
}

function readTick(now: Date, previous: Tick | null): Tick {
  const nextMeetup = getNextMeetup(now);
  const msUntilMeetup = nextMeetup.getTime() - now.getTime();
  return { now, nextMeetup, songJoinedAt: songJoin(previous?.songJoinedAt ?? null, msUntilMeetup) };
}

const realNow = () => new Date();

const Countdown: React.FC<{ now?: () => Date }> = ({ now = realNow }) => {
  const [tick, setTick] = useState<Tick>(() => readTick(now(), null));
  const [soundArmed, setSoundArmed] = useState(hasUserActivation);
  const [demo] = useState(readDemoOverride);
  const lastCue = useRef('');
  const disarmSound = useCallback(() => setSoundArmed(false), []);
  // Confetti falls through the logo's orbit loops and stops when the AI to SI morph begins.
  const [confettiStopped, setConfettiStopped] = useState(false);
  const stopConfetti = useCallback(() => setConfettiStopped(true), []);

  useEffect(() => {
    detectReducedMotion();
    if (hasUserActivation()) armAudioContext();
    const arm = () => {
      armAudioContext();
      setSoundArmed(true);
    };
    window.addEventListener('click', arm, { passive: true });
    window.addEventListener('keydown', arm);
    window.addEventListener('touchstart', arm, { passive: true });
    return () => {
      window.removeEventListener('click', arm);
      window.removeEventListener('keydown', arm);
      window.removeEventListener('touchstart', arm);
    };
  }, []);

  useEffect(() => {
    const step = () => setTick((previous) => readTick(now(), previous));
    let frame = requestAnimationFrame(function loop() {
      step();
      frame = requestAnimationFrame(loop);
    });
    // requestAnimationFrame stops in a hidden tab, where the song must still fade out on time.
    const hiddenTabClock = window.setInterval(step, 500);
    return () => {
      cancelAnimationFrame(frame);
      window.clearInterval(hiddenTabClock);
    };
  }, [now]);

  const { now: nowDate, nextMeetup } = tick;
  const meetupAt = nextMeetup.getTime();
  const msUntilMeetup = meetupAt - nowDate.getTime();
  const videoTimeNow = useCallback(() => songVideoTime(meetupAt - now().getTime()), [meetupAt, now]);

  const inviteMeetup = getMeetupWithActiveInviteWindow(nowDate);
  const isDiscordInviteVisible = demo ? DEMO_STAGE[demo].invite : shouldShowDiscordInvite(nowDate, inviteMeetup);
  const needsDiscordInviteUpdate = demo === 'invite-expired' || (isDiscordInviteVisible && !isDiscordInviteCurrent(inviteMeetup));
  const phase: Phase = demo ? DEMO_STAGE[demo].phase : showPhase(msUntilMeetup, isDiscordInviteVisible);

  const song = tick.songJoinedAt === null ? null : songFrame(msUntilMeetup, tick.songJoinedAt);
  const videoTime = songVideoTime(msUntilMeetup);
  const isSoundPromptVisible = !soundArmed
    && videoTime >= SONG.startAt - SOUND_PROMPT_LEAD_SECONDS
    && videoTime < SONG.fadeOutTo;

  const time = timeParts(msUntilMeetup);
  // Rounded up so the digit reads 1 through the last second and zero belongs to the celebration.
  const finalSeconds = ((Math.max(1, Math.ceil(msUntilMeetup / 1000)) - 1) % 60) + 1;
  const tier = finalTier(finalSeconds);

  useEffect(() => {
    const cue = phase === 'celebration' ? 'zero' : phase === 'final' && tier === 'ten' ? `kick-${finalSeconds}` : '';
    if (cue === lastCue.current) return;
    lastCue.current = cue;
    if (cue === 'zero') playZeroHit();
    else if (cue) playSubKick();
  }, [phase, tier, finalSeconds]);

  const meetupDateStr = nextMeetup.toLocaleDateString('en-US', {
    timeZone: DENVER_TIME_ZONE,
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });
  const meetupTimeZone = mountainTimeLabel(nextMeetup);

  return (
    <div
      className="countdown-stage relative min-h-[80vh] flex flex-col items-center justify-center text-center"
      data-phase={phase}
      style={{ '--energy': finalEnergy(msUntilMeetup).toFixed(3) } as React.CSSProperties}
    >
      {song && (
        <SongLayer
          frame={song}
          soundArmed={soundArmed}
          videoTimeNow={videoTimeNow}
          onSoundBlocked={disarmSound}
        />
      )}

      {phase === 'final' && (
        <>
          <div className="countdown-aurora" aria-hidden="true">
            <span />
            <span />
            <span />
          </div>
          {tier === 'ten' && <div key={finalSeconds} className="countdown-vignette" aria-hidden="true" />}
        </>
      )}

      {phase === 'live' && <Confetti count={30} stopped={confettiStopped} />}
      {phase === 'celebration' && <Celebration elapsedMs={-msUntilMeetup} />}

      {isSoundPromptVisible && (
        <button type="button" className="countdown-sound-chip">
          <VolumeX size={14} aria-hidden="true" />
          Tap anywhere for sound
        </button>
      )}

      {/* The celebration owns the stage: nothing else renders until it hands over to live. */}
      {phase !== 'celebration' && (
        <div className={`countdown-content relative z-10 flex flex-col items-center w-full${phase === 'live' ? ' countdown-live-reveal' : ''}`}>
          {phase !== 'final' && (
            <>
              {/* Hero badge */}
              <div className="mb-6 sm:mb-8 animate-fade-in px-4 sm:px-0">
                {phase === 'live' ? (
                  <div className="inline-flex items-center gap-2 px-3 py-1.5 sm:px-4 sm:py-2 rounded-full border border-red-500/40 bg-red-500/10 text-red-400 text-[11px] sm:text-sm font-mono uppercase tracking-widest">
                    <span className="w-2 h-2 rounded-full bg-red-500 animate-live-pulse inline-block" />
                    Live Now — Longmont AI Meetup
                  </div>
                ) : phase === 'afterparty' ? (
                  <div className="inline-flex items-center gap-2 px-3 py-1.5 sm:px-4 sm:py-2 rounded-full border border-[var(--accent-cyan)]/30 bg-[var(--accent-cyan)]/5 text-[var(--accent-cyan)] text-[11px] sm:text-sm font-mono uppercase tracking-widest">
                    Keep the conversation going
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
                {phase === 'live' ? (
                  <>
                    <span className="text-gradient-vibrant">Meetup in Progress</span>
                    <br />
                    <span className="text-base sm:text-xl md:text-2xl font-normal text-[var(--text-secondary)]">
                      Join the gathering — you're here!
                    </span>
                  </>
                ) : phase === 'afterparty' ? (
                  <>
                    <span className="text-gradient-vibrant">Thanks for Joining</span>
                    <br />
                    <span className="text-base sm:text-xl md:text-2xl font-normal text-[var(--text-secondary)]">
                      Continue the conversation with Longmont AI
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
            </>
          )}

          {phase === 'final' && (
            <FinalCountdownDisplay
              seconds={finalSeconds}
              progress={Math.min(1, Math.max(0, msUntilMeetup / FINAL_COUNTDOWN_MS))}
            />
          )}

          {/* Standard 4-digit row */}
          {phase === 'countdown' && (
            <div className="flex items-center justify-center gap-2 sm:gap-4 md:gap-5 mb-10 animate-scale-in overflow-x-auto w-full px-4 sm:px-0 py-2">
              <Digit value={time.days} label="Days" />
              <Separator visible />
              <Digit value={time.hours} label="Hours" />
              <Separator visible />
              <Digit value={time.minutes} label="Minutes" />
              <Separator visible />
              <Digit value={time.seconds} label="Seconds" />
            </div>
          )}

          {/* The meetup itself is animation-only, with the invite alongside it when scheduled. */}
          {phase === 'live' && (
            <div className={`countdown-live-experience ${isDiscordInviteVisible ? 'countdown-live-experience--with-invite' : ''}`}>
              <div className="countdown-live-animation">
                <AnimatedLogo compact={isDiscordInviteVisible} onMorph={stopConfetti} />
              </div>
              {isDiscordInviteVisible && <DiscordInvite needsUpdate={needsDiscordInviteUpdate} />}
            </div>
          )}

          {phase === 'afterparty' && (
            <div className="countdown-live-experience countdown-live-experience--with-invite">
              <div className="countdown-live-animation">
                <AnimatedLogo compact />
              </div>
              <DiscordInvite needsUpdate={needsDiscordInviteUpdate} />
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
              <span>12:00 PM {meetupTimeZone}</span>
            </div>
          </div>

          {/* Next meetup date */}
          {phase === 'countdown' && (
            <p className="mt-3 text-sm text-[var(--text-muted)] animate-fade-in-late">
              Next Meetup — {meetupDateStr} at Noon {meetupTimeZone}
            </p>
          )}

          {/* CTA during live */}
          {phase === 'live' && (
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
        </div>
      )}

      {/* Pulsing glow behind the counter */}
      {phase === 'countdown' && (
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
