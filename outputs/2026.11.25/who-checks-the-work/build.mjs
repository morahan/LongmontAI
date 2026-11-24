#!/usr/bin/env node
// Builds the Nov 25 end-of-post deck "Who checks the work?" and the PDF of the ten-slide briefing.
//   node build.mjs render <assets dir>
// Writes who-checks-the-work-NN-*.jpg, who-checks-the-work.pdf and chatbot-to-teammate-briefing.pdf
// into <assets dir>, and prints the article gallery Markdown.
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const brand = path.resolve(here, '../../../public/brand');
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const DECK = 'who-checks-the-work';
const DATE = '2026.11.25';
let cropDir; // the edition's asset folder; slide images are read from there

const slides = [
  { section: 'Models', label: 'Independent benchmark', source: 'Artificial Analysis, Nov 24 · circle by Longmont AI', img: ['neon-intelligence-vs-cost-per-task'],
    title: 'Gemini 4 Neon sits <em>just under</em> the efficient frontier', note: 'About 61 on the index at roughly $6 a task. Fable 5.2 scores about 65 at roughly $27.',
    alt: 'Artificial Analysis chart of Intelligence Index against cost per task, with Gemini 4 Neon circled just under the Pareto line.' },
  { section: 'Agents', label: 'Vendor diagram', source: 'Anthropic, Nov 23', img: ['claude-ship-review-fix-approve'],
    title: 'Claude Ship: <em>review, fix, approve</em>', note: 'Three agents work a pull request. Anthropic: it may still miss bugs.',
    alt: 'Anthropic diagram: Code Review finds issues, PR Steward pushes fixes, and Claude Approvals approves under team policy.' },
  { section: 'Agents', label: 'Vendor example', source: 'Anthropic, Nov 23', img: ['claude-ship-code-review-finding'],
    title: 'Review: each flag <em>shows its reasoning</em>', note: 'A "why this was flagged" note lets a person check the finding.',
    alt: 'Example Code Review comment flagging a retry bug, with its reasoning and how it was verified.' },
  { section: 'Agents', label: 'Vendor example', source: 'Anthropic, Nov 23', img: ['claude-ship-pr-steward-fix'],
    title: 'Fix: every push says <em>how to undo it</em>', note: 'PR Steward works on findings, failing tests and conflicts. Approving stays with the team.',
    alt: 'Example PR Steward comments: it confirms a finding, pushes a fix, and explains how to revert it or stop it.' },
  { section: 'Agents', label: 'Vendor example', source: 'Anthropic, Nov 23', img: ['claude-ship-approvals-policy'],
    title: 'Approve: <em>people write the rules</em>', note: 'Docs can pass on Claude\'s review. Billing code needs two people, one from payments.',
    alt: 'Example Claude Approvals policy file with rules for most code, docs, and billing code.' },
  { section: 'Agents', label: 'Vendor example', source: 'Anthropic, Nov 23', img: ['claude-ship-approved-pr'],
    title: 'A docs fix, <em>approved by Claude</em>', note: 'It met the team\'s policy and passed every check, with no human reviewer.',
    alt: 'Example pull request fixing broken doc links, approved by Claude Approvals with all checks passing.' },
  { section: 'Agents', label: 'Vendor example', source: 'Anthropic, Nov 23', img: ['claude-ship-command'],
    title: 'Developers start it with <em>/ship</em>', note: 'Claude reviews the change, then watches the pull request for up to 7 days.',
    alt: 'Terminal running /ship in Claude Code, which reviews a change and watches the pull request.' },
];

function size(file) {
  const out = execFileSync('sips', ['-g', 'pixelWidth', '-g', 'pixelHeight', file], { encoding: 'utf8' });
  return [Number(/pixelWidth: (\d+)/.exec(out)[1]), Number(/pixelHeight: (\d+)/.exec(out)[1])];
}

