// The countdown show is a pure function of the clock: every value here derives from
// msUntilMeetup (negative once the meetup has started), so a page opened or reloaded
// mid-show lands on the same moment as everyone else.

export const SONG = {
  videoId: '9jK-NcRmVcw',
  startAt: 12,
  fadeInSeconds: 5,
  fadeOutFrom: 76,
  fadeOutTo: 78,
  hideAt: 77,
} as const;

export const FINAL_COUNTDOWN_MS = 60_000;
export const ENERGY_RAMP_MS = 30_000;
export const CELEBRATION_MS = 6_000;

export type Phase = 'countdown' | 'final' | 'celebration' | 'live' | 'afterparty';

export interface SongFrame {
  videoTime: number;
  volume: number;
  opacity: number;
}

function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value));
}

// Timer zero coincides with SONG.hideAt, so the song begins 65 s before zero and its
// fade-in ends exactly as the 60 s final countdown begins.
export function songVideoTime(msUntilMeetup: number): number {
  return SONG.hideAt - msUntilMeetup / 1000;
}

function isSongPlaying(videoTime: number): boolean {
  return videoTime >= SONG.startAt && videoTime < SONG.fadeOutTo;
}

// Where in the video this viewer joined: SONG.startAt for a page that was already open,
// later when the page loaded mid-song. Null while the song is not playing.
export function songJoin(previousJoin: number | null, msUntilMeetup: number): number | null {
  const videoTime = songVideoTime(msUntilMeetup);
  if (!isSongPlaying(videoTime)) return null;
  return previousJoin ?? videoTime;
}

export function songFrame(msUntilMeetup: number, joinedAtVideoTime: number): SongFrame | null {
  const videoTime = songVideoTime(msUntilMeetup);
  if (!isSongPlaying(videoTime)) return null;

  const fadeIn = clamp01((videoTime - joinedAtVideoTime) / SONG.fadeInSeconds);
  const volumeOut = clamp01((SONG.fadeOutTo - videoTime) / (SONG.fadeOutTo - SONG.fadeOutFrom));
  // The picture is gone by hideAt while the audio tail finishes off screen.
  const opacityOut = clamp01((SONG.hideAt - videoTime) / (SONG.hideAt - SONG.fadeOutFrom));

  return {
    videoTime,
    volume: Math.round(100 * fadeIn * volumeOut),
    opacity: fadeIn * opacityOut,
  };
}

export function finalEnergy(msUntilMeetup: number): number {
  return clamp01(1 - msUntilMeetup / ENERGY_RAMP_MS);
}

// The meetup schedule only reports a non-positive msUntilMeetup while the meetup is in
// progress, and the Discord invite can only be open before zero in the post-meetup window.
export function showPhase(msUntilMeetup: number, inviteOpen: boolean): Phase {
  if (msUntilMeetup <= -CELEBRATION_MS) return 'live';
  if (msUntilMeetup <= 0) return 'celebration';
  if (inviteOpen) return 'afterparty';
  if (msUntilMeetup <= FINAL_COUNTDOWN_MS) return 'final';
  return 'countdown';
}
