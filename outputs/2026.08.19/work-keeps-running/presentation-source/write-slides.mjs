import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(fileURLToPath(import.meta.url));
const cssHref = 'slides.css';

const slides = [
  {
    file: 'slide-01.html',
    n: '01',
    body: `
      <p class="kicker">August 19 briefing</p>
      <h1>The work keeps <span class="grad">running</span></h1>
      <p class="dek">Agents left the chat window. Local weights started looking like runtimes. Science returned artifacts you can check. The fabs still set the price.</p>
      <div class="rule"></div>
      <p class="claim">Models, tools, proofs, and chips — one stack, four layers.</p>
    `,
  },
  {
    file: 'slide-02.html',
    n: '02',
    body: `
      <p class="kicker">Release board</p>
      <h1>Five moves in a fortnight</h1>
      <p class="dek">Practical impact for builders, not parameter count. Scores and prices are vendor-reported.</p>
      <div class="grid cols-5">
        <article class="card"><p class="label">Aug 11</p><h2>Grok Bot</h2><p>Always-on agents on a shared cloud computer. Beta, gated plans.</p></article>
        <article class="card"><p class="label">Aug 12</p><h2>Grok 4.6</h2><p>Long-running agents. $2 / $6 per million tokens.</p></article>
        <article class="card"><p class="label">Aug 13</p><h2>3.7 Flash</h2><p>Workhorse coding model. Intro $0.75 / $3.75 through year-end.</p></article>
        <article class="card"><p class="label">Aug 14</p><h2>Qwen 27B</h2><p>Apache 2.0 dense VLM. 262K native context.</p></article>
        <article class="card"><p class="label">Aug 10</p><h2>Glimmer</h2><p>30B local agent. Fits a 24–32 GB GPU envelope.</p></article>
      </div>
    `,
  },
  {
    file: 'slide-03.html',
    n: '03',
    body: `
      <p class="kicker">Best new tool</p>
      <h1>Grok Bot is a computer</h1>
      <p class="dek">Named agents share one persistent cloud VM — browser, filesystem, terminal — and keep working after you close the laptop.</p>
      <div class="grid cols-2">
        <article class="card">
          <p class="label">What it is</p>
          <ul>
            <li>Work lands in the real app, not a chat draft</li>
            <li>Show a workflow once; save it as a routine</li>
            <li>Bots can message each other in a group thread</li>
          </ul>
        </article>
        <article class="card">
          <p class="label">What it is not</p>
          <ul>
            <li>Not a per-Bot security boundary — logins are shared</li>
            <li>Approvals do not undo work already done</li>
            <li>Beta: SuperGrok Heavy, Cursor Ultra, Teams Premium</li>
          </ul>
        </article>
      </div>
    `,
  },
  {
    file: 'slide-04.html',
    n: '04',
    body: `
      <p class="kicker">Local open weights</p>
      <h1>Agent runtimes you can host</h1>
      <p class="dek">The interesting local story is no longer a 7B chatbot. It is an agent loop that never leaves the machine.</p>
      <div class="grid cols-2">
        <article class="card">
          <p class="label">Muse Glimmer · Aug 10</p>
          <p class="stat">30B<small>Apache 2.0 · ~4-bit under 20 GB</small></p>
          <p>Meta distilled a local agent from a larger Muse teacher. Artificial Analysis independently scored Glimmer (high) at 35 on its Intelligence Index.</p>
        </article>
        <article class="card">
          <p class="label">Qwen3.8-27B · Aug 14</p>
          <p class="stat">262K<small>native context · image and video</small></p>
          <p>Alibaba reports 61.7 on SWE-bench Pro under a named Claude Code harness. Treat that as a vendor card, then run it on your GPU.</p>
        </article>
      </div>
    `,
  },
  {
    file: 'slide-05.html',
    n: '05',
    body: `
      <p class="kicker">Serving</p>
      <h1>Cheap tokens, then fast tokens</h1>
      <p class="dek">Routing now includes effort sliders, intro pricing, and a wafer-scale preview. None of those numbers transfer without a local acceptance test.</p>
      <div class="grid cols-3">
        <article class="card">
          <p class="label">Gemini 3.7 Flash</p>
          <p class="stat">$0.75<small>per million input, intro through Dec 31</small></p>
          <p>Vendor-reported DeepSWE v1.1: 65.3% vs 49.0% for 3.6 Flash. Spark now runs on 3.7.</p>
        </article>
        <article class="card">
          <p class="label">ChatGPT access</p>
          <p class="stat">Slider<small>Sol for Plus/Pro · Luna for Free/Go</small></p>
          <p>Unlimited text chats are rolling out. Codex and Work keep the July builds.</p>
        </article>
        <article class="card">
          <p class="label">Ultrafast preview</p>
          <p class="stat">750<small>output tok/s, Cerebras, vendor ceiling</small></p>
          <p>OpenAI says up to 14× Standard. No public price. No GA date. Waitlist only.</p>
        </article>
      </div>
    `,
  },
  {
    file: 'slide-06.html',
    n: '06',
    body: `
      <p class="kicker">Mathematics</p>
      <h1>A tighter bound, not a solved hypothesis</h1>
      <p class="dek">An unreleased Claude raised the proven share of zeta zeros on the critical line. Lean can check the encoding. Humans still decide what it means.</p>
      <div class="grid cols-2">
        <article class="card">
          <p class="label">Prior bound</p>
          <p class="stat">41.6%</p>
          <p>Longstanding lower bound on zeros of the Riemann zeta function that lie on the critical line.</p>
        </article>
        <article class="card">
          <p class="label">Claude research result · Aug 10</p>
          <p class="stat">67.2%</p>
          <p>~60 subagents, 31M output tokens, Lean formalization. Conrey and Goldston examined the paper. The Riemann hypothesis remains open.</p>
        </article>
      </div>
    `,
  },
  {
    file: 'slide-07.html',
    n: '07',
    body: `
      <p class="kicker">Earth science</p>
      <h1>An extra day of cyclone lead time</h1>
      <p class="dek">WeatherNext Cyclones, in Nature on August 6, reports a day or more of average advantage on track, intensity, and wind structure versus leading operational models.</p>
      <div class="grid cols-3">
        <article class="card"><p class="label">Paper</p><h2>2023–2025 storms</h2><p>Average extra-day lead time. Three-day skill matching prior two-day skill, per DeepMind.</p></article>
        <article class="card"><p class="label">Operations</p><h2>NHC, 2025</h2><p>Used alongside official guidance, including Hurricane Melissa. Not a replacement for warnings.</p></article>
        <article class="card"><p class="label">Release</p><h2>Open weights</h2><p>Cyclones, WeatherNext 2, and a Colab-runnable mini variant are public.</p></article>
      </div>
    `,
  },
  {
    file: 'slide-08.html',
    n: '08',
    body: `
      <p class="kicker">Markets and chips</p>
      <h1>Arizona turns a profit. Memory does not get cheaper.</h1>
      <p class="dek">This is a supply-chain briefing, not an investment thesis.</p>
      <div class="grid cols-2">
        <article class="card">
          <p class="label">TSMC Arizona · 1H26</p>
          <p class="stat">+663%<small>YoY profit, per TrendForce citing the interim report</small></p>
          <p>NT$36.1B first-half profit; most profitable overseas subsidiary. Q2 still slipped 8.2% QoQ as depreciation rose.</p>
        </article>
        <article class="card">
          <p class="label">DDR5 retail · August</p>
          <p class="stat">~4.9×<small>Germany index vs a year ago, 3D Center via TrendForce</small></p>
          <p>Server DRAM contracts still seen up 13–18% QoQ in 3Q26. Local GPUs and API bills share this floor.</p>
        </article>
      </div>
    `,
  },
  {
    file: 'slide-09.html',
    n: '09',
    body: `
      <p class="kicker">This week</p>
      <h1>Hand it off. Then verify.</h1>
      <div class="rule"></div>
      <ul>
        <li>Compare Grok 4.6 and Gemini 3.7 Flash on five real tasks, scored per accepted result.</li>
        <li>If you have Grok Bot, give it one multi-app job with an approval gate on send, pay, or publish.</li>
        <li>If you have 24 GB+, run Glimmer or Qwen3.8-27B on one private loop.</li>
        <li>Read the Lean artifact before repeating a math headline. Keep NHC in front of any weather demo.</li>
        <li>Price RAM and GPUs as part of the model decision.</li>
      </ul>
    `,
  },
];

function html(slide) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>Slide ${slide.n}</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Beleza&family=JetBrains+Mono:wght@400;500;700&display=swap">
  <link rel="stylesheet" href="${cssHref}">
</head>
<body>
  <div class="slide">
    <div class="accent"></div>
    ${slide.body}
    <div class="footer">
      <span>Longmont AI · The work keeps running</span>
      <span>${slide.n}</span>
    </div>
  </div>
</body>
</html>
`;
}

await mkdir(root, { recursive: true });
for (const slide of slides) {
  await writeFile(join(root, slide.file), html(slide));
}
console.log(`Wrote ${slides.length} slide HTML files.`);
