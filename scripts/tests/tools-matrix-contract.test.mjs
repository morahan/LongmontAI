import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import {
  BROWSER_CAPTURE_TOOLS,
  CODE_PRESENTATION_TOOLS,
} from '../../src/data/browserCaptureTools.js';

const root = new URL('../../', import.meta.url);
const source = await readFile(new URL('src/pages/Tools.tsx', root), 'utf8');

const requiredBrowserOptions = [
  'Playwright',
  'ScreenshotOne',
  'Urlbox',
  'Cursor Agent Browser',
  'Claude Code + Playwright MCP',
  'OpenAI Codex + Playwright MCP',
  'Gemini CLI + Playwright MCP',
  'Roo Code Browser',
  'Browser Use',
  'Playwright MCP',
];

assert.deepEqual(BROWSER_CAPTURE_TOOLS.map(tool => tool.name), requiredBrowserOptions);
assert.deepEqual(CODE_PRESENTATION_TOOLS.map(tool => tool.name), ['Carbon', 'Ray.so']);
assert.equal(BROWSER_CAPTURE_TOOLS.length, 10, 'Website → Image must expose 10 capture options');
assert.equal(BROWSER_CAPTURE_TOOLS.length + CODE_PRESENTATION_TOOLS.length, 12, 'Code → Image must expose 12 image options');

const allImageTools = [...BROWSER_CAPTURE_TOOLS, ...CODE_PRESENTATION_TOOLS];
assert.equal(new Set(allImageTools.map(tool => tool.url)).size, allImageTools.length);
assert.deepEqual(
  Object.fromEntries([...new Set(allImageTools.map(tool => tool.category))].map(category => [
    category,
    allImageTools.filter(tool => tool.category === category).length,
  ])),
  {
    'Rendered web capture': 3,
    'Composable browser agents': 6,
    'Browser harnesses': 1,
    'Source-code images': 2,
  },
);

for (const tool of allImageTools) {
  assert.match(tool.url, /^https:\/\//, `${tool.name} must have an HTTPS URL`);
}

const codeRow = source.slice(source.indexOf('  Code: {'), source.indexOf("  'Mobile Apps': {"));
const websitesRow = source.slice(source.indexOf('  Websites: {'), source.indexOf("  'Interactive Interface': {"));

assert.match(codeRow, /'Image': \[\.\.\.CODE_PRESENTATION_TOOLS, \.\.\.BROWSER_CAPTURE_TOOLS\]/);
assert.match(websitesRow, /'Image': \[\.\.\.BROWSER_CAPTURE_TOOLS\]/);
assert.match(source, /category: isMergedAudioCell[\s\S]*?: tool\.category,/);
assert.doesNotMatch(source, /Screenshot → Grok Imagine \/ Midjourney/);
assert.doesNotMatch(source, /Midjourney \(prompt from code\)/);

console.log('tools matrix contract: PASS');
