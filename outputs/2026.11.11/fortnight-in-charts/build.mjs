#!/usr/bin/env node
// Builds the Nov 11 "fortnight in charts" deck.
//   node build.mjs crop <dir of numbered source screenshots>   -> crops/
//   node build.mjs render <slides out dir> <pdf out file>      -> slide JPEGs and the PDF; prints the article gallery
import { execFileSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const cropDir = path.join(here, 'crops');
const brand = path.resolve(here, '../../../public/brand');
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const DECK = 'fortnight-in-charts';

// box is [x0, y0, x1, y1] measured on a copy scaled so its longest side is 1500 px.
const crops = [
  { n: '01', name: 'cve-publication-pace', box: [0, 0, 1420, 1383] },
  { n: '02', name: 'php-share-of-websites' },
  { n: '03', name: 'simulated-network-attack-objectives' },
  { n: '04', name: 'agents-fix-it-fast-rule', box: [0, 0, 1500, 640] },
  { n: '06', name: 'big-tech-capex-apple' },
  { n: '07', name: 'meta-personal-superintelligence-index' },
  { n: '09', name: 'meta-active-memory-eval', box: [58, 0, 1500, 824] },
  { n: '11', name: 'grades-in-the-age-of-ai', box: [146, 0, 1355, 682] },
  { n: '12', name: 'tesla-fsd-miles-per-collision', box: [130, 228, 670, 650] },
  { n: '13', name: 'anthropic-518-billion-compute-plan', box: [146, 0, 1355, 682] },
  { n: '14', name: 'kimi-five-weeks-behind-frontier', box: [278, 127, 1221, 658] },
  { n: '16', name: 'nvidia-dollar-flow-model' },
  { n: '17', name: 'net-cash-anthropic-alphabet-meta', box: [0, 0, 1486, 1434] },
  { n: '18', name: 'gallup-ai-use-at-work' },
  { n: '21', name: 'talk-how-developers-work-with-ai', box: [146, 0, 1355, 682] },
  { n: '22', name: 'talk-what-wakes-the-agent', box: [146, 0, 1355, 682] },
  { n: '23', name: 'talk-the-agents-computer', box: [146, 0, 1355, 682] },
  { n: '24', name: 'talk-three-parts-of-the-system', box: [146, 0, 1355, 682] },
  { n: '25', name: 'talk-when-you-hit-send', box: [146, 0, 1355, 682] },
  { n: '27', name: 'gpu-rental-price-changes', box: [30, 290, 965, 765] },
  { n: '28', name: 'space-hardware-investment', box: [50, 773, 768, 1490] },
  { n: '29', name: 'satellite-builders-per-year', box: [45, 552, 977, 1482] },
  { n: '30', name: 'gdpx-leaderboard', box: [241, 88, 1258, 660] },
  { n: '31', name: 'gdpx-models-by-domain', box: [241, 88, 1258, 608] },
  { n: '32', name: 'lifeval-everyday-tasks', box: [241, 88, 1258, 660] },
  { n: '34', name: 'anthropic-ai-bill-tops-payroll' },
  { n: '35', name: 'metr-evidence-shared', box: [0, 90, 1500, 1372] },
  { n: '36', name: 'cost-of-benchmark-scores', box: [385, 15, 1115, 612] },
  { n: '39', name: 'dreaming-memory-representations', box: [17, 28, 1476, 697] },
  { n: '41', name: 'dreaming-injected-context', box: [24, 30, 1480, 698] },
  { n: '42', name: 'ai-optimism-by-country', box: [0, 0, 1500, 1215] },
  { n: '44', name: 'fable-5-2-benchmark-table', box: [65, 90, 1221, 808] },
  { n: '46', name: 'frontiercode-accuracy-vs-cost', box: [0, 12, 1490, 1148] },
];

const slides = [
  { section: 'Models', label: 'Vendor-reported', source: 'Anthropic benchmark table', img: ['fable-5-2-benchmark-table'],
    title: 'Fable 5.2 tops <em>most rows</em> of Anthropic\'s table', note: 'AutomationBench is the exception.',
    columns: ['', 'Fable 5.2', 'Fable 5.1', 'Opus 5.5', 'GPT-6 Astra'],
    alt: 'Anthropic\'s benchmark table comparing Claude Fable 5.2 with Fable 5.1, Opus 5.5 and GPT-6 Astra.' },
  { section: 'Models', label: 'Vendor-reported', source: 'Anthropic, FrontierCode 2.0', img: ['frontiercode-accuracy-vs-cost'],
    title: '<em>More effort</em> is not always more score', note: 'At Max, Fable 5.2 costs $44.70 a task and scores below Xhigh.',
    alt: 'FrontierCode 2.0 score against cost per task for five models at several effort settings.' },
  { section: 'Models', label: 'Analysis', source: 'Ramez Naam on Artificial Analysis data', img: ['kimi-five-weeks-behind-frontier'],
    title: 'Kimi K3.1 Pro sits <em>about five weeks</em> behind the US frontier', note: '55 points against 58 on one intelligence index.',
    alt: 'Intelligence index over twelve months, with Kimi K3.1 Pro about five weeks behind the fitted US frontier trend.' },
  { section: 'Models', label: 'Benchmark', source: 'GDPx leaderboard', img: ['gdpx-leaderboard', 'gdpx-models-by-domain'],
    title: 'On expert work, the best model scores <em>12%</em>', note: 'GDPx averages 11 domains, from chip design to law.',
    alt: 'GDPx leaderboard led by Claude Opus 5.5 at 12%, beside a radar chart of model scores by domain.' },
  { section: 'Models', label: 'Benchmark', source: 'LifeEval, OpenAI models only', img: ['lifeval-everyday-tasks'],
    title: 'Everyday tasks: <em>about 83%</em>, with less waiting', note: 'Newer models score higher in fewer minutes.',
    alt: 'LifeEval chart of average reward against minutes per attempt for five GPT models.' },
  { section: 'Models', label: 'Chart', source: 'As shown in a video; original source not named', img: ['cost-of-benchmark-scores'],
    title: 'The price of a given score <em>keeps falling</em>', note: 'Lowest cost to reach 25% or 75% on four benchmarks.',
    alt: 'Cost per task to reach a 25% or 75% score on four benchmarks, falling with each model release.' },
  { section: 'Models', label: 'Vendor-reported', source: 'Meta', img: ['meta-active-memory-eval', 'meta-personal-superintelligence-index'],
    title: 'Meta says Muse now <em>remembers better</em>', note: 'Its memory test rose from 76% to 90%.',
    alt: 'Two Meta bar charts: an active memory eval at 90% against 76%, and a personal superintelligence index at 47% against 38%.' },

  { section: 'Agents', label: 'Talk slide', source: 'As presented by the vendor', img: ['talk-how-developers-work-with-ai'],
    title: 'From copy and paste to <em>always-on agents</em>', note: 'Four stages in four years.',
    alt: 'Talk slide showing four stages of how developers work with AI, ending in always-on agents.' },
  { section: 'Agents', label: 'Talk slide', source: 'As presented by the vendor', img: ['talk-three-parts-of-the-system'],
    title: 'The agent runs on a server and <em>works on its own computer</em>', note: 'Every app shows the same conversation.',
    alt: 'Talk slide showing apps and channels, a server that runs the agent, and the agent\'s own computer.' },
  { section: 'Agents', label: 'Talk slide', source: 'As presented by the vendor', img: ['talk-what-wakes-the-agent'],
    title: 'Seven things can <em>wake</em> an agent', note: 'It may still decide to stay quiet.',
    alt: 'Talk slide listing seven wake-up sources feeding a router, a queue and an "anything worth saying?" check.' },
  { section: 'Agents', label: 'Talk slide', source: 'As presented by the vendor', img: ['talk-when-you-hit-send'],
    title: 'The database is the truth. <em>Notifications only nudge.</em>', note: 'IDs and sequence numbers keep every app in step.',
    alt: 'Talk slide with four steps after you hit send: sending, the turn, watching and ordering.' },
  { section: 'Agents', label: 'Talk slide', source: 'As presented by the vendor', img: ['talk-the-agents-computer'],
    title: 'The agent\'s computer <em>sleeps when idle</em>', note: 'It wakes with files and logins intact.',
    alt: 'Talk slide showing the agent\'s virtual machine, and what happens when it goes to sleep and wakes up.' },
  { section: 'Agents', label: 'Research', source: 'Anthropic, The components of agent memory', img: ['dreaming-memory-representations', 'dreaming-injected-context'],
    title: 'Dreaming <em>rewrites memory</em> between sessions', note: 'It builds summaries and updates what loads every time.',
    alt: 'Two Anthropic diagrams of dreaming: building memory representations, and writing to the injected context.' },
  { section: 'Agents', label: 'Social post', source: 'One team\'s claim, shared on X', img: ['agents-fix-it-fast-rule'],
    title: 'One team\'s rule: <em>fix it fast</em>', note: 'No human in the loop. A claim, not a recommendation.',
    alt: 'Slide text: agents fix every error hit by a user and verify their own work with no human in the loop.' },

  { section: 'Security', label: 'Analysis', source: 'Social Capital on NIST and W3Techs data', img: ['cve-publication-pace', 'php-share-of-websites'],
    title: 'Software flaws arrive at <em>four times</em> last year\'s pace', note: '593 new CVEs a day in October, up from 138.',
    alt: 'A chart of new CVEs published per day rising to 593, beside a chart of PHP running 69.3% of websites.' },
  { section: 'Security', label: 'Analysis', source: 'Social Capital on Vals AI data', img: ['simulated-network-attack-objectives'],
    title: 'DeepSeek <em>edged</em> OpenAI in a simulated attack', note: '16.3 against 15.7 of 21 objectives, over three runs.',
    alt: 'Objectives completed in a simulated network attack by tokens used, for six models.' },
  { section: 'Security', label: 'Independent evaluator', source: 'METR', img: ['metr-evidence-shared'],
    title: 'METR saw <em>more evidence</em> than the public did', note: 'Most rows are missing from the public report.',
    alt: 'METR table of AI R&D evidence types, marking what was shared with METR and what is in the public report.' },

  { section: 'Money', label: 'News headline', source: 'The Motley Fool', img: ['anthropic-518-billion-compute-plan'],
    title: 'Anthropic plans <em>$518 billion</em> of compute spending', note: 'Over $100 billion is promised to Amazon.',
    alt: 'Headline: Anthropic plans to spend $518 billion on cloud and data centers.' },
  { section: 'Money', label: 'Analysis', source: 'Social Capital on company filings', img: ['net-cash-anthropic-alphabet-meta'],
    title: 'Anthropic holds <em>$125 billion</em> in net cash', note: 'Meta is just below zero.',
    alt: 'Net cash bar chart: Anthropic $125.4bn, Alphabet $140.0bn, Meta minus $1.2bn.' },
  { section: 'Money', label: 'News report', source: 'Business Insider, Nov 1', img: ['anthropic-ai-bill-tops-payroll'],
    title: 'Anthropic\'s AI bill now <em>tops its payroll</em>', note: 'Internal Claude use grew 250 times in nine months.',
    alt: 'Three figures: 250x internal Claude usage, over 90% of new code written by Claude, 5,300 employees.' },
  { section: 'Money', label: 'Illustrative model', source: 'Third-party estimates, listed on the chart', img: ['nvidia-dollar-flow-model'],
    title: '$1 of chips becomes <em>$17.80</em> of AI revenue', note: 'A model built on assumptions, not reported data.',
    alt: 'A flow from $1 of Nvidia cost of goods to Nvidia, SpaceXAI, Anthropic and customer value.' },
  { section: 'Money', label: 'Analysis', source: 'a16z on Fiscal.ai data', img: ['big-tech-capex-apple'],
    title: 'Apple is <em>sitting out</em> the spending race', note: 'Its capex is flat since 2023. Peers grew five to eight times.',
    alt: 'Big Tech capital spending indexed to Q1 2023 and as a share of sales, with Apple flat.' },
  { section: 'Money', label: 'Vendor notice', source: 'Daytona price change, Nov 15', img: ['gpu-rental-price-changes'],
    title: 'GPU rental prices are going <em>up</em>', note: 'The newest chip rises 27% an hour.',
    alt: 'Table of GPU hourly rental prices before and after a November 15 increase.' },
  { section: 'Money', label: 'Analysis', source: 'Social Capital', img: ['space-hardware-investment', 'satellite-builders-per-year'],
    title: 'Space hardware: <em>$17 billion</em> a year, six times the builders', note: 'The investment figure excludes SpaceX.',
    alt: 'Private investment in space hardware without SpaceX, beside the number of companies building satellites each year.' },

  { section: 'People', label: 'Survey', source: 'Gallup', img: ['gallup-ai-use-at-work'],
    title: 'Three in ten US workers use AI <em>every week</em>', note: 'Daily use nearly doubled in a year.',
    alt: 'Gallup lines for US employees using AI at work daily and a few times a week, Q2 2025 to Q2 2026.' },
  { section: 'People', label: 'Survey', source: 'Top and bottom five countries', img: ['ai-optimism-by-country'],
    title: 'Americans rank <em>near the bottom</em> on AI optimism', note: '36% expect it to mostly help. In China, 93%.',
    alt: 'Table of the top five and bottom five countries by share expecting AI to mostly help.' },
  { section: 'People', label: 'Illustration and one study', source: 'Bastani et al., PNAS 2025', img: ['grades-in-the-age-of-ai'],
    title: 'Same tool, <em>two outcomes</em> in class', note: 'Asking for answers and checking understanding diverge.',
    alt: 'Illustration of grades splitting into two groups, with a study inset: practice up 48%, exam down 17%.' },
  { section: 'People', label: 'Company-reported', source: 'Tesla data, via a post on X', img: ['tesla-fsd-miles-per-collision'],
    title: 'Tesla reports <em>6 million miles</em> per major collision on FSD', note: 'It puts the US average near 660,000.',
    alt: 'Post listing Tesla\'s reported miles per major collision with and without FSD (Supervised).' },
];

function size(file) {
  const out = execFileSync('sips', ['-g', 'pixelWidth', '-g', 'pixelHeight', file], { encoding: 'utf8' });
  return [Number(/pixelWidth: (\d+)/.exec(out)[1]), Number(/pixelHeight: (\d+)/.exec(out)[1])];
}

function crop(sourceDir) {
  mkdirSync(cropDir, { recursive: true });
  const sources = readdirSync(sourceDir);
  for (const { n, name, box } of crops) {
    const file = sources.find((entry) => entry.startsWith(`${n}.`));
    const source = path.join(sourceDir, file);
    const [width, height] = size(source);
    const scale = Math.max(width, height) / 1500;
    const [x0, y0, x1, y1] = (box ?? [0, 0, width / scale, height / scale]).map((value) => Math.round(value * scale));
    const target = path.join(cropDir, `${name}${path.extname(file)}`);
    const quality = path.extname(file) === '.png' ? [] : ['-q:v', '2'];
    execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-i', source, '-vf',
      `crop=${Math.min(x1, width) - x0}:${Math.min(y1, height) - y0}:${x0}:${y0}`, '-map_metadata', '-1', ...quality, target]);
  }
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
  const count = `${String(index + 1).padStart(2, '0')} / ${total} &middot; The fortnight in charts`;
  return `<section class="slide ${layout}"><header><div class="brand"><img src="${url(path.join(brand, 'logo/logo-256.png'))}" alt="">Longmont AI</div>
<div class="count mono">${count}</div></header>${text}<div class="art">${frames}</div>${foot}</section>`;
}

