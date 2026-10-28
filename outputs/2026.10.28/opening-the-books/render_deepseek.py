#!/usr/bin/env python3
"""Oct 28 DeepSeek-V4 explainer: four slides in the Grok briefing style, canonical brand palette.

Claims come only from DeepSeek-V4 (arXiv 2606.19348, section 5.1.1) and InstructGPT (arXiv 2203.02155).
"""
from pathlib import Path
import html
import subprocess
import tempfile

from render import ASSETS, CHROMIUM, WORDMARK, shoot

ROOT = Path(__file__).resolve().parent
HTML = ROOT / 'html'
OUT = ROOT / 'slides'
TOTAL = 4

CSS = """
*{box-sizing:border-box}html,body{margin:0;width:1920px;height:1080px;overflow:hidden}
body{background:radial-gradient(1100px 700px at 12% 30%,#1a0d2e 0%,transparent 60%),radial-gradient(900px 600px at 88% 35%,#0a2328 0%,transparent 60%),#09090b;color:#fff;font-family:Charter,Georgia,serif}
.mono{font-family:'JetBrains Mono',Menlo,monospace}
header{height:112px;padding:0 72px;background:#18181b;border-bottom:1px solid rgba(255,255,255,.08);display:flex;align-items:center;justify-content:space-between}
header img{height:56px;width:232px;object-fit:contain;object-position:left}
header span{font-size:22px;color:#71717A;letter-spacing:.32em}
main{padding:62px 72px 0;height:884px;position:relative}
.eyebrow{color:#00F0FF;font-size:28px;letter-spacing:.3em;margin:0 0 26px}
h1{font-size:86px;line-height:1.04;letter-spacing:-.02em;margin:0 0 24px;font-weight:700}
.g1{background:linear-gradient(90deg,#007CF0,#7928CA);-webkit-background-clip:text;color:transparent}
.g2{background:linear-gradient(90deg,#7928CA,#FF0080);-webkit-background-clip:text;color:transparent}
.lead{font-size:38px;line-height:1.38;color:#A1A1AA;max-width:1700px;margin:0 0 44px}
.cards{display:flex;gap:28px}
.card{flex:1;background:#18181b;border:1px solid rgba(255,255,255,.08);border-radius:22px;padding:40px 36px;min-height:300px;position:relative;overflow:hidden}
.card:before{content:'';position:absolute;left:0;right:0;top:0;height:4px}
.c-purple:before{background:#7928CA}.c-pink:before{background:#FF0080}.c-cyan:before{background:#00F0FF}.c-sunset:before{background:#FF9E64}
.k{font-size:24px;letter-spacing:.26em;margin-bottom:22px}
.c-purple .k{color:#a66cf0}.c-pink .k{color:#FF0080}.c-cyan .k{color:#00F0FF}.c-sunset .k{color:#FF9E64}
.v{font-size:56px;font-weight:700;line-height:1.08;margin-bottom:18px}
.d{font-size:31px;line-height:1.36;color:#A1A1AA}
.row{display:flex;align-items:center;gap:18px;margin:0 0 22px}
.row b{font-size:30px;color:#FF9E64;width:62px}.row span{font-size:36px;color:#d4d4d8}
.tags{font-size:26px;color:#FF9E64;letter-spacing:.3em;margin-top:30px}
.src{position:absolute;left:72px;bottom:36px;font-size:21px;color:#71717A;letter-spacing:.04em}
footer{position:absolute;left:0;right:0;bottom:0;height:84px;background:#18181b;border-top:1px solid rgba(255,255,255,.06);display:flex;align-items:center;justify-content:space-between;padding:0 72px;color:#A1A1AA;font-size:22px;letter-spacing:.42em}
"""


def card(tone, key, value, desc):
    return f'<section class="card c-{tone}"><div class="k mono">{html.escape(key)}</div><div class="v">{value}</div><div class="d">{html.escape(desc)}</div></section>'


