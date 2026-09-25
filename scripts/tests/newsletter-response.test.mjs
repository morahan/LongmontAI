import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { stripTypeScriptTypes } from 'node:module';
import test from 'node:test';

const source = await readFile(new URL('../../src/lib/newsletterResponse.ts', import.meta.url), 'utf8');
const {
  newsletterSignupErrorMessage,
  readNewsletterSubscribeResponse,
  UNAVAILABLE_MESSAGE,
} = await import(`data:text/javascript;base64,${Buffer.from(stripTypeScriptTypes(source)).toString('base64')}`);

function response(payload, status = 400, contentType = 'application/json') {
  return new Response(JSON.stringify(payload), { status, headers: { 'Content-Type': contentType } });
}

async function errorMessage(result) {
  try {
    await readNewsletterSubscribeResponse(result);
    assert.fail('Expected newsletter response rejection');
  } catch (error) {
    // Do not let an assertion failure masquerade as a safe response error.
    assert.equal(error.name, 'NewsletterResponseError');
    return newsletterSignupErrorMessage(error);
  }
}

test('newsletter response preserves both success states', async () => {
  for (const status of ['confirmation_pending', 'intake_recorded']) {
    const payload = { ok: true, status };
    assert.deepEqual(await readNewsletterSubscribeResponse(response(payload, 200, 'Application/JSON; charset=utf-8')), payload);
  }
});

test('newsletter client errors use only explicitly allowlisted messages', async () => {
  const messages = {
    invalid_email: 'Enter a valid email address.',
    body_too_large: 'Newsletter signup request is too large.',
    invalid_json: 'Newsletter signup request was not accepted.',
    unsupported_content_type: 'Newsletter signup request was not accepted.',
    origin_not_allowed: 'Newsletter signup is unavailable from this page.',
    method_not_allowed: UNAVAILABLE_MESSAGE,
  };
  for (const [error, expected] of Object.entries(messages)) {
    assert.equal(await errorMessage(response({ error, message: 'private backend details' })), expected);
    assert.equal(await errorMessage(response({ error, message: 'private backend details' }, 503)), UNAVAILABLE_MESSAGE);
  }
});

test('unknown errors, prototype keys, and backend text stay generic', async () => {
  for (const error of ['unknown', '__proto__', 'constructor', 'toString', 'private backend details', null, {}]) {
    assert.equal(await errorMessage(response({ error, message: 'private backend details' })), UNAVAILABLE_MESSAGE);
  }
  assert.equal(await errorMessage(response({ ok: true, message: 'private backend details' }, 500)), UNAVAILABLE_MESSAGE);
});

test('malformed JSON, non-object payloads, and non-JSON responses fail safely', async () => {
  for (const payload of [null, [], 'private backend details', 1, true, {}, { ok: 'true' }, { ok: 1 }]) {
    assert.equal(await errorMessage(response(payload, 200)), UNAVAILABLE_MESSAGE);
  }
  for (const contentType of ['text/html', 'text/plain', 'application/jsonp', 'text/application/json']) {
    assert.equal(await errorMessage(response({ ok: true }, 200, contentType)), UNAVAILABLE_MESSAGE);
  }
  for (const body of ['', '{', '<html>private upstream failure</html>']) {
    assert.equal(await errorMessage(new Response(body, { headers: { 'Content-Type': 'application/json' } })), UNAVAILABLE_MESSAGE);
  }
  assert.equal(await errorMessage(new Response(null, { status: 204 })), UNAVAILABLE_MESSAGE);
});

test('body read and network failures do not expose arbitrary exception text', async () => {
  const unreadable = response({ ok: true }, 200);
  await unreadable.text();
  assert.equal(await errorMessage(unreadable), UNAVAILABLE_MESSAGE);
  for (const error of [new TypeError('private network details'), new Error('private server details'), 'private details', null]) {
    assert.equal(newsletterSignupErrorMessage(error), UNAVAILABLE_MESSAGE);
  }
});

test('signup uses the safe response boundary and preserves payload and success text', async () => {
  const component = await readFile(new URL('../../src/svelte/NewsletterSignup.svelte', import.meta.url), 'utf8');
  assert.match(component, /const payload = await readNewsletterSubscribeResponse\(response\)/);
  assert.match(component, /message = newsletterSignupErrorMessage\(error\)/);
  assert.doesNotMatch(component, /payload\.message|error\.message|response\.json\(/);
  assert.match(component, /JSON\.stringify\(\{\s*email,\s*name,\s*cadence,\s*company,\s*source,\s*page: window\.location\.pathname,/);
  assert.match(component, /You are on the briefing list\. Check your inbox for the opt-in step\./);
  assert.match(component, /You are on the briefing intake list\./);
});
