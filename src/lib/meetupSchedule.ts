const DENVER_TIME_ZONE = 'America/Denver';
const DAY_MS = 24 * 60 * 60 * 1000;

export interface CalendarDate {
  year: number;
  month: number;
  day: number;
}

const denverPartsFormatter = new Intl.DateTimeFormat('en-US', {
  timeZone: DENVER_TIME_ZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  hourCycle: 'h23',
});

function partsAt(date: Date): Required<CalendarDate> & { hour: number; minute: number; second: number } {
  const values = Object.fromEntries(
    denverPartsFormatter.formatToParts(date)
      .filter((part) => part.type !== 'literal')
      .map((part) => [part.type, Number(part.value)]),
  );
  return {
    year: values.year,
    month: values.month,
    day: values.day,
    hour: values.hour,
    minute: values.minute,
    second: values.second,
  };
}

function calendarSerial(date: CalendarDate): number {
  return Date.UTC(date.year, date.month - 1, date.day) / DAY_MS;
}

export function addCalendarDays(date: CalendarDate, days: number): CalendarDate {
  const shifted = new Date(Date.UTC(date.year, date.month - 1, date.day + days));
  return {
    year: shifted.getUTCFullYear(),
    month: shifted.getUTCMonth() + 1,
    day: shifted.getUTCDate(),
  };
}

/** Resolve an unambiguous local noon in America/Denver to its absolute instant. */
export function denverNoon(date: CalendarDate): Date {
  const desiredAsUtc = Date.UTC(date.year, date.month - 1, date.day, 12, 0, 0);
  let candidate = desiredAsUtc;

  // Re-evaluate because the offset at the UTC guess can straddle a DST boundary.
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const actual = partsAt(new Date(candidate));
    const actualAsUtc = Date.UTC(
      actual.year,
      actual.month - 1,
      actual.day,
      actual.hour,
      actual.minute,
      actual.second,
    );
    const correction = desiredAsUtc - actualAsUtc;
    candidate += correction;
    if (correction === 0) break;
  }

  return new Date(candidate);
}

export function denverCalendarDate(date: Date): CalendarDate {
  const parts = partsAt(date);
  return { year: parts.year, month: parts.month, day: parts.day };
}

export function nextDenverMeetup(
  now: Date,
  reference: CalendarDate,
  intervalDays: number,
  windowAfterStartMs: number,
): Date {
  const today = denverCalendarDate(now);
  const elapsedDays = calendarSerial(today) - calendarSerial(reference);
  let occurrenceIndex = Math.max(0, Math.floor(elapsedDays / intervalDays));
  let meetup = denverNoon(addCalendarDays(reference, occurrenceIndex * intervalDays));

  while (meetup.getTime() + windowAfterStartMs <= now.getTime()) {
    occurrenceIndex += 1;
    meetup = denverNoon(addCalendarDays(reference, occurrenceIndex * intervalDays));
  }

  return meetup;
}

export function mountainTimeLabel(date: Date): string {
  const zone = new Intl.DateTimeFormat('en-US', {
    timeZone: DENVER_TIME_ZONE,
    timeZoneName: 'short',
  }).formatToParts(date).find((part) => part.type === 'timeZoneName')?.value;
  return zone ?? 'MT';
}

export { DENVER_TIME_ZONE };
