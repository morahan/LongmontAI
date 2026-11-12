import { escapeNewsletterHtml } from './curation.mjs';
import { NewsletterError } from './shared.mjs';

const DUE_WINDOW_MS = 24 * 60 * 60 * 1000;
const LIST_BOUNDS = { min: 1, max: 8 };
const OFFSET_TIMESTAMP = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2}(?:\.\d+)?)?(?:Z|[+-]\d{2}:\d{2})$/;
const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const SITE_URL = 'https://longmontai.com';
const LOGO_URL = `${SITE_URL}/brand/logo/logo-128.png`;
const SIGNUP_URL = `${SITE_URL}/newsletter`;
const MEETUP_URL = 'https://www.meetup.com/longmontai';
const CLOSING_LINE = 'Cultivated by Michael Morahan and polished with Superintelligence.';

const COLOR = {
  page: '#09090b',
  card: '#18181b',
  hairline: '#27272a',
  text: '#FFFFFF',
  secondary: '#A1A1AA',
  muted: '#71717A',
  cyan: '#00F0FF',
  blue: '#007CF0',
  purple: '#7928CA',
};
const GRADIENT = 'linear-gradient(90deg,#007CF0 0%,#7928CA 50%,#FF0080 100%)';
const SANS = "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif";
const MONO = "ui-monospace,SFMono-Regular,Menlo,Consolas,'Liberation Mono',monospace";

function invalidDigest(message) {
  return new NewsletterError(message, { status: 500, code: 'edition_digest_invalid' });
}

function plainText(value, field, maxLength) {
  if (typeof value !== 'string') throw invalidDigest(`${field} must be a string.`);
  const text = value.replace(/\s+/g, ' ').trim();
  if (!text) throw invalidDigest(`${field} must not be empty.`);
  if (/[\p{Cc}\p{Cf}]/u.test(text)) throw invalidDigest(`${field} must be plain text.`);
  if (Array.from(text).length > maxLength) {
    throw invalidDigest(`${field} must be at most ${maxLength} characters.`);
  }
  return text;
}

function entries(value, field, titleKey, titleMax) {
  if (!Array.isArray(value) || value.length < LIST_BOUNDS.min || value.length > LIST_BOUNDS.max) {
    throw invalidDigest(`${field} must list ${LIST_BOUNDS.min} to ${LIST_BOUNDS.max} entries.`);
  }
  return value.map((entry, index) => {
    if (!entry || typeof entry !== 'object' || Array.isArray(entry)) {
      throw invalidDigest(`${field}[${index}] must be an object.`);
    }
    return {
      [titleKey]: plainText(entry[titleKey], `${field}[${index}].${titleKey}`, titleMax),
      detail: plainText(entry.detail, `${field}[${index}].detail`, 240),
    };
  });
}

export function parseEditionDigest(manifest) {
  const block = manifest?.emailDigest;
  if (block === undefined || block === null) {
    throw new NewsletterError('The release manifest has no emailDigest block.', {
      status: 500,
      code: 'edition_digest_missing',
    });
  }
  if (typeof block !== 'object' || Array.isArray(block)) throw invalidDigest('emailDigest must be an object.');

  const meetupStartsAt = manifest.meetupStartsAt;
  const meetupStartsAtMs = typeof meetupStartsAt === 'string' && OFFSET_TIMESTAMP.test(meetupStartsAt)
    ? Date.parse(meetupStartsAt)
    : Number.NaN;
  if (!Number.isFinite(meetupStartsAtMs)) {
    throw invalidDigest('meetupStartsAt must be a timestamp with an explicit UTC offset.');
  }

  return {
    digest: {
      intro: plainText(block.intro, 'emailDigest.intro', 400),
      modelReleases: entries(block.modelReleases, 'emailDigest.modelReleases', 'name', 80),
      keyNews: entries(block.keyNews, 'emailDigest.keyNews', 'headline', 100),
    },
    meetupStartsAt,
    meetupStartsAtMs,
  };
}

