#!/usr/bin/env python3
"""Deterministic Oct 28 briefing: canonical brand, eight slides, an image PDF and one article chart.

Uses Playwright's bundled headless Chromium + macOS sips and Python stdlib; no network.
Only Oct 28 scratch and private draft assets are written.
"""
from pathlib import Path
import base64
import html
import subprocess
import sys
import tempfile

ROOT = Path(__file__).resolve().parent
sys.path.insert(0, str(ROOT))
from _pdf import pdf_from_jpegs  # noqa: E402  (shared with the Sep 16 renderer)

REPO = ROOT.parents[2]
ASSETS = REPO / 'src/articles/drafts/assets/2026.10.28'
BROWSER_CACHE = Path.home() / 'Library/Caches/ms-playwright'
SHELLS = sorted(BROWSER_CACHE.glob('chromium_headless_shell-*/*/chrome-headless-shell'), key=lambda p: int(p.parent.parent.name.rsplit('-', 1)[1]))
if not SHELLS:
    raise SystemExit('Install Playwright bundled Chromium headless shell before rendering')
CHROMIUM = str(SHELLS[-1])
HTML = ROOT / 'html'
SLIDES = ROOT / 'slides'
TOTAL = 8


def image(file):
    return 'data:image/png;base64,' + base64.b64encode(file.read_bytes()).decode()


WORDMARK = image(REPO / 'public/brand/logo/wordmark-horizontal-on-dark.png')
PARROT = image(REPO / 'public/brand/source/logo-master-2048.png')
CSS = """
*{box-sizing:border-box}html,body{margin:0;width:1920px;height:1080px;overflow:hidden}
body{background:#09090b;color:#fff;font-family:Beleza,Charter,Georgia,serif}
header{height:108px;padding:24px 80px;background:#18181b;display:flex;align-items:center;justify-content:space-between}
header img{width:320px;height:60px;object-fit:contain}header span,.eyebrow,footer,.label,.bar b,.bar i{font-family:'JetBrains Mono',Menlo,monospace}
header span{font-size:20px;color:#A1A1AA}.eyebrow{color:#00F0FF;letter-spacing:.16em;font-size:24px;margin:0 0 28px}
main{padding:64px 88px;position:relative;height:896px}h1{font-size:84px;line-height:1.06;letter-spacing:-.025em;margin:0 0 30px;max-width:1600px}
p{font-size:36px;line-height:1.35;color:#A1A1AA;max-width:1560px;margin:0 0 30px}
.cards{display:flex;gap:32px;margin-top:56px}.card{flex:1;background:#18181b;padding:36px;min-height:200px;border-top:3px solid #7928CA}
.label{color:#FF9E64;font-size:23px;margin-bottom:24px}.value{font-size:58px;line-height:1.1}.small{font-size:28px;color:#A1A1AA;margin-top:16px}
.hero h1{max-width:960px;font-size:118px}.hero p{max-width:900px}.parrot{position:absolute;right:80px;top:100px;width:680px;height:680px;object-fit:contain}
.chart{display:flex;align-items:flex-end;gap:36px;height:500px;margin-top:20px;padding:0 10px;border-bottom:2px solid #27272a}
.bar{flex:1;display:flex;flex-direction:column;align-items:center;justify-content:flex-end;height:100%}
.bar div{width:100%;background:linear-gradient(180deg,#00F0FF,#7928CA)}.bar.hot div{background:linear-gradient(180deg,#FF9E64,#FF0080)}
.bar b{font-size:30px;margin-bottom:12px;font-weight:400}.bar i{font-style:normal;font-size:22px;color:#A1A1AA;margin-top:16px;position:absolute;bottom:-46px}
.bar{position:relative}
footer{position:absolute;bottom:0;left:0;right:0;height:76px;display:flex;justify-content:space-between;align-items:center;padding:0 80px;color:#A1A1AA;background:#18181b;font-size:18px;letter-spacing:.03em}
"""

