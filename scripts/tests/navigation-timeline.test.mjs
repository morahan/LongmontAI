import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { matchRoutes } from 'react-router-dom';
import { pageTitle, routeTitle } from '../../src/lib/documentTitle.ts';
import { reconcileVisibleSelection } from '../../src/lib/timelineSelection.ts';

const app = readFileSync(new URL('../../src/App.tsx', import.meta.url), 'utf8');
const paths = [...app.matchAll(/<Route path="([^"]+)"/g)].map((match) => match[1]);

test('every current page has a title, with unchanged route coverage', () => {
  const expected = {
    '/': 'LongmontAI',
    '/edition/example': 'Edition | LongmontAI',
    '/countdown': 'Meetup Countdown | LongmontAI',
    '/tools': 'AI Capabilities Matrix | LongmontAI',
    '/model-watch': 'Model Watch | LongmontAI',
    '/leaderboard': 'Leaderboard | LongmontAI',
    '/timeline': 'AI Timeline | LongmontAI',
    '/newsletter': 'Newsletter | LongmontAI',
    '/about': 'About | LongmontAI',
  };
  assert.equal(paths.length, Object.keys(expected).length + 1);
  for (const [path, title] of Object.entries(expected)) {
    assert.equal(pageTitle(routeTitle(path)), title);
    assert.notEqual(matchRoutes(paths.map((path) => ({ path })), path)[0].route.path, '*');
  }
  assert.equal(pageTitle('<img src=x>'), '<img src=x> | LongmontAI');
});

test('title matching follows router case, trailing slash, and full segment rules', () => {
  assert.equal(routeTitle('/TIMELINE/'), 'AI Timeline');
  assert.equal(routeTitle('/edition/example/'), 'Edition');
  for (const path of ['/missing', '/edition/', '/edition/example/extra', '/timeline/extra', '/constructor']) {
    assert.equal(routeTitle(path), 'Page Not Found');
    assert.equal(matchRoutes(paths.map((path) => ({ path })), path)[0].route.path, '*');
  }
});

test('route failures keep recovery controls inside the layout and reset on navigation', () => {
  assert.match(app, /static getDerivedStateFromError/);
  assert.match(app, /<PageErrorBoundary key={location.key}/);
  assert.match(app, /window.location.reload\(\)/);
  assert.match(app, /<Link to="\/">Back to editions<\/Link>/);
  assert.match(app, /<Layout>\s*<PageBoundary>\s*<Suspense/);
});

test('filter reconciliation retains visible selection and otherwise selects first result', () => {
  const visible = [{ id: 'turing' }, { id: 'dartmouth' }];
  assert.equal(reconcileVisibleSelection({ id: 'future' }, visible), visible[0]);
  assert.equal(reconcileVisibleSelection(visible[1], visible), visible[1]);
  assert.equal(reconcileVisibleSelection(null, visible), visible[0]);
  assert.equal(reconcileVisibleSelection({ id: 'dartmouth', stale: true }, visible), visible[1]);
});

test('timeline controls expose their selected state to assistive technology', () => {
  const timeline = readFileSync(new URL('../../src/pages/Timeline.tsx', import.meta.url), 'utf8');
  for (const expression of ['activeRange === item.id', 'activeCategories.includes(category)', "view === 'timeline'", "view === 'matrix'"]) {
    assert.ok(timeline.includes(`aria-pressed={${expression}}`), expression);
  }
});

test('empty results clear selection; broadening filters recovers a visible detail', () => {
  const old = { id: 'future' };
  const cleared = reconcileVisibleSelection(old, []);
  assert.equal(cleared, null);
  assert.equal(reconcileVisibleSelection(cleared, []), null);
  const visible = [{ id: 'turing' }, old];
  assert.equal(reconcileVisibleSelection(cleared, visible), visible[0]);
  const timeline = readFileSync(new URL('../../src/pages/Timeline.tsx', import.meta.url), 'utf8');
  assert.match(timeline, /reconcileVisibleSelection\(selection, filteredEvents\)/);
  assert.match(timeline, /if \(selectedEvent !== selection\) setSelectedEvent\(selectedEvent\)/);
  assert.match(timeline, /filteredEvents.length === 0/);
  assert.match(timeline, /role="status">No events match these filters/);
  assert.match(timeline, /selectedEvent && <aside/);
});
