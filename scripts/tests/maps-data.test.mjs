import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import test from 'node:test';
import {
  OVERLAYS,
  diffSnapshots,
  markerKey,
  overlayById,
  project,
  regionFill,
  resolveSnapshotDate,
  satellitePositions,
  NO_DATA_FILL,
} from '../../src/lib/maps.ts';

const read = (url) => JSON.parse(readFileSync(url, 'utf8'));
const world = read(new URL('../../src/data/maps/world.json', import.meta.url));
const snapshotRoot = new URL('../../src/data/maps/snapshots/', import.meta.url);
const snapshotDates = readdirSync(snapshotRoot).filter((name) => /^\d{4}-\d{2}-\d{2}$/.test(name)).sort();

// One base-map unit is roughly 17 km at the equator. Coastal sites sit just off the simplified coastline.
const COAST_TOLERANCE = 4;

function rings(d) {
  return d.split('M').filter(Boolean).map((ring) => ring.replace('Z', '').split('L').map((pair) => pair.split(',').map(Number)));
}

function inside(shape, [x, y]) {
  let within = false;
  for (const ring of shape) {
    for (let i = 0, j = ring.length - 1; i < ring.length; j = i, i += 1) {
      const [xi, yi] = ring[i];
      const [xj, yj] = ring[j];
      if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) within = !within;
    }
  }
  return within;
}

function nearestVertex(shape, [x, y]) {
  let best = Infinity;
  for (const ring of shape) for (const [vx, vy] of ring) best = Math.min(best, Math.hypot(vx - x, vy - y));
  return best;
}

const countryShapes = new Map(world.countries.map((country) => [country.id, rings(country.d)]));
const regionIds = new Set([...world.countries, ...world.states].map((shape) => shape.id));

test('runtime projection lands on the pre-projected base map', () => {
  for (const { lon, lat, x, y } of world.reference) {
    const [px, py] = project(world.projection, lon, lat);
    assert.ok(Math.hypot(px - x, py - y) < 0.05, `${lon},${lat} projected to ${px},${py}, expected ${x},${y}`);
  }
});

test('the first snapshot is published and every overlay has data in the newest one', () => {
  assert.ok(snapshotDates.includes('2026-11-11'));
  const newest = snapshotDates[snapshotDates.length - 1];
  for (const overlay of OVERLAYS) {
    assert.ok(readdirSync(new URL(`${newest}/`, snapshotRoot)).includes(`${overlay.id}.json`), `${newest} lacks ${overlay.id}`);
  }
});

