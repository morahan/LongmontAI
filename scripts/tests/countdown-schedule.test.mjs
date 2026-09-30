import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import test from 'node:test';
import { stripTypeScriptTypes } from 'node:module';
import * as schedule from '../../src/lib/meetupSchedule.ts';

const reference = { year: 2026, month: 5, day: 27 };
const hour = 3_600_000;
const source = readFileSync(new URL('../../src/pages/Countdown.tsx', import.meta.url), 'utf8');
// Execute the page's actual pure scheduling functions without mounting its audio/animation UI.
const schedulingSource = source.slice(source.indexOf('const MEETUP_YEAR'), source.indexOf('// ─── Audio'));
assert.ok(schedulingSource.includes('function isDiscordInviteCurrent'));
const outputText = stripTypeScriptTypes(schedulingSource);
const page = vm.runInNewContext(`${outputText}\n({ getNextMeetup, getMeetupWithActiveInviteWindow, shouldShowDiscordInvite, isDiscordInviteCurrent });`, { ...schedule, Date });

test('Denver recurrence stays at noon across fall and spring DST transitions', () => {
  for (const [index, instant, zone] of [
    [11, '2026-10-28T18:00:00.000Z', 'MDT'],
    [12, '2026-11-11T19:00:00.000Z', 'MST'],
    [20, '2027-03-03T19:00:00.000Z', 'MST'],
    [21, '2027-03-17T18:00:00.000Z', 'MDT'],
  ]) {
    const meetup = schedule.denverNoon(schedule.addCalendarDays(reference, index * 14));
    assert.equal(meetup.toISOString(), instant);
    assert.equal(schedule.mountainTimeLabel(meetup), zone);
    assert.equal(page.getNextMeetup(new Date(meetup.getTime() - 1)).toISOString(), instant);
  }
});

test('recurrence before reference and across year rollover', () => {
  assert.equal(page.getNextMeetup(new Date('2026-01-01T00:00:00Z')).toISOString(), '2026-05-27T18:00:00.000Z');
  assert.equal(page.getNextMeetup(new Date('2026-12-23T20:00:00Z')).toISOString(), '2027-01-06T19:00:00.000Z');
});

test('meetup and invitation selection roll over at distinct exclusive ends', () => {
  const start = Date.parse('2026-11-11T19:00:00Z');
  const next = '2026-11-25T19:00:00.000Z';
  assert.equal(page.getNextMeetup(new Date(start + hour - 1)).getTime(), start);
  assert.equal(page.getNextMeetup(new Date(start + hour)).toISOString(), next);
  assert.equal(page.getMeetupWithActiveInviteWindow(new Date(start + hour)).getTime(), start);
  assert.equal(page.getMeetupWithActiveInviteWindow(new Date(start + 1.5 * hour - 1)).getTime(), start);
  assert.equal(page.getMeetupWithActiveInviteWindow(new Date(start + 1.5 * hour)).toISOString(), next);
});

test('invitation opens only during first ten minutes and thirty minutes after meetup', () => {
  for (const instant of ['2026-09-02T18:00:00Z', '2026-11-11T19:00:00Z']) {
    const start = Date.parse(instant);
    for (const [offset, visible] of [
      [-1, false], [0, true], [600_000 - 1, true], [600_000, false],
      [hour - 1, false], [hour, true], [1.5 * hour - 1, true], [1.5 * hour, false],
    ]) {
      const now = new Date(start + offset);
      assert.equal(page.shouldShowDiscordInvite(now, page.getMeetupWithActiveInviteWindow(now)), visible, `${instant} + ${offset}`);
    }
  }
});

test('configured invitation is current for exactly three meetup occurrences', () => {
  for (const [month, day, current] of [[8, 19, false], [9, 2, true], [9, 16, true], [9, 30, true], [10, 14, false], [11, 11, false]]) {
    assert.equal(page.isDiscordInviteCurrent(schedule.denverNoon({ year: 2026, month, day })), current);
  }
});

test('Denver instant and calendar date do not depend on visitor timezone', () => {
  const helperUrl = new URL('../../src/lib/meetupSchedule.ts', import.meta.url).href;
  const program = `import { nextDenverMeetup, denverCalendarDate } from ${JSON.stringify(helperUrl)};
    const now = new Date('2026-11-11T06:30:00Z');
    process.stdout.write(JSON.stringify([nextDenverMeetup(now, ${JSON.stringify(reference)}, 14, ${hour}).toISOString(), denverCalendarDate(now)]));`;
  for (const TZ of ['UTC', 'America/New_York', 'America/Denver', 'Pacific/Honolulu', 'Pacific/Kiritimati']) {
    const result = spawnSync(process.execPath, ['--experimental-strip-types', '--input-type=module', '--eval', program], {
      encoding: 'utf8', env: { ...process.env, TZ },
    });
    assert.equal(result.status, 0, result.stderr);
    assert.deepEqual(JSON.parse(result.stdout), ['2026-11-11T19:00:00.000Z', { year: 2026, month: 11, day: 10 }]);
  }
});

test('countdown formats its date and seasonal time label in Denver', () => {
  assert.match(source, /nextMeetup\.toLocaleDateString\('en-US',\s*\{\s*timeZone: DENVER_TIME_ZONE/);
  assert.match(source, /const meetupTimeZone = mountainTimeLabel\(nextMeetup\)/);
  assert.match(source, /12:00 PM \{meetupTimeZone\}/);
  assert.match(source, /at Noon \{meetupTimeZone\}/);
});
