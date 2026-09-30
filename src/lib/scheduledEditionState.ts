export type ScheduledEditionPhase = 'checking' | 'waiting' | 'retrying';

export function unavailableScheduledEditionPhase(now: number, publishAt: number): ScheduledEditionPhase {
  return Number.isFinite(publishAt) && now < publishAt ? 'waiting' : 'retrying';
}