for (const date of snapshotDates) {
  for (const file of readdirSync(new URL(`${date}/`, snapshotRoot)).filter((name) => name.endsWith('.json'))) {
    const id = file.replace('.json', '');
    test(`${date} ${id} is a valid snapshot`, () => {
      const overlay = overlayById(id);
      assert.equal(overlay.id, id, `${file} does not match a known overlay`);
      const data = read(new URL(`${date}/${file}`, snapshotRoot));

      assert.ok(data.sources.length > 0, 'at least one source');
      for (const source of data.sources) {
        assert.ok(source.name && /^https:\/\//.test(source.url), `source ${JSON.stringify(source)}`);
      }

      const seen = new Set();
      for (const point of data.points ?? []) {
        const label = `${point.id} (${point.name})`;
        assert.ok(point.id && !seen.has(point.id), `duplicate or missing id ${label}`);
        seen.add(point.id);
        assert.ok(point.name && point.place, `${label} needs a name and a nearest place`);
        assert.match(point.source, /^https?:\/\//, `${label} needs a source URL`);
        assert.ok(overlay.markers[markerKey(overlay, point)], `${label} has no legend entry for ${point.kind}:${point.status}`);
        assert.ok(Math.abs(point.lat) <= 90 && Math.abs(point.lon) <= 180, `${label} coordinate out of range`);
        if (overlay.sizedByPower) assert.ok(point.mw >= 25, `${label} is under the 25 MW floor`);
        const shape = countryShapes.get(point.country);
        assert.ok(shape, `${label} names unknown country ${point.country}`);
        const at = project(world.projection, point.lon, point.lat);
        assert.ok(
          inside(shape, at) || nearestVertex(shape, at) <= COAST_TOLERANCE,
          `${label} at ${point.lat},${point.lon} is not in ${point.country}`,
        );
      }

      for (const [regionId, region] of Object.entries(data.regions ?? {})) {
        assert.ok(regionIds.has(regionId), `unknown region ${regionId}`);
        if (overlay.levels) {
          assert.ok(overlay.levels[region.level], `${regionId} has unknown level ${region.level}`);
          assert.ok(region.summary, `${regionId} needs a summary`);
          assert.match(region.source, /^https?:\/\//, `${regionId} needs a source URL`);
        }
        for (const metric of overlay.metrics ?? []) {
          const value = region[metric.id];
          if (value === undefined) continue;
          assert.ok(Number.isFinite(value) && value >= 0, `${regionId} ${metric.id} is ${value}`);
          if (metric.unit === '%') assert.ok(value <= 100, `${regionId} ${metric.id} over 100%`);
          assert.notEqual(regionFill(overlay, region, metric), NO_DATA_FILL);
        }
      }

      for (const [inclination, node, argLatitude, meanMotion, , lagSeconds] of data.satellites?.elements ?? []) {
        assert.ok(inclination > 0 && inclination < 180 && node >= 0 && node <= 360 && argLatitude >= 0 && argLatitude <= 360);
        // Anything in low orbit circles 11 to 17 times a day.
        assert.ok(meanMotion > 11 && meanMotion < 17 && lagSeconds >= 0, `satellite mean motion ${meanMotion}, lag ${lagSeconds}`);
      }
      for (const [index, month] of (data.growth ?? []).entries()) {
        const before = data.growth[index - 1];
        assert.ok(month.inOrbit >= 0 && month.inOrbit <= month.launched, `${month.date} has more in orbit than launched`);
        if (before) assert.ok(month.date > before.date && month.launched >= before.launched, `${month.date} runs backwards`);
      }
    });
  }
}

test('satellite positions follow SGP4', () => {
  // STARLINK-1008 from CelesTrak, and where satellite.js SGP4 put it at the epoch and a day later.
  const satellites = { epoch: '2026-11-12T10:38:47.173Z', elements: [[53.1439, 66.8936, 0.0915, 15.69861898, 0.00163996, 0]] };
  const epoch = Date.parse(satellites.epoch);
  for (const [hours, lon, lat] of [[0, -144.38, 0], [24, 96.33, -50.92]]) {
    const [[mine, mineLat]] = satellitePositions(satellites, epoch + hours * 3600000);
    assert.ok(Math.abs(mineLat - lat) < 0.5 && Math.abs(((mine - lon + 540) % 360) - 180) < 0.5, `+${hours}h at ${mine},${mineLat}, SGP4 says ${lon},${lat}`);
  }
});

test('an overlay shows its newest file at or before the chosen fortnight', () => {
  const dates = ['2026-11-11', '2026-12-09'];
  assert.equal(resolveSnapshotDate(dates, '2026-11-25'), '2026-11-11');
  assert.equal(resolveSnapshotDate(dates, '2026-12-09'), '2026-12-09');
  assert.equal(resolveSnapshotDate(dates, '2026-10-28'), undefined);
});

test('stepping forward flags new sites, status changes and changed jurisdictions', () => {
  const point = { id: 'a', status: 'construction' };
  const before = { sources: [], points: [point], regions: { USA: { level: 'pilot' }, FRA: { level: 'pilot' } } };
  const after = {
    sources: [],
    points: [{ ...point, status: 'operational' }, { id: 'b', status: 'proposed' }],
    regions: { USA: { level: 'commercial' }, FRA: { level: 'pilot' }, DEU: { level: 'pilot' } },
  };
  const changes = diffSnapshots(before, after);
  assert.deepEqual([...changes.newPoints], ['a', 'b']);
  assert.deepEqual([...changes.changedRegions], ['USA', 'DEU']);
  assert.equal(diffSnapshots(undefined, after).newPoints.size, 0);
});