# Anthropic S-1 quarterly revenue, $ millions (three months ended).
QUARTERS = [('Q1 25', 376), ('Q2 25', 787), ('Q3 25', 1382), ('Q4 25', 2040), ('Q1 26', 4731), ('Q2 26', 11555)]
# Compute and infrastructure expense as a percent of revenue, same quarters.
COMPUTE_SHARE = [('Q1 25', 251), ('Q2 25', 177), ('Q3 25', 148), ('Q4 25', 144), ('Q1 26', 72), ('Q2 26', 48)]


def bars(rows, fmt, peak):
    top = max(v for _, v in rows)
    out = []
    for i, (label, value) in enumerate(rows):
        hot = ' hot' if i == peak else ''
        out.append(f'<section class="bar{hot}"><b>{html.escape(fmt(value))}</b><div style="height:{value / top * 88:.1f}%"></div><i>{label}</i></section>')
    return f'<div class="chart">{"".join(out)}</div>'


REVENUE_CHART = bars(QUARTERS, lambda v: f'${v / 1000:.1f}B' if v >= 1000 else f'${v}M', 5)
COMPUTE_CHART = bars(COMPUTE_SHARE, lambda v: f'{v}%', 5)

# (eyebrow, title, lead, cards, hero, source, extra_html). Only ledger-verified claims.
SLIDE_DATA = [
    ('OCTOBER 28 / FOURTEEN DAYS OF AI', 'Opening<br>the Books',
     'An AI lab files to go public, chips report their gigawatts, and mathematicians check a machine’s proof.', [], True,
     'Covers October 14–27, 2026', ''),
    ('ANTHROPIC S-1 / REVENUE BY QUARTER', '$376M to $11.6B in five quarters',
     'Quarterly revenue from the IPO filing. Q2 2026 grew 1,368% year over year.', [], False,
     'Source: Anthropic Form S-1, filed Oct 26, 2026 (SEC file 333-299633)', REVENUE_CHART),
    ('ANTHROPIC S-1 / COMPUTE COST PER DOLLAR', 'Compute fell from 251% to 48% of revenue',
     'Compute and infrastructure expense as a share of each quarter’s revenue. Q2 2026: first operating profit, $974M.', [], False,
     'Source: Anthropic Form S-1 · quarterly results of operations', COMPUTE_CHART),
    ('ANTHROPIC S-1 / THE CUSTOMERS', 'Big customers, bigger every month',
     'As of September 30, 2026, trailing twelve months.',
     [('$100K+ customers', '11,900+', 'Up from 950+ a year earlier'), ('Net revenue retention', '~900%', 'Existing customers’ spend'), ('Revenue per employee', '$6.6M+', 'Up from $1.4M')], False,
     'Source: Anthropic Form S-1 · listing planned on Nasdaq as ANT', ''),
    ('OPENAI / OCTOBER 26', 'GPT-6.1 Terra: half the price, triple the speed',
     'The mid tier of OpenAI’s lineup, aimed at computer use and agents.',
     [('API price / 1M tokens', '$1 / $5', 'Input / output'), ('Terminal-Bench 4.0', '50.3%', 'vs 21.5% for 5.6 Terra'), ('Speed vs Sol', '3×+', 'Faster, per OpenAI')], False,
     'Vendor-reported benchmarks · openai.com · press coverage', ''),
    ('GOOGLE DEEPMIND / OCTOBER 27', 'Genie 4 builds worlds you can hear and steer',
     'Real-time simulated worlds with sound and dialogue, steered by keyboard and text prompts.',
     [('New', 'Audio', 'Ambient sound, music, dialogue'), ('Control', 'Live text', 'Weather, camera, objects'), ('Access', 'Testers', 'Research preview; waitlist')], False,
     'Source: deepmind.google/blog · vendor claims, no benchmarks published', ''),
    ('APPLE / OCTOBER 13–27', 'Apple puts the model on the desk',
     'A run of press releases, no keynote. Siri AI arrives in beta, outside the EU.',
     [('iMac with M6', '5×', 'On-device AI vs the M4 iMac'), ('iPad mini · A20 Pro', '4.5×', 'AI vs the previous iPad mini'), ('Apple TV 4K · A19', '2×', 'GPU vs the previous Apple TV 4K')], False,
     'Source: apple.com/newsroom · Apple performance claims', ''),
    ('FOLLOW THE COMPUTE', 'The money is in the gigawatts',
     'Nvidia’s Aug 26 call and SpaceX’s Oct 20 call put prices on AI capacity.',
     [('Nvidia revenue per GW', '$40B', 'Rubin, vs ~$18B for Hopper'), ('SpaceX AI segment', '+830%', '$7.56B in Q3, 52% of revenue'), ('SpaceX Q3 capex to AI', '$16.4B', 'Of $19.6B total')], False,
     'Nvidia earnings call remarks · SpaceX Q3 2026 results, as reported', ''),
]


