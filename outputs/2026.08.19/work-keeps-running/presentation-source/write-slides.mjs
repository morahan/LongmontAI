import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(fileURLToPath(import.meta.url));
const brand = '../../../../public/brand';

const slides = [
  {
    file: 'slide-01.html', n: '01', kind: 'cover', body: `
      <div class="cover-grid"><div><p class="kicker">Longmont AI / August 19 briefing</p><h1 class="cover-title">The work keeps running</h1><p class="dek">Agents leave chat. Science gets checkable. Hardware sets the floor.</p><p class="brand-meta">Models / tools / science / chips</p></div><img class="cover-logo" src="${brand}/source/logo-master-2048.png" alt="Longmont AI cubist parrot"></div>`,
  },
  {
    file: 'slide-02.html', n: '02', kind: 'content', body: `
      <p class="kicker">Release board</p><h1>Five moves</h1><p class="dek">What changed for builders.</p>
      <div class="release-grid"><article class="release"><img src="assets/grok-bot.png" alt="Grok Bot"><p class="date">AUG 11</p><h2>Grok Bot</h2><p>Persistent cloud agents.</p></article><article class="release"><img src="assets/grok-4-6.png" alt="Grok 4.6"><p class="date">AUG 12</p><h2>Grok 4.6</h2><p>Long jobs. $2 / $6.</p></article><article class="release"><img src="assets/gemini-3-7-flash.png" alt="Gemini 3.7 Flash"><p class="date">AUG 13</p><h2>3.7 Flash</h2><p>Workhorse price cut.</p></article><article class="release"><img src="assets/qwen3-8-27b.png" alt="Qwen3.8-27B"><p class="date">AUG 14</p><h2>Qwen 27B</h2><p>262K local VLM.</p></article><article class="release"><img src="assets/muse-glimmer.png" alt="Muse Glimmer"><p class="date">AUG 10</p><h2>Glimmer</h2><p>30B local agent.</p></article></div><p class="source">Provider-reported. Images: official announcements and model pages.</p>`,
  },
  {
    file: 'slide-03.html', n: '03', kind: 'content', body: `
      <div class="split equal"><div><p class="kicker">Agent tools</p><h1>Grok Bot is a computer</h1><p class="dek">Persistent VM. Shared sessions. Work continues.</p><div class="callout"><strong>Boundary:</strong> one account, not one per Bot.</div><p class="note" style="margin-top:20px">Gate send, spend, publish, and production.</p></div><div class="media-wrap"><img class="media" src="assets/grok-bot.png" alt="Official Grok Bot launch graphic"><span class="source source-overlay">xAI / Aug. 11</span></div></div>`,
  },
  {
    file: 'slide-04.html', n: '04', kind: 'content', body: `
      <p class="kicker">Open weights</p><h1>Local agents get serious</h1><p class="dek">Multimodal runtimes now fit one workstation.</p><div class="split equal" style="height:580px;margin-top:18px"><div><div class="media-wrap short"><img class="media contain" src="assets/muse-glimmer.png" alt="Muse Glimmer model card"><span class="source source-overlay">Meta / Hugging Face</span></div><div class="stat-row"><div class="stat-block"><p class="stat">30B<small>Apache 2.0</small></p></div><div class="stat-block purple"><p class="stat">&lt;20 GB<small>4-bit, per Meta</small></p></div></div></div><div><div class="media-wrap short"><img class="media contain" src="assets/qwen3-8-27b.png" alt="Qwen3.8-27B model card"><span class="source source-overlay">Qwen / Hugging Face</span></div><div class="stat-row"><div class="stat-block pink"><p class="stat">27B<small>dense VLM</small></p></div><div class="stat-block sunset"><p class="stat">262K<small>native context</small></p></div></div></div></div>`,
  },
  {
    file: 'slide-05.html', n: '05', kind: 'content', body: `
      <div class="split equal"><div class="media-wrap"><img class="media contain" src="assets/gemini-3-7-flash.png" alt="Official Gemini 3.7 Flash release graphic"><span class="source source-overlay">Google / Aug. 13</span></div><div><p class="kicker">Model routing</p><h1>Route for cost. Then speed.</h1><p class="dek">Price and latency are separate choices.</p><div class="stat-row"><div class="stat-block"><p class="stat">$0.75<small>Flash input / 1M</small></p></div><div class="stat-block purple"><p class="stat">750<small>Sol tok/s ceiling</small></p></div><div class="stat-block pink"><p class="stat">14x<small>vendor-reported</small></p></div></div><p class="note" style="margin-top:28px">Ultrafast: limited preview. No public price.</p></div></div>`,
  },
  {
    file: 'slide-06.html', n: '06', kind: 'content', body: `
      <p class="kicker">Mathematics</p><h1>A bound moved. The hypothesis did not.</h1><p class="dek">Lean checks the proof. People judge the contribution.</p><div class="split equal" style="height:540px;margin-top:20px"><div><p class="formula">zeta(1/2 + it) = 0</p><div class="callout"><strong>Process:</strong> 60 agents. 31M tokens. 54 papers.</div><p class="note" style="margin-top:18px">The Riemann hypothesis remains open.</p></div><div class="comparison"><div class="bar-row"><span class="bar-label">PRIOR</span><div class="bar-track"><div class="bar prior">41.6%</div></div><span class="bar-value">41.6%</span></div><div class="bar-row"><span class="bar-label">CLAUDE</span><div class="bar-track"><div class="bar claude">67.2%</div></div><span class="bar-value">67.2%</span></div><p class="source">Anthropic research post and linked paper / Aug. 10-13.</p></div></div>`,
  },
  {
    file: 'slide-07.html', n: '07', kind: 'content', body: `
      <div class="split equal"><div><p class="kicker">Earth science</p><h1>One more day</h1><p class="dek">Average cyclone forecast lead-time advantage.</p><div class="stat-row"><div class="stat-block"><p class="stat">2023-25<small>evaluation storms</small></p></div><div class="stat-block purple"><p class="stat">+24h<small>average advantage</small></p></div><div class="stat-block pink"><p class="stat">1,000<small>scenarios</small></p></div></div><div class="callout"><strong>Keep:</strong> official weather warnings in front.</div></div><div class="media-wrap"><img class="media contain" src="assets/weathernext-cyclones.png" alt="WeatherNext cyclone forecast graphic"><span class="source source-overlay">Google DeepMind / Nature</span></div></div>`,
  },
  {
    file: 'slide-08.html', n: '08', kind: 'content', body: `
      <p class="kicker">Markets and chips</p><h1>Hardware sets the floor</h1><p class="dek">AI demand is reaching fabs. Memory scarcity reaches everyone.</p><div class="hardware-story"><section class="hardware-fact fab"><p class="fact-label">TSMC Arizona / 1H26</p><p class="fact-number">NT$36.1B</p><h2>Profit</h2><p class="fact-secondary"><strong>+663%</strong> year over year</p><p class="source">TrendForce citing TSMC interim figures.</p></section><section class="hardware-fact memory"><p class="fact-label">German DDR5 / August</p><p class="fact-number">~4.9×</p><h2>Year-ago price index</h2><p class="fact-secondary">Server DRAM outlook: <strong>+13–18%</strong> quarter over quarter</p><p class="source">TrendForce / 3D Center retail index.</p></section></div><div class="hardware-takeaway"><span>LOCAL MODEL</span><strong>Same hardware bill</strong><span>CLOUD API</span></div>`,
  },
  {
    file: 'slide-09.html', n: '09', kind: 'closing', body: `
      <div class="closing-content"><div><img src="${brand}/source/logo-master-2048.png" alt="Longmont AI cubist parrot"><p class="kicker">This week</p><h1>Hand it off. Verify it.</h1><div class="closing-actions"><span>Test real work</span><span>Gate risky actions</span><span>Price the hardware</span></div></div></div>`,
  },
];

function html(slide) {
  const header = slide.kind === 'content' ? `<div class="brand-header"><img src="${brand}/logo/wordmark-horizontal-on-dark.png" alt="Longmont AI"><span>${slide.n} / 09</span></div>` : '';
  const footer = slide.kind === 'content' ? '<span>longmontai.com</span><span>COMMUNITY / LEARN / BUILD / SHARE</span>' : '<span>longmontai.com</span><span>Curated by Intelligence.</span>';
  return `<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"><title>Slide ${slide.n}</title><link rel="preconnect" href="https://fonts.googleapis.com"><link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Beleza&family=JetBrains+Mono:wght@400;500;700&display=swap"><link rel="stylesheet" href="slides.css"></head><body><div class="slide ${slide.kind}-slide">${header}${slide.body}<div class="footer">${footer}</div></div></body></html>`;
}

await mkdir(root, { recursive: true });
for (const slide of slides) await writeFile(join(root, slide.file), html(slide));
console.log(`Wrote ${slides.length} branded slide HTML files.`);
