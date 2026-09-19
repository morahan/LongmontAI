#!/usr/bin/env python3
"""Deterministic Sep16 briefing: canonical brand, seven PNGs and an image PDF.

Uses Playwright's bundled headless Chromium + macOS sips and Python stdlib; no network.
Run from any cwd. Only Sep16 scratch and private draft assets are written.
"""
from pathlib import Path
import base64
import html
import subprocess
import tempfile

ROOT = Path(__file__).resolve().parent
REPO = ROOT.parents[2]
ASSETS = REPO / 'src/articles/drafts/assets/2026.09.16'
BROWSER_CACHE = Path.home() / 'Library/Caches/ms-playwright'
SHELLS = sorted(BROWSER_CACHE.glob('chromium_headless_shell-*/*/chrome-headless-shell'), key=lambda p: int(p.parent.parent.name.rsplit('-', 1)[1]))
if not SHELLS:
    raise SystemExit('Install Playwright bundled Chromium headless shell before rendering')
CHROMIUM = str(SHELLS[-1])
HTML = ROOT / 'html'
SLIDES = ROOT / 'slides'


def image(file):
    return 'data:image/png;base64,' + base64.b64encode(file.read_bytes()).decode()


WORDMARK = image(REPO / 'public/brand/logo/wordmark-horizontal-on-dark.png')
PARROT = image(REPO / 'public/brand/source/logo-master-2048.png')
CSS = """
*{box-sizing:border-box}html,body{margin:0;width:1920px;height:1080px;overflow:hidden}
body{background:#09090b;color:#fff;font-family:Beleza,Charter,Georgia,serif}
header{height:108px;padding:24px 80px;background:#18181b;display:flex;align-items:center;justify-content:space-between}
header img{width:320px;height:60px;object-fit:contain}header span,.eyebrow,footer,.label{font-family:'JetBrains Mono',monospace}
header span{font-size:20px;color:#A1A1AA}.eyebrow{color:#00F0FF;letter-spacing:.16em;font-size:24px;margin:0 0 32px}
main{padding:70px 88px;position:relative;height:880px}h1{font-size:92px;line-height:1.06;letter-spacing:-.025em;margin:0 0 40px;max-width:1560px}
p{font-size:38px;line-height:1.35;color:#A1A1AA;max-width:1510px;margin:0 0 44px}
.cards{display:flex;gap:32px;margin-top:70px}.card{flex:1;background:#18181b;padding:36px;min-height:190px;border-top:3px solid #7928CA}
.label{color:#FF9E64;font-size:23px;margin-bottom:28px}.value{font-size:48px;line-height:1.16}.small{font-size:30px;color:#A1A1AA;margin-top:18px}
.hero h1{max-width:920px;font-size:112px}.hero p{max-width:880px}.parrot{position:absolute;right:80px;top:110px;width:670px;height:670px;object-fit:contain}
footer{position:absolute;bottom:0;left:0;right:0;height:76px;display:flex;justify-content:space-between;align-items:center;padding:0 80px;color:#A1A1AA;background:#18181b;font-size:18px;letter-spacing:.03em}
"""

# Only claims freshly checked against the retrieved API card / Cursor post.
SLIDE_DATA = [
    ('SEPTEMBER 16 / SOURCE BRIEFING', 'Astra, then<br>Projects',
     'Two questions: what deserves the budget, and what work needs a coordinator?', [], True,
     'Sources: developers.openai.com · cursor.com/blog/projects'),
    ('ASTRA / THE BUDGET', 'Price the hard job first',
     'The API card lists a flagship price band, not a promise of better results on every task.',
     [('Input / 1M tokens', '$10', 'Standard rate'), ('Output / 1M tokens', '$50', 'Standard rate'), ('Context window', '1.05M', '128K max output')], False,
     'Source: developers.openai.com/api/docs/models/gpt-6-astra'),
    ('ASTRA / THE LIMITS', 'Watch the long-context cliff',
     'Above 272K input tokens, the higher rates apply to the full request.',
     [('Input + cache', '2×', 'Above 272K input'), ('Output', '1.5×', 'Above 272K input'), ('Fast mode', '2×', 'Applicable Standard rates')], False,
     'Source: developers.openai.com/api/docs/models/gpt-6-astra'),
    ('PROJECTS / BETA SEPTEMBER 10', 'Coordinate work beyond one chat',
     'Cursor describes a coordinator that directs subagents instead of writing code itself.',
     [('Execution', 'Cloud + local', 'Cloud by default'), ('Continuity', 'Shared context', 'Files across agents'), ('Subscriptions', 'Slack · PRs · CI', 'Or a schedule')], False,
     'Source: cursor.com/blog/projects · vendor description'),
    ('PROJECTS / YOUR FIRST TEST', 'One project. One approval boundary.',
     'Try a non-critical migration or documentation garden before handing over broader work.',
     [('Scope', 'One bounded job', 'Clear acceptance checks'), ('Control', 'Review each merge', 'Keep send/pay/publish gates'), ('Evidence', 'Your own result', 'PR claims are vendor-reported')], False,
     'Source: cursor.com/blog/projects · experiment is editorial advice'),
    ('SUPPORTING BOARD / PROVISIONAL', 'Check the price before the switch',
     'Comparison charts and other release claims remain in the article for source review.',
     [('Prices', 'List or promo?', 'Check effective dates'), ('Usage', 'Peak or cached?', 'Compare the same workload'), ('Claims', 'Who measured it?', 'Vendor ≠ independent')], False,
     'Supporting source checks pending · not a verified price recommendation'),
    ('LONGMONT AI / THIS WEEK', 'One hard job.<br>One bounded Project.',
     'Bring back the cost, the result, and the approval you kept.', [], True,
     'CURATED BY INTELLIGENCE. · Source briefing'),
]