export function editionEmailPhase({ meetupStartsAtMs, nowMs }) {
  if (nowMs < meetupStartsAtMs) return 'not_due';
  return nowMs < meetupStartsAtMs + DUE_WINDOW_MS ? 'due' : 'expired';
}

// Listmonk runs the subject, body, and altbody through Go templates. Authored
// text must never open an action, so "{{" is broken up before it gets there.
function templateSafeText(value) {
  return String(value ?? '').replace(/\{(?=\{)/g, '{ ');
}

function templateSafeHtml(value) {
  return escapeNewsletterHtml(value).replaceAll('{', '&#123;');
}

function displayDate(date) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(date ?? ''));
  const month = match ? MONTHS[Number(match[2]) - 1] : undefined;
  if (!month) throw new TypeError('Edition date must be YYYY-MM-DD.');
  return `${month} ${Number(match[3])}, ${match[1]}`;
}

function listHtml(items, titleKey) {
  const rows = items.map((item) => (
    `<li style="margin:0 0 14px 0;padding:0;color:${COLOR.cyan};">`
    + `<strong style="color:${COLOR.text};font-weight:700;">${templateSafeHtml(item[titleKey])}</strong><br>`
    + `<span style="color:${COLOR.secondary};">${templateSafeHtml(item.detail)}</span></li>`
  )).join('\n');
  return `<ul style="margin:0;padding:0 0 0 20px;font-family:${SANS};font-size:15px;line-height:1.55;">\n${rows}\n</ul>`;
}

function sectionHtml(heading, items, titleKey) {
  return `<tr><td style="padding:28px 32px 0 32px;">
<h2 style="margin:0 0 16px 0;padding:0 0 10px 0;border-bottom:1px solid ${COLOR.hairline};font-family:${SANS};font-size:19px;line-height:1.3;font-weight:700;color:${COLOR.text};">${heading}</h2>
${listHtml(items, titleKey)}
</td></tr>`;
}

function listText(heading, items, titleKey) {
  return [
    heading.toUpperCase(),
    ...items.map((item) => `- ${templateSafeText(item[titleKey])}: ${templateSafeText(item.detail)}`),
  ].join('\n');
}