function deck() {
  const total = slides.length + 2;
  const cover = `<section class="slide poster"><div class="eyebrow mono">+ Longmont AI / November 11 briefing</div>
<h1>The fortnight<br><span>in charts</span></h1><p class="note">Charts and slides we saved along the way, each with one takeaway.</p>
<div class="tags mono">Models / Agents / Security / Money / People</div>${parrot}${foot}</section>`;
  const closing = `<section class="slide poster"><div class="eyebrow mono">+ Longmont AI / November 11 briefing</div>
<h1>Three questions<br><span>for any chart</span></h1><ol>
<li><b>ASK 1</b>Who measured it?</li><li><b>ASK 2</b>What does a finished job cost?</li><li><b>ASK 3</b>Can you check it yourself?</li>
</ol>${parrot}${foot}</section>`;
  return [cover, ...slides.map((slide, index) => contentSlide(slide, index + 1, total)), closing];
}

function page(sections) {
  return `<!doctype html><html lang="en"><meta charset="utf-8"><title>The fortnight in charts</title>
<link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Serif:wght@400;700&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet">
<style>${css}</style>${sections.join('\n')}</html>`;
}

function chrome(...args) {
  execFileSync(CHROME, ['--headless=new', '--disable-gpu', '--hide-scrollbars', '--virtual-time-budget=8000', ...args], { stdio: 'ignore' });
}