SLIDES = [
    ('DEEPSEEK-V4 / THE BREAKTHROUGH',
     'The model <span class="g1">grades</span> <span class="g2">its own work</span>',
     'For hard-to-verify tasks, DeepSeek-V4 drops the separate reward model. The model being trained is also the judge.',
     '<div class="cards">'
     + card('cyan', 'STEP 1 · RUBRIC', 'A checklist', 'Curated, rubric-guided training data says what a good answer looks like.')
     + card('purple', 'STEP 2 · SELF-JUDGE', 'Actor = judge', 'The actor network itself writes an evaluation of each attempt.')
     + card('pink', 'STEP 3 · TRAIN BOTH', 'RL on the judge', 'Reinforcement learning sharpens the answers and the grading together.')
     + '</div>',
     'Source: DeepSeek-V4 technical report, arXiv 2606.19348, §5.1.1 · primary paper'),
    ('TRADITIONAL RLHF / THE OLD LOOP',
     'People <span class="g1">rank</span>, a scorer <span class="g2">learns</span>',
     'Reinforcement learning from human feedback, as introduced for InstructGPT in 2022.',
     '<div class="row"><b class="mono">01</b><span>Fine-tune on answers that people write.</span></div>'
     '<div class="row"><b class="mono">02</b><span>People rank several model answers to each prompt.</span></div>'
     '<div class="row"><b class="mono">03</b><span>A separate reward model learns to predict those rankings as one number.</span></div>'
     '<div class="row"><b class="mono">04</b><span>The model is optimized against that number, with a leash to keep it close.</span></div>'
     '<div class="tags mono">HUMAN LABELS / SCALAR SCORE / PPO</div>',
     'Source: Ouyang et al., "Training language models to follow instructions with human feedback," arXiv 2203.02155'),
    ('SIDE BY SIDE',
     'One number <span class="g1">vs.</span> <span class="g2">a written verdict</span>',
     'Where the feedback comes from, and what it looks like.',
     '<div class="cards">'
     + card('sunset', 'WHO JUDGES', 'Scorer → itself', 'RLHF trains a separate reward model. V4’s actor does the judging.')
     + card('purple', 'WHAT IT GIVES', '1 number → a critique', 'A scalar score vs. a rubric-guided evaluation the model reasons through.')
     + card('cyan', 'HUMAN INPUT', 'Many → minimal', 'Ranked comparisons vs. “a minimal set of diverse human annotations.”')
     + '</div>',
     'Sources: arXiv 2606.19348 §5.1.1 · arXiv 2203.02155'),
    ('WHY IT MATTERS',
     'Feedback that <span class="g1">scales</span> <span class="g2">with the model</span>',
     'If a model can grade writing, design, and tool use against a rubric, the human-labeling bottleneck shrinks.',
     '<div class="cards">'
     + card('cyan', 'CHEAPER', 'Fewer labels', 'Rubrics replace much of the ranking work done by people.')
     + card('pink', 'SMARTER', 'Reasoning judge', 'DeepSeek says its reasoning is “fused into its evaluative process.”')
     + card('sunset', 'THE RISK', 'Grading itself', 'A self-judge can learn blind spots or reward hacking. Watch the evals.')
     + '</div>',
     'Source: arXiv 2606.19348 §5.1.1 · risk noted by Fireworks AI analysis, Apr 24, 2026'),
]


def page(number, data):
    eyebrow, title, lead, body, source = data
    return f'''<!doctype html><html lang="en"><meta charset="utf-8"><title>DeepSeek slide {number}</title><style>{CSS}</style>
<header><img src="{WORDMARK}" alt="Longmont AI"><span class="mono">{number:02d} / {TOTAL:02d} · OCTOBER 28 BRIEFING</span></header>
<main><div class="eyebrow mono">✦ {html.escape(eyebrow)}</div><h1>{title}</h1><p class="lead">{html.escape(lead)}</p>{body}<div class="src mono">{html.escape(source)}</div></main>
<footer class="mono"><span>LONGMONTAI.COM</span><span>CURATED BY INTELLIGENCE.</span></footer></html>'''


def main():
    assert len(SLIDES) == TOTAL
    with tempfile.TemporaryDirectory(prefix='lai-oct28-deepseek-') as profile:
        for number, data in enumerate(SLIDES, 1):
            document = HTML / f'deepseek-{number:02d}.html'
            png = OUT / f'deepseek-v4-self-judge-{number:02d}.png'
            document.write_text(page(number, data))
            shoot(profile, document, png)
            (ASSETS / png.name).write_bytes(png.read_bytes())
            print(f'Rendered {png.name}')


if __name__ == '__main__':
    main()