const css = `
*{box-sizing:border-box}html,body{margin:0;background:#09090b}
@page{size:1920px 1080px;margin:0}
.slide{width:1920px;height:1080px;overflow:hidden;position:relative;page-break-after:always;color:#fff;font-family:'IBM Plex Serif',serif;
background:radial-gradient(900px 700px at 0% 75%,rgba(121,40,202,.16),transparent 70%),radial-gradient(700px 500px at 100% 0%,rgba(0,240,255,.10),transparent 70%),#09090b}
.mono{font-family:'JetBrains Mono',monospace;text-transform:uppercase}
header{position:absolute;left:0;right:0;top:0;height:110px;background:#161618;display:flex;align-items:center;justify-content:space-between;padding:0 60px}
header .brand{display:flex;align-items:center;gap:20px;font-size:40px;font-weight:700}
header img{width:64px;height:64px;border-radius:6px;object-fit:cover}
header .count{color:#71717A;font-size:19px;letter-spacing:.3em}
footer{position:absolute;left:0;right:0;bottom:0;height:100px;background:#1b1033;display:flex;justify-content:space-between;align-items:center;padding:0 60px;color:#71717A;font-size:19px;letter-spacing:.3em}
.eyebrow{font-size:24px;letter-spacing:.24em;font-weight:500;color:#00F0FF}
h1{margin:0;font-weight:700;letter-spacing:-.01em;line-height:1.1}
em,h1 span{font-style:normal;background:linear-gradient(90deg,#FF9E64,#FF0080);-webkit-background-clip:text;color:transparent}
.note{color:#A1A1AA;line-height:1.35;margin:0}
.source{color:#71717A;font-size:18px;letter-spacing:.16em;line-height:1.6}
.source b{font-weight:500;color:#FF9E64}
.frame{background:#1c1c1c;border:1px solid rgba(255,255,255,.08);border-radius:22px;padding:12px;flex:none}
.frame img{display:block;border-radius:12px}
.columns{display:grid;grid-template-columns:20.6% repeat(4,1fr);height:40px;padding-top:6px;color:#A1A1AA;font-size:18px;letter-spacing:.12em}
.columns span{padding-left:14px}.columns span:nth-child(2){color:#00F0FF}

.split .text{position:absolute;left:72px;top:170px;width:760px;height:750px;display:flex;flex-direction:column}
.split h1{font-size:68px;margin-top:28px}.split .note{font-size:32px;margin-top:34px}.split .source{margin-top:auto}
.split .art{position:absolute;left:900px;right:72px;top:150px;height:790px;display:flex;align-items:center;justify-content:center}

.stack .text{position:absolute;left:72px;right:72px;top:146px}
.stack h1{font-size:58px;margin-top:14px;white-space:nowrap}
.stack .art{position:absolute;left:72px;right:72px;top:276px;height:604px;display:flex;align-items:center;justify-content:center;gap:28px}
.stack .base{position:absolute;left:72px;right:72px;top:894px;height:74px;display:flex;justify-content:space-between;align-items:center;gap:40px}
.stack .note{font-size:28px}.stack .source{text-align:right;flex:none}

.poster .eyebrow{position:absolute;left:100px;top:200px;font-size:29px;letter-spacing:.2em}
.poster h1{position:absolute;left:100px;top:285px;font-size:104px}
.poster .note{position:absolute;left:100px;top:560px;width:820px;font-size:34px;line-height:1.4}
.poster .tags{position:absolute;left:100px;top:900px;color:#FF9E64;font-size:22px;letter-spacing:.24em}
.poster ol{position:absolute;left:100px;top:540px;margin:0;padding:0;list-style:none;width:860px}
.poster li{display:flex;align-items:baseline;gap:28px;padding:22px 0;border-top:1px solid rgba(255,255,255,.08);font-size:44px;font-weight:700;line-height:1.1}
.poster li b{font-family:'JetBrains Mono',monospace;font-weight:500;font-size:22px;letter-spacing:.2em;width:110px;flex:none}
.poster li:nth-child(1) b{color:#FF9E64}.poster li:nth-child(2) b{color:#FF0080}.poster li:nth-child(3) b{color:#00F0FF}
.poster .parrot{position:absolute;left:1050px;top:150px;width:780px;height:780px;border-radius:40px;padding:29px}
.poster .parrot img{width:100%;height:100%;object-fit:cover;border-radius:22px}
`;

const url = (file) => pathToFileURL(file).href;
const foot = '<footer class="mono"><span>longmontai.com</span><span>Curated by intelligence.</span></footer>';
const parrot = `<div class="frame parrot"><img src="${url(path.join(brand, 'source/logo-master-2048.png'))}" alt=""></div>`;

function cropFile(name) {
  return path.join(cropDir, readdirSync(cropDir).find((entry) => entry.startsWith(`${name}.`)));
}

function contentSlide(slide, index, total) {
  const files = slide.img.map(cropFile);
  const sizes = files.map(size);
  const layout = files.length > 1 || sizes[0][0] / sizes[0][1] >= 1.5 ? 'stack' : 'split';
  // Inner box of the art area: its size less the frame padding, shared when two images sit side by side.
  const maxWidth = layout === 'split' ? 924 : (1776 - 28 * (files.length - 1)) / files.length - 24;
  const maxHeight = (layout === 'split' ? 766 : 580) - (slide.columns ? 40 : 0);
  const frames = files.map((file, index) => {
    const [width, height] = sizes[index];
    const scale = Math.min(maxWidth / width, maxHeight / height);
    return `<div class="frame" style="width:${Math.round(width * scale) + 26}px">${slide.columns
      ? `<div class="columns mono">${slide.columns.map((label) => `<span>${label}</span>`).join('')}</div>` : ''}<img src="${url(file)}" width="${Math.round(width * scale)}" height="${Math.round(height * scale)}" alt=""></div>`;
  }).join('');
  const eyebrow = `<div class="eyebrow mono">+ ${slide.section}</div>`;
  const source = `<div class="source mono"><b>${slide.label}</b> &middot; ${slide.source}</div>`;
  const text = layout === 'split'
    ? `<div class="text">${eyebrow}<h1>${slide.title}</h1><p class="note">${slide.note}</p>${source}</div>`
    : `<div class="text">${eyebrow}<h1>${slide.title}</h1></div><div class="base"><p class="note">${slide.note}</p>${source}</div>`;
  const count = `${String(index + 1).padStart(2, '0')} / ${total} &middot; Who checks the work?`;
  return `<section class="slide ${layout}"><header><div class="brand"><img src="${url(path.join(brand, 'logo/logo-256.png'))}" alt="">Longmont AI</div>
<div class="count mono">${count}</div></header>${text}<div class="art">${frames}</div>${foot}</section>`;
}