export function renderEditionEmail({ edition, digest, postalAddress }) {
  const articleUrl = `${SITE_URL}/edition/${encodeURIComponent(edition.id)}`;
  const eyebrow = `MEETUP EDITION · ${displayDate(edition.date)}`;
  const postal = String(postalAddress ?? '').replace(/\s+/g, ' ').trim();
  const subject = `Longmont AI meetup edition: ${templateSafeText(edition.title)}`;
  const preheader = digest.intro;
  const footerLink = `color:${COLOR.secondary};text-decoration:underline;`;

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="dark">
<meta name="supported-color-schemes" content="dark">
<title>${templateSafeHtml(`Longmont AI meetup edition: ${edition.title}`)}</title>
</head>
<body style="margin:0;padding:0;background-color:${COLOR.page};color:${COLOR.text};-webkit-text-size-adjust:100%;">
<div style="display:none;max-height:0;max-width:0;overflow:hidden;opacity:0;color:transparent;font-size:1px;line-height:1px;mso-hide:all;">${templateSafeHtml(preheader)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="${COLOR.page}" style="width:100%;background-color:${COLOR.page};">
<tr><td align="center" style="padding:24px 12px 32px 12px;">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" bgcolor="${COLOR.card}" style="width:100%;max-width:600px;background-color:${COLOR.card};border:1px solid ${COLOR.hairline};border-radius:16px;overflow:hidden;">
<tr><td height="4" bgcolor="${COLOR.purple}" style="height:4px;font-size:0;line-height:0;background-color:${COLOR.purple};background-image:${GRADIENT};">&nbsp;</td></tr>
<tr><td style="padding:22px 32px;border-bottom:1px solid ${COLOR.hairline};">
<table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>
<td width="44" valign="middle" style="width:44px;"><img src="${LOGO_URL}" width="44" height="44" alt="Longmont AI logo" style="display:block;width:44px;height:44px;border:0;outline:none;"></td>
<td valign="middle" style="padding-left:12px;font-family:${SANS};font-size:20px;line-height:1.2;font-weight:700;letter-spacing:-0.01em;color:${COLOR.text};">Longmont AI</td>
</tr></table>
</td></tr>
<tr><td style="padding:32px 32px 0 32px;">
<p style="margin:0 0 12px 0;font-family:${MONO};font-size:12px;line-height:1.4;letter-spacing:0.12em;color:${COLOR.cyan};">${templateSafeHtml(eyebrow)}</p>
<h1 style="margin:0 0 16px 0;font-family:${SANS};font-size:30px;line-height:1.2;font-weight:800;letter-spacing:-0.02em;color:${COLOR.text};">${templateSafeHtml(edition.title)}</h1>
<p style="margin:0;font-family:${SANS};font-size:16px;line-height:1.6;color:${COLOR.secondary};">${templateSafeHtml(digest.intro)}</p>
</td></tr>
${sectionHtml('Model releases', digest.modelReleases, 'name')}
${sectionHtml('Key news', digest.keyNews, 'headline')}
<tr><td align="center" style="padding:22px 32px 0 32px;">
<table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>
<td align="center" bgcolor="${COLOR.purple}" style="border-radius:999px;background-color:${COLOR.purple};background-image:${GRADIENT};">
<a href="${articleUrl}" style="display:inline-block;padding:14px 30px;font-family:${SANS};font-size:16px;line-height:1.2;font-weight:700;color:${COLOR.text};text-decoration:none;border-radius:999px;">Read the full article</a>
</td>
</tr></table>
</td></tr>
<tr><td align="center" style="padding:18px 32px 0 32px;font-family:${SANS};font-size:13px;line-height:1.6;color:${COLOR.secondary};">
Full article: <a href="${articleUrl}" style="color:${COLOR.blue};text-decoration:underline;word-break:break-all;">${articleUrl}</a>
</td></tr>
<tr><td align="center" style="padding:28px 32px 32px 32px;">
<p style="margin:0;padding:20px 0 0 0;border-top:1px solid ${COLOR.hairline};font-family:${SANS};font-size:14px;line-height:1.6;font-style:italic;color:${COLOR.secondary};">${CLOSING_LINE}</p>
</td></tr>
</table>
<table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:600px;">
<tr><td align="center" style="padding:24px 20px 0 20px;font-family:${SANS};font-size:12px;line-height:1.7;color:${COLOR.muted};">
<p style="margin:0 0 6px 0;">You are receiving this because you subscribed at <a href="${SIGNUP_URL}" style="${footerLink}">longmontai.com/newsletter</a>.</p>
<p style="margin:0 0 6px 0;">Join us in person: <a href="${MEETUP_URL}" style="${footerLink}">RSVP for the next meetup</a>.</p>
<p style="margin:0 0 6px 0;"><a href="{{ UnsubscribeURL }}" style="${footerLink}">Unsubscribe</a></p>${postal ? `
<p style="margin:0;">${templateSafeHtml(postal)}</p>` : ''}
</td></tr>
</table>
</td></tr>
</table>
</body>
</html>
`;

  const text = [
    'Longmont AI',
    eyebrow,
    '',
    templateSafeText(edition.title),
    '',
    templateSafeText(digest.intro),
    '',
    listText('Model releases', digest.modelReleases, 'name'),
    '',
    listText('Key news', digest.keyNews, 'headline'),
    '',
    `Read the full article: ${articleUrl}`,
    '',
    CLOSING_LINE,
    '',
    '--',
    'You are receiving this because you subscribed at longmontai.com/newsletter.',
    `RSVP for the next meetup: ${MEETUP_URL}`,
    'Unsubscribe: {{ UnsubscribeURL }}',
    ...(postal ? [templateSafeText(postal)] : []),
    '',
  ].join('\n');

  return { subject, preheader, html, text };
}