def slide_html(number, data):
    topic, title, lead, cards, hero, source, extra = data
    card_html = ''.join(f'<section class="card"><div class="label">{html.escape(k)}</div><div class="value">{html.escape(v)}</div><div class="small">{html.escape(note)}</div></section>' for k, v, note in cards)
    cards_block = f'<div class="cards">{card_html}</div>' if cards else ''
    art = f'<img class="parrot" src="{PARROT}" alt="Longmont AI cubist parrot">' if hero else ''
    return f'''<!doctype html><html lang="en"><meta charset="utf-8"><title>Oct28 slide {number}</title><style>{CSS}</style>
<header><img src="{WORDMARK}" alt="Longmont AI"><span>{number:02d} / {TOTAL:02d} · OCTOBER 28 BRIEFING</span></header>
<main class="{'hero' if hero else ''}"><div class="eyebrow">{html.escape(topic)}</div><h1>{title}</h1><p>{html.escape(lead)}</p>{cards_block}{extra}{art}</main>
<footer><span>LONGMONTAI.COM</span><span>{html.escape(source)}</span></footer></html>'''


def shoot(profile, document, png):
    subprocess.run([CHROMIUM, '--headless', '--disable-gpu', '--hide-scrollbars', '--no-first-run', f'--user-data-dir={profile}', '--force-device-scale-factor=1', '--window-size=1920,1080', '--virtual-time-budget=2000', f'--screenshot={png}', document.as_uri()], check=True, timeout=30, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)


def main():
    assert len(SLIDE_DATA) == TOTAL
    for directory in [HTML, SLIDES, ASSETS]:
        directory.mkdir(parents=True, exist_ok=True)
    jpegs = []
    print(f'Bundled browser: {CHROMIUM}', flush=True)
    with tempfile.TemporaryDirectory(prefix='lai-oct28-chromium-') as profile:
        for number, data in enumerate(SLIDE_DATA, 1):
            document = HTML / f'slide-{number:02d}.html'
            png = SLIDES / f'slide-{number:02d}.png'
            document.write_text(slide_html(number, data))
            shoot(profile, document, png)
            (ASSETS / png.name).write_bytes(png.read_bytes())
            jpeg = SLIDES / f'slide-{number:02d}.jpg'
            subprocess.run(['sips', '-s', 'format', 'jpeg', '-s', 'formatOptions', '95', str(png), '--out', str(jpeg)], check=True, stdout=subprocess.DEVNULL)
            jpegs.append(jpeg.read_bytes())
            print(f'Rendered {png.name}')
    deck = pdf_from_jpegs(jpegs)
    (ASSETS / 'opening-the-books-briefing.pdf').write_bytes(deck)
    # The revenue slide doubles as the article's inline chart.
    (ASSETS / 'anthropic-quarterly-revenue-s1.png').write_bytes((SLIDES / 'slide-02.png').read_bytes())
    (ASSETS / 'anthropic-compute-share-of-revenue-s1.png').write_bytes((SLIDES / 'slide-03.png').read_bytes())
    print(f'Wrote deterministic {TOTAL}-page PDF deck and article charts')


if __name__ == '__main__':
    main()