def slide_html(number, data):
    topic, title, lead, cards, hero, source = data
    card_html = ''.join(f'<section class="card"><div class="label">{html.escape(k)}</div><div class="value">{html.escape(v)}</div><div class="small">{html.escape(note)}</div></section>' for k, v, note in cards)
    art = f'<img class="parrot" src="{PARROT}" alt="Longmont AI cubist parrot">' if hero else ''
    return f'''<!doctype html><html lang="en"><meta charset="utf-8"><title>Sep16 slide {number}</title><style>{CSS}</style>
<header><img src="{WORDMARK}" alt="Longmont AI"><span>{number:02d} / 07 · SOURCE BRIEFING</span></header>
<main class="{'hero' if hero else ''}"><div class="eyebrow">{html.escape(topic)}</div><h1>{title}</h1><p>{html.escape(lead)}</p><div class="cards">{card_html}</div>{art}</main>
<footer><span>LONGMONTAI.COM</span><span>{html.escape(source)}</span></footer></html>'''


def pdf_from_jpegs(files):
    """Stable PDF 1.4 image deck: fixed object order, no timestamps or random IDs."""
    objects = [b'<< /Type /Catalog /Pages 2 0 R >>', b'']
    pages = []
    for jpeg in files:
        page_id = len(objects) + 1
        pages.append(page_id)
        content = b'q 960 0 0 540 0 0 cm /Slide Do Q\n'
        objects.extend([
            f'<< /Type /Page /Parent 2 0 R /MediaBox [0 0 960 540] /Resources << /XObject << /Slide {page_id+2} 0 R >> >> /Contents {page_id+1} 0 R >>'.encode(),
            f'<< /Length {len(content)} >>\nstream\n'.encode() + content + b'endstream',
            f'<< /Type /XObject /Subtype /Image /Width 1920 /Height 1080 /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length {len(jpeg)} >>\nstream\n'.encode() + jpeg + b'\nendstream',
        ])
    objects[1] = f'<< /Type /Pages /Count {len(pages)} /Kids [ {" ".join(f"{n} 0 R" for n in pages)} ] >>'.encode()
    result = bytearray(b'%PDF-1.4\n%\xe2\xe3\xcf\xd3\n')
    offsets = [0]
    for number, obj in enumerate(objects, 1):
        offsets.append(len(result))
        result.extend(f'{number} 0 obj\n'.encode() + obj + b'\nendobj\n')
    xref = len(result)
    result.extend(f'xref\n0 {len(offsets)}\n0000000000 65535 f \n'.encode())
    for offset in offsets[1:]:
        result.extend(f'{offset:010d} 00000 n \n'.encode())
    result.extend(f'trailer\n<< /Size {len(offsets)} /Root 1 0 R >>\nstartxref\n{xref}\n%%EOF\n'.encode())
    return bytes(result)


def main():
    for directory in [HTML, SLIDES, ASSETS]:
        directory.mkdir(parents=True, exist_ok=True)
    jpegs = []
    # Isolated bundled headless shell; never attach to an installed/personal browser.
    print(f'Bundled browser: {CHROMIUM}', flush=True)
    with tempfile.TemporaryDirectory(prefix='lai-sep16-chromium-') as profile:
        for number, data in enumerate(SLIDE_DATA, 1):
            document = HTML / f'slide-{number:02d}.html'
            png = SLIDES / f'slide-{number:02d}.png'
            document.write_text(slide_html(number, data))
            subprocess.run([CHROMIUM, '--headless', '--disable-gpu', '--hide-scrollbars', '--no-first-run', f'--user-data-dir={profile}', '--force-device-scale-factor=1', '--window-size=1920,1080', '--virtual-time-budget=2000', f'--screenshot={png}', document.as_uri()], check=True, timeout=30, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
            (ASSETS / png.name).write_bytes(png.read_bytes())
            jpeg = SLIDES / f'slide-{number:02d}.jpg'
            subprocess.run(['sips', '-s', 'format', 'jpeg', '-s', 'formatOptions', '95', str(png), '--out', str(jpeg)], check=True, stdout=subprocess.DEVNULL)
            jpegs.append(jpeg.read_bytes())
            print(f'Rendered {png.name}')
    deck = pdf_from_jpegs(jpegs)
    (ASSETS / 'astra-then-projects-briefing.pdf').write_bytes(deck)
    (ROOT / 'astra-then-projects-briefing.pdf').write_bytes(deck)
    print('Wrote deterministic seven-page PDF deck')


if __name__ == '__main__':
    main()