function render(slideDir, pdfFile) {
  mkdirSync(slideDir, { recursive: true });
  const work = mkdtempSync(path.join(tmpdir(), `${DECK}-`));
  const sections = deck();
  const names = ['cover', ...slides.map((slide) => slide.img[0]), 'three-questions'];
  const outputs = sections.map((section, index) => {
    const html = path.join(work, `${index}.html`);
    const png = path.join(work, `${index}.png`);
    const jpg = path.join(slideDir, `${DECK}-${String(index + 1).padStart(2, '0')}-${names[index]}.jpg`);
    writeFileSync(html, page([section]));
    chrome(`--screenshot=${png}`, '--window-size=1920,1080', url(html));
    execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-i', png, '-q:v', '2', '-map_metadata', '-1', jpg]);
    return jpg;
  });
  // The PDF is built from the exported slides so both always show the same pixels.
  const pdfHtml = path.join(work, 'pdf.html');
  writeFileSync(pdfHtml, `<!doctype html><meta charset="utf-8"><title>The fortnight in charts</title><style>@page{size:1920px 1080px;margin:0}
html,body{margin:0}img{display:block;width:1920px;height:1080px;page-break-after:always}</style>${outputs.map((file) => `<img src="${url(file)}">`).join('')}`);
  chrome(`--print-to-pdf=${pdfFile}`, '--no-pdf-header-footer', url(pdfHtml));
  const markdown = outputs.map((file, index) => {
    const alt = index === 0 ? 'Cover slide: The fortnight in charts.'
      : index === outputs.length - 1 ? 'Closing slide: three questions for any chart.'
      : `${slides[index - 1].title.replace(/<[^>]+>/g, '')}. ${slides[index - 1].alt}`;
    return `![${alt}](/weekly-screenshots/2026.11.11/${path.basename(file)})`;
  }).join('\n');
  console.log(markdown);
}

const [command, ...rest] = process.argv.slice(2);
if (command === 'crop' && rest.length === 1) crop(rest[0]);
else if (command === 'render' && rest.length === 2) render(path.resolve(rest[0]), path.resolve(rest[1]));
else { console.error('Usage: build.mjs crop <source dir> | render <slides dir> <pdf file>'); process.exit(2); }
