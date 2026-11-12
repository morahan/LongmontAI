import assert from 'node:assert/strict';
import test from 'node:test';
import {
  CELEBRATION_MS,
  SONG,
  finalEnergy,
  showPhase,
  songFrame,
  songJoin,
  songVideoTime,
} from '../../src/lib/countdownShow.ts';

const msAtVideoTime = (videoTime) => (SONG.hideAt - videoTime) * 1000;
const frameAt = (videoTime, joinedAt = SONG.startAt) => songFrame(msAtVideoTime(videoTime), joinedAt);

function assertFrame(frame, { volume, opacity }, label) {
  assert.ok(frame, `${label}: song should be playing`);
  assert.equal(frame.volume, volume, `${label}: volume`);
  assert.ok(Math.abs(frame.opacity - opacity) < 1e-9, `${label}: opacity ${frame.opacity}`);
}

test('timer zero lands on the moment the video leaves the screen', () => {
  assert.equal(songVideoTime(0), 77);
  assert.equal(songVideoTime(65_000), 12);
  assert.equal(songVideoTime(60_000), 17);
  assert.equal(songVideoTime(-1_000), 78);
});

test('the song fades in over five seconds from video time 0:12', () => {
  assert.equal(frameAt(11.99), null);
  assertFrame(frameAt(12), { volume: 0, opacity: 0 }, '12');
  assertFrame(frameAt(14.5), { volume: 50, opacity: 0.5 }, '14.5');
  assertFrame(frameAt(17), { volume: 100, opacity: 1 }, '17');
  assertFrame(frameAt(45), { volume: 100, opacity: 1 }, '45');
});

test('the picture is gone at 1:17 and the sound by 1:18', () => {
  assertFrame(frameAt(76), { volume: 100, opacity: 1 }, '76');
  assertFrame(frameAt(76.5), { volume: 75, opacity: 0.5 }, '76.5');
  assertFrame(frameAt(77), { volume: 50, opacity: 0 }, '77');
  assertFrame(frameAt(77.5), { volume: 25, opacity: 0 }, '77.5');
  assert.equal(frameAt(78), null);
  assert.equal(frameAt(120), null);
});

test('a page that loads mid-song fades in from where it joined', () => {
  assertFrame(frameAt(40, 40), { volume: 0, opacity: 0 }, 'join');
  assertFrame(frameAt(42.5, 40), { volume: 50, opacity: 0.5 }, 'join + 2.5');
  assertFrame(frameAt(45, 40), { volume: 100, opacity: 1 }, 'join + 5');
  assertFrame(frameAt(76.5, 75), { volume: 23, opacity: 0.15 }, 'late join meets fade out');
});

test('the join point is remembered for the song and cleared outside it', () => {
  assert.equal(songJoin(null, 70_000), null);
  assert.equal(songJoin(null, 65_000), 12);
  assert.equal(songJoin(12, 30_000), 12);
  assert.equal(songJoin(null, 30_000), 47);
  assert.equal(songJoin(47, -500), 47);
  assert.equal(songJoin(47, -1_000), null);
});

test('energy climbs linearly from thirty seconds to zero', () => {
  assert.equal(finalEnergy(90_000), 0);
  assert.equal(finalEnergy(30_000), 0);
  assert.equal(finalEnergy(22_500), 0.25);
  assert.equal(finalEnergy(15_000), 0.5);
  assert.equal(finalEnergy(0), 1);
  assert.equal(finalEnergy(-5_000), 1);
});

test('the phase follows the clock through the show', () => {
  assert.equal(showPhase(60_001, false), 'countdown');
  assert.equal(showPhase(60_000, false), 'final');
  assert.equal(showPhase(1, false), 'final');
  assert.equal(showPhase(0, false), 'celebration');
  assert.equal(showPhase(0, true), 'celebration');
  assert.equal(showPhase(1 - CELEBRATION_MS, true), 'celebration');
  assert.equal(showPhase(-CELEBRATION_MS, true), 'live');
  assert.equal(showPhase(-3_599_999, false), 'live');
  assert.equal(showPhase(14 * 86_400_000 - 3_600_000, true), 'afterparty');
  assert.equal(showPhase(14 * 86_400_000 - 5_400_000, false), 'countdown');
});
