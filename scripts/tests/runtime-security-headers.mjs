import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const config = JSON.parse(await readFile(new URL('../../vercel.json', import.meta.url), 'utf8'));
const catchAll = config.headers?.find((entry) => entry.source === '/(.*)');

assert(catchAll, 'vercel.json must define security headers for every route');

const headers = new Map(
  catchAll.headers.map(({ key, value }) => [key.toLowerCase(), value]),
);

for (const required of [
  'content-security-policy',
  'cross-origin-opener-policy',
  'permissions-policy',
  'referrer-policy',
  'strict-transport-security',
  'x-content-type-options',
  'x-frame-options',
  'x-permitted-cross-domain-policies',
]) {
  assert(headers.has(required), `missing required response header: ${required}`);
}

const csp = headers.get('content-security-policy');
for (const directive of [
  "default-src 'self'",
  "base-uri 'self'",
  "object-src 'none'",
  "script-src 'self'",
  "connect-src 'self'",
  "frame-ancestors 'none'",
  "form-action 'self'",
  'upgrade-insecure-requests',
]) {
  assert(csp.split(';').some((part) => part.trim() === directive), `missing CSP directive: ${directive}`);
}

assert(!csp.includes("script-src 'self' 'unsafe-inline'"), 'inline scripts must remain blocked');
assert(!csp.includes("script-src 'self' 'unsafe-eval'"), 'evaluated scripts must remain blocked');
assert(!csp.includes('*'), 'CSP sources must be explicitly allowlisted');
assert(csp.includes('https://fonts.googleapis.com'), 'Google Fonts styles must remain available');
assert(csp.includes('https://fonts.gstatic.com'), 'Google Fonts files must remain available');
assert(csp.includes('https://images.unsplash.com'), 'published article images must remain available');
assert(csp.includes('https://view.officeapps.live.com'), 'PowerPoint embeds must remain available');
assert.equal(headers.get('cross-origin-opener-policy'), 'same-origin');
assert.equal(headers.get('x-content-type-options'), 'nosniff');
assert.equal(headers.get('x-frame-options'), 'DENY');
assert.equal(headers.get('x-permitted-cross-domain-policies'), 'none');

console.log('Runtime security headers verified.');