function deck() {
  const total = slides.length + 2;
  const cover = `<section class="slide poster"><div class="eyebrow mono">+ Longmont AI / November 25 briefing</div>
<h1>Who checks<br><span>the work?</span></h1><p class="note">Claude Ship lets AI review, fix and approve code, under rules people write. Plus Gemini 4 Neon's cost per task.</p>
<div class="tags mono">Models / Agents</div>${parrot}${foot}</section>`;
  const closing = `<section class="slide poster"><div class="eyebrow mono">+ Longmont AI / November 25 briefing</div>
<h1 style="font-size:84px">Three questions<br><span>for any AI teammate</span></h1><ol>
<li><b>ASK 1</b>Who wrote the rules?</li><li><b>ASK 2</b>What did it leave out?</li><li><b>ASK 3</b>Can you undo it?</li>
</ol>${parrot}${foot}</section>`;
  return [cover, ...slides.map((slide, index) => contentSlide(slide, index + 1, total)), closing];
}

function page(sections) {
  return `<!doctype html><html lang="en"><meta charset="utf-8"><title>Who checks the work?</title>
<link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Serif:wght@400;700&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet">
<style>${css}</style>${sections.join('\n')}</html>`;
}

function chrome(...args) {
  execFileSync(CHROME, ['--headless=new', '--disable-gpu', '--hide-scrollbars', '--virtual-time-budget=8000', ...args], { stdio: 'ignore' });
}

// The PDF is built from exported slide images so both always show the same pixels.
function pdf(images, title, pdfFile, work) {
  const html = path.join(work, `${path.basename(pdfFile)}.html`);
  writeFileSync(html, `<!doctype html><meta charset="utf-8"><title>${title}</title><style>@page{size:1920px 1080px;margin:0}
html,body{margin:0}img{display:block;width:1920px;height:1080px;page-break-after:always}</style>${images.map((file) => `<img src="${url(file)}">`).join('')}`);
  chrome(`--print-to-pdf=${pdfFile}`, '--no-pdf-header-footer', url(html));
}

function render(assetDir) {
  cropDir = assetDir;
  const work = mkdtempSync(path.join(tmpdir(), `${DECK}-`));
  const sections = deck();
  const names = ['cover', ...slides.map((slide) => slide.img[0]), 'three-questions'];
  const outputs = sections.map((section, index) => {
    const html = path.join(work, `${index}.html`);
    const png = path.join(work, `${index}.png`);
    const jpg = path.join(assetDir, `${DECK}-${String(index + 1).padStart(2, '0')}-${names[index]}.jpg`);
    writeFileSync(html, page([section]));
    chrome(`--screenshot=${png}`, '--window-size=1920,1080', url(html));
    execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-i', png, '-q:v', '2', '-map_metadata', '-1', jpg]);
    return jpg;
  });
  pdf(outputs, 'Who checks the work?', path.join(assetDir, `${DECK}.pdf`), work);
  const briefing = readdirSync(assetDir).filter((name) => /^slide-\d\d-.*\.png$/.test(name)).sort().map((name) => path.join(assetDir, name));
  pdf(briefing, 'From chatbot to teammate', path.join(assetDir, 'chatbot-to-teammate-briefing.pdf'), work);
  const markdown = outputs.map((file, index) => {
    const alt = index === 0 ? 'Cover slide: Who checks the work?'
      : index === outputs.length - 1 ? 'Closing slide: three questions for any AI teammate.'
      : `${slides[index - 1].title.replace(/<[^>]+>/g, '')}. ${slides[index - 1].alt}`;
    return `![${alt}](/weekly-screenshots/${DATE}/${path.basename(file)})`;
  }).join('\n');
  console.log(markdown);
}

const [command, ...rest] = process.argv.slice(2);
if (command === 'render' && rest.length === 1) render(path.resolve(rest[0]));
else { console.error('Usage: build.mjs render <assets dir>'); process.exit(2); }
