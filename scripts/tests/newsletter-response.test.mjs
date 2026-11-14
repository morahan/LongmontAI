import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { stripTypeScriptTypes } from 'node:module';
import test from 'node:test';

const source = await readFile(new URL('../../src/lib/newsletterResponse.ts', import.meta.url), 'utf8');
const {
  firstName,
  readSubscribeResponse,
  signupMessage,
  subscribeRequest,
  SUBSCRIBE_URL,
} = await import(`data:text/javascript;base64,${Buffer.from(stripTypeScriptTypes(source)).toString('base64')}`);

const UNAVAILABLE = 'Newsletter signup is temporarily unavailable.';

function response(payload, status, headers = {}) {
  return new Response(JSON.stringify(payload), { status, headers: { 'Content-Type': 'application/json', ...headers } });
}

async function messageFor(result) {
  return signupMessage(await readSubscribeResponse(result));
}

test('signup posts the strict shared-endpoint body without credentials', () => {
  const init = subscribeRequest({ email: 'reader@example.com', name: 'Reader', website: '', turnstileToken: 'token' });
  assert.equal(SUBSCRIBE_URL, 'https://1023.digital/api/subscribe');
  assert.equal(init.method, 'POST');
  assert.equal(init.credentials, 'omit');
  assert.deepEqual(init.headers, { 'Content-Type': 'application/json' });
  assert.deepEqual(JSON.parse(init.body), {
    email: 'reader@example.com',
    name: 'Reader',
    source: 'longmont-ai',
    website: '',
    turnstileToken: 'token',
  });
  assert.ok(init.signal instanceof AbortSignal);
});

test('each documented endpoint result maps to its reader message', async () => {
  assert.deepEqual(await readSubscribeResponse(response({ result: 'received' }, 202)), { result: 'received' });
  assert.equal(
    await messageFor(response({ result: 'received' }, 202)),
    "You're almost in. Check your inbox in the next few minutes for a confirmation email.",
  );
  assert.equal(await messageFor(response({ result: 'invalid' }, 400)), 'Enter a valid email address.');
  assert.equal(await messageFor(response({ result: 'challenge_failed' }, 400)), 'Complete the human check and try again.');
  assert.equal(await messageFor(response({ result: 'unavailable' }, 503)), UNAVAILABLE);
  assert.equal(await messageFor(response({ result: 'forbidden' }, 403)), UNAVAILABLE);
});

test('rate limiting uses Retry-After seconds and falls back to ten minutes', async () => {
  assert.equal(
    await messageFor(response({ result: 'limited' }, 429, { 'Retry-After': '300' })),
    'Too many attempts. Try again in about 5 minutes.',
  );
  assert.equal(
    await messageFor(response({ result: 'limited' }, 429, { 'Retry-After': '61' })),
    'Too many attempts. Try again in about 2 minutes.',
  );
  assert.equal(
    await messageFor(response({ result: 'limited' }, 429, { 'Retry-After': '20' })),
    'Too many attempts. Try again in about 1 minute.',
  );
  for (const headers of [{}, { 'Retry-After': 'Wed, 21 Oct 2026 07:28:00 GMT' }, { 'Retry-After': '-5' }]) {
    assert.equal(
      await messageFor(response({ result: 'limited' }, 429, headers)),
      'Too many attempts. Try again in about 10 minutes.',
    );
  }
});

test('mismatched, malformed, or unknown responses are unavailable', async () => {
  const cases = [
    response({ result: 'received' }, 200),
    response({ result: 'invalid' }, 202),
    response({ result: 'unknown' }, 400),
    response({ result: 'toString' }, 400),
    response({ result: '__proto__' }, 400),
    response({ ok: true }, 202),
    response(null, 202),
    response([], 202),
    response('received', 202),
    new Response('{', { status: 202, headers: { 'Content-Type': 'application/json' } }),
    new Response('<h1>Bad Gateway</h1>', { status: 502, headers: { 'Content-Type': 'text/html' } }),
    new Response(null, { status: 204 }),
  ];
  for (const result of cases) {
    assert.deepEqual(await readSubscribeResponse(result), { result: 'unavailable' });
  }
});

test('an already-read body is unavailable instead of throwing', async () => {
  const consumed = response({ result: 'received' }, 202);
  await consumed.text();
  assert.deepEqual(await readSubscribeResponse(consumed), { result: 'unavailable' });
});

test('the confirmation greets by the first word of the name, or not at all', () => {
  assert.equal(firstName('Michael Morahan'), 'Michael');
  assert.equal(firstName('  Ada  '), 'Ada');
  assert.equal(firstName(''), '');
  assert.equal(firstName('   '), '');
});
