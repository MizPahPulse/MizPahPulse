#!/usr/bin/env python3
"""Build the MizpahPulse 5-minute pitch video.

Pipeline:
  1. edge-tts narration per script section (en-US-ChristopherNeural, -6%).
  2. HTML slides rendered to 1920x1080 PNGs via Playwright (node helper).
  3. Per-scene Ken Burns clips from stills/slides (ffmpeg zoompan).
  4. Crossfade chain + narration track, then mux -> screenshots/demo-video.mp4.

Usage: python3 scripts/build-pitch-video.py
Env:   SKIP_AUDIO=1  reuse existing narration; SKIP_SLIDES=1 reuse rendered slides.
"""

import json
import math
import os
import re
import shutil
import subprocess
import sys
import textwrap

sys.path.insert(0, os.path.dirname(__file__))

FFMPEG = None
import imageio_ffmpeg  # noqa: E402

FFMPEG = imageio_ffmpeg.get_ffmpeg_exe()

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
TMP = "/tmp/pitch"
NARR = os.path.join(TMP, "narration")
SLIDES_HTML = os.path.join(TMP, "slides")
SLIDES_PNG = os.path.join(TMP, "slide-png")
STILLS = os.path.join(TMP, "stills")
SCENES = os.path.join(TMP, "scenes")
OUT = os.path.join(TMP, "pitch-video.mp4")
FINAL = os.path.join(ROOT, "screenshots", "demo-video.mp4")

W, H, FPS = 1920, 1080, 30
VOICE = "en-US-ChristopherNeural"
RATE = "-6%"
TARGET = 300.0  # ~5:00

FONT = "/usr/share/fonts/opentype/inter/Inter-Regular.otf"
FONT_BOLD = "/usr/share/fonts/opentype/inter/Inter-Bold.otf"
FONT_SEMI = "/usr/share/fonts/opentype/inter/Inter-SemiBold.otf"

SECTIONS = [
    ("s1", """The Stellar network never sleeps. Every second, somewhere on the network, a payment settles, a smart contract runs, a trade executes on the orderbook. Millions of events every day — unseen, unstored, and gone. If you build on Stellar, or invest in it, you're flying blind: stitching together Horizon streams and RPC calls, maintaining your own dashboards, and missing the signals that actually matter. What if the entire network had a pulse you could watch in real time?"""),
    ("s2", """This is MizpahPulse — the heartbeat of on-chain activity on Stellar. A real-time blockchain intelligence platform purpose-built for the Stellar ecosystem. An ingestion engine listens to the network around the clock, and normalizes more than thirty-five event types across six categories: payments, smart contracts, DEX trades, NFTs, tokens, and account activity. That stream flows through Redis into PostgreSQL, out through a WebSocket server, and onto a live dashboard. The Stellar network, made visible."""),
    ("s3", """And it's live right now. This is the production deployment on Vercel, connected to Stellar Testnet. The dashboard gives you the network's pulse at a glance — live transaction counts, top accounts, and recent activity as it happens. The feed streams events in real time: every payment, every contract invocation, filterable by category, event type, or account. The analytics suite turns history into insight — trends across twenty-four hours, seven days, or thirty; category breakdowns; and the contracts driving the most activity. And the wallets hub connects Freighter in one click: live balance, send XLM, all signed in the browser. No server-side keys, no custody."""),
    ("s4", """Under the hood, this is a serious engineering story. A Turborepo monorepo: a Next.js fifteen web application, a dedicated WebSocket server, and an ingestion worker — with shared packages for the database, the Stellar SDK layer, types, and a reusable UI library. And the smart contract is production-grade. PulseContract demonstrates payment rails for any SEP-41 asset, batch payroll tips, allowance-based pull payments, cross-contract communication, multi-sig emergency controls, pause and kill switches — all audited, gas-benchmarked, and shipped under sixty-four kilobytes of WASM, with a machine-readable taxonomy of three hundred and sixty-five error codes."""),
    ("s5", """So what makes this different? It runs on Stellar's native rails — no bridges, no wrapped assets, no middlemen. It's real-time by design, from ingestion to streaming to the UI. It ships for developers: a REST API with twenty-five plus endpoints, HMAC-signed webhooks with replay, API keys, and a developer portal. And it's engineered to be trusted: five hundred and twenty-six tests passing, coverage enforced in CI, dependency audits, CodeQL, secret scanning, and a protected main branch — every pull request runs the full gauntlet before it lands."""),
    ("s6", """MizpahPulse turns the Stellar network into something you can watch, query, and build on. Try it yourself at mizpah dash pulse dot vercel dot app. Fork the repo, explore the documentation, and spin up the full stack with a single Docker Compose command. The network is alive. Now you can watch it beat. MizpahPulse — the heartbeat of on-chain activity on Stellar."""),
]


def run(cmd, **kw):
    r = subprocess.run(cmd, capture_output=True, text=True, **kw)
    if r.returncode != 0:
        raise RuntimeError(f"cmd failed: {' '.join(cmd[:4])}...\n{r.stderr[-1200:]}")
    return r


def media_duration(path):
    r = run([FFMPEG, "-i", path, "-f", "null", "-"])
    m = re.search(r"Duration:\s*(\d+):(\d+):(\d+\.\d+)", r.stderr)
    if not m:
        raise RuntimeError("cannot read duration of " + path)
    return int(m.group(1)) * 3600 + int(m.group(2)) * 60 + float(m.group(3))


# ── 1. Narration ────────────────────────────────────────────────────────
def gen_narration():
    os.makedirs(NARR, exist_ok=True)
    for name, text in SECTIONS:
        out = os.path.join(NARR, f"{name}.mp3")
        if os.path.exists(out) and os.path.getsize(out) > 0:
            continue
        for attempt in range(3):
            try:
                run(["edge-tts", "--voice", VOICE, "--rate", RATE, "--text", text,
                     "--write-media", out], timeout=120)
                break
            except RuntimeError:
                if attempt == 2:
                    raise
    return {name: media_duration(os.path.join(NARR, f"{name}.mp3")) for name, _ in SECTIONS}


# ── 2. Slides ───────────────────────────────────────────────────────────
CSS = """
* { margin:0; padding:0; box-sizing:border-box; }
html,body { width:1920px; height:1080px; overflow:hidden; }
body {
  font-family:'Inter',sans-serif; color:#E8EAF2;
  background:radial-gradient(1200px 700px at 70% -10%, #1a1533 0%, #0c0f1c 55%, #070a14 100%);
  position:relative; display:flex; flex-direction:column;
}
.kicker { font-size:28px; letter-spacing:.35em; text-transform:uppercase; color:#8B7CF6; font-weight:600; }
h1 { font-size:88px; font-weight:800; line-height:1.08; letter-spacing:-.02em; }
h2 { font-size:60px; font-weight:700; line-height:1.15; letter-spacing:-.01em; }
.sub { font-size:34px; color:#9aa3b8; line-height:1.45; }
.accent { color:#22c55e; }
.accent2 { color:#0ea5e9; }
.purple { color:#8B7CF6; }
.card { background:rgba(255,255,255,.04); border:1px solid rgba(255,255,255,.08);
  border-radius:20px; padding:34px 36px; }
.pill { display:inline-flex; align-items:center; gap:12px; padding:14px 28px; border-radius:999px;
  background:rgba(139,124,246,.12); border:1px solid rgba(139,124,246,.35); font-size:30px; font-weight:600; }
.big { font-size:120px; font-weight:800; letter-spacing:-.03em; }
.row { display:flex; gap:28px; align-items:center; }
.grow { flex:1; }
"""


def slide_html(name, body):
    html = f"""<!DOCTYPE html><html><head><meta charset="utf-8"><style>{CSS}</style></head><body>{body}</body></html>"""
    os.makedirs(SLIDES_HTML, exist_ok=True)
    with open(os.path.join(SLIDES_HTML, name + ".html"), "w") as f:
        f.write(html)


def build_slides_html():
    logo = """<div class="row" style="justify-content:center;gap:24px">
      <svg width="120" height="120" viewBox="0 0 120 120"><rect x="6" y="6" width="108" height="108" rx="26" fill="none" stroke="#8B7CF6" stroke-width="7"/><polyline points="26,66 44,66 54,40 70,84 82,56 96,56" fill="none" stroke="#22c55e" stroke-width="8" stroke-linecap="round" stroke-linejoin="round"/></svg>
      <span style="font-size:92px;font-weight:800;letter-spacing:-.02em">MizpahPulse</span></div>"""

    slide_html("title", f"""
      <div class="grow" style="display:flex;flex-direction:column;align-items:center;justify-content:center;gap:42px;text-align:center">
        {logo}
        <div class="kicker">The heartbeat of on-chain activity on Stellar</div>
        <div style="font-size:36px;color:#9aa3b8;max-width:1200px">Real-time blockchain intelligence · Soroban smart contracts · Built for the Stellar ecosystem</div>
        <div style="display:flex;gap:20px;margin-top:20px">
          <span class="pill" style="background:rgba(34,197,94,.1);border-color:rgba(34,197,94,.35);color:#22c55e">LIVE ON VERCEL</span>
          <span class="pill" style="background:rgba(139,124,246,.1);border-color:rgba(139,124,246,.35)">STELLAR TESTNET</span>
        </div>
      </div>""")

    slide_html("problem", f"""
      <div class="grow" style="display:flex;flex-direction:column;justify-content:center;padding:120px 140px;gap:44px">
        <div class="kicker">The problem</div>
        <h1>The network never sleeps.<br><span class="accent">Nobody is watching.</span></h1>
        <div class="sub">Every second, Stellar settles payments, runs smart contracts, and moves liquidity on the orderbook. Millions of events — ingested nowhere, visible to no one.</div>
        <div class="row" style="flex-wrap:wrap;margin-top:24px">
          <span class="card pill" style="font-size:34px">💸 Payments</span>
          <span class="card pill" style="font-size:34px">🤖 Smart contracts</span>
          <span class="card pill" style="font-size:34px">📊 DEX trades</span>
          <span class="card pill" style="font-size:34px">🎨 NFTs</span>
          <span class="card pill" style="font-size:34px">🪙 Tokens</span>
          <span class="card pill" style="font-size:34px">👤 Accounts</span>
        </div>
      </div>""")

    slide_html("arch", f"""
      <div class="grow" style="display:flex;flex-direction:column;justify-content:center;padding:110px 140px;gap:52px">
        <div class="kicker">How it works</div>
        <h2>From raw ledger to <span class="accent2">real-time dashboard</span></h2>
        <div style="display:flex;flex-direction:column;align-items:center;gap:18px;margin-top:30px">
          <div class="card" style="font-size:34px;font-weight:700;padding:26px 60px;border-color:rgba(139,124,246,.4)">Stellar Network · Horizon SSE + Soroban RPC</div>
          <div style="font-size:40px;color:#8B7CF6">▼</div>
          <div class="card" style="font-size:34px;font-weight:600">Ingester worker</div>
          <div style="font-size:40px;color:#22c55e">▼ Redis queue</div>
          <div class="row" style="justify-content:center">
            <div class="card" style="font-size:30px">PostgreSQL</div>
            <div style="font-size:40px;color:#22c55e">▼</div>
            <div class="card" style="font-size:30px">WebSocket server</div>
            <div style="font-size:40px;color:#22c55e">▼</div>
            <div class="card" style="font-size:30px;border-color:rgba(34,197,94,.4)">Live dashboard</div>
          </div>
        </div>
        <div class="sub" style="text-align:center">35+ event types · 6 categories · end-to-end realtime</div>
      </div>""")

    cats = [
        ("💸", "Payments", "XLM transfers, path payments, remittances"),
        ("🤖", "Smart Contracts", "Soroban invokes, deploys, TTL"),
        ("📊", "DEX Activity", "Trades, order books, liquidity pools"),
        ("🎨", "NFTs", "Mint, transfer, burn, metadata"),
        ("🪙", "Tokens", "Trustlines, issuance, clawbacks"),
        ("👤", "Accounts", "Create, merge, signers, sponsorship"),
    ]
    cards = "".join(
        f'<div class="card" style="width:31%;font-size:28px;line-height:1.4"><div style="font-size:52px;margin-bottom:14px">{e}</div><div style="font-weight:700;font-size:32px;margin-bottom:8px">{t}</div><div style="color:#9aa3b8">{d}</div></div>'
        for e, t, d in cats)
    slide_html("categories", f"""
      <div class="grow" style="display:flex;flex-direction:column;justify-content:center;padding:110px 140px;gap:40px">
        <div class="kicker">The pulse, categorized</div>
        <h2>35+ event types · 6 categories · <span class="accent">one live feed</span></h2>
        <div class="row" style="flex-wrap:wrap;margin-top:20px">{cards}</div>
      </div>""")

    tree = """<pre style="font-family:'Inter',monospace;font-size:30px;line-height:1.7;color:#c6cbe0;background:rgba(255,255,255,.03);border:1px solid rgba(255,255,255,.08);border-radius:20px;padding:44px 56px"><span style="color:#8B7CF6">mizpah-pulse/</span>
├─ <b>apps/</b>
│  ├─ web/        <span style="color:#9aa3b8">Next.js 15 · dashboard + REST API</span>
│  ├─ ws/         <span style="color:#9aa3b8">Socket.io · realtime events</span>
│  └─ ingester/   <span style="color:#9aa3b8">Stellar ingestion worker</span>
├─ <b>packages/</b>
│  ├─ database/   <span style="color:#9aa3b8">Prisma + PostgreSQL schema</span>
│  ├─ stellar/    <span style="color:#9aa3b8">Stellar SDK layer</span>
│  ├─ types/      <span style="color:#9aa3b8">Shared types + Zod</span>
│  └─ ui/         <span style="color:#9aa3b8">Component library</span>
└─ <b>contracts/</b>
   └─ pulse/      <span style="color:#9aa3b8">Soroban smart contract (Rust)</span></pre>"""
    slide_html("monorepo", f"""
      <div class="grow" style="display:flex;flex-direction:column;justify-content:center;padding:110px 150px;gap:44px">
        <div class="kicker">Engineering</div>
        <h2>A <span class="purple">Turborepo monorepo</span>, built for scale</h2>
        {tree}
      </div>""")

    code = """<pre style="font-family:'JetBrains Mono','Inter',monospace;font-size:29px;line-height:1.75;color:#d8dce8;background:rgba(7,10,20,.85);border:1px solid rgba(139,124,246,.3);border-radius:20px;padding:48px 60px"><span style="color:#8B7CF6">import</span> {{ useContractInvoke }} <span style="color:#8B7CF6">from</span> <span style="color:#22c55e">'@/hooks/useContractInvoke'</span>;

<span style="color:#5f6782">// Read-only — simulated, no transaction</span>
<span style="color:#8B7CF6">const</span> {{ readOnly }} = useContractInvoke(contractId);
<span style="color:#8B7CF6">const</span> count = <span style="color:#8B7CF6">await</span> readOnly(<span style="color:#22c55e">'get_pulse_count'</span>);

<span style="color:#5f6782">// State-changing — Freighter sign → submit</span>
<span style="color:#8B7CF6">const</span> {{ invoke }} = useContractInvoke(contractId);
<span style="color:#8B7CF6">const</span> result = <span style="color:#8B7CF6">await</span> invoke(<span style="color:#22c55e">'pulse'</span>, [<span style="color:#22c55e">'alice'</span>]);
<span style="color:#5f6782">// → {{ hash, explorerUrl, returnValue }}</span>

<span style="color:#5f6782">// Cross-contract communication</span>
<span style="color:#8B7CF6">await</span> invoke(<span style="color:#22c55e">'broadcast_pulse'</span>, [targetContractId, <span style="color:#22c55e">'alice'</span>]);</pre>"""
    slide_html("code", f"""
      <div class="grow" style="display:flex;flex-direction:column;justify-content:center;padding:110px 150px;gap:44px">
        <div class="kicker">Developer experience</div>
        <h2>Interact with Soroban <span class="accent2">from the frontend</span></h2>
        {code}
      </div>""")

    feats = [
        ("💸", "Payment rails", "Any SEP-41 asset + native XLM"),
        ("📦", "Batch payroll tips", "N recipients, one pulse"),
        ("🔁", "Allowance tips", "transfer_from pull payments"),
        ("🤝", "Cross-contract calls", "broadcast_pulse protocol"),
        ("🛡", "Multi-sig + pause/kill", "Emergency controls"),
        ("⚙️", "365 error codes", "Machine-readable taxonomy"),
    ]
    fcards = "".join(
        f'<div class="card" style="width:31%;font-size:26px"><div style="font-size:46px;margin-bottom:12px">{e}</div><div style="font-weight:700;font-size:30px;margin-bottom:6px">{t}</div><div style="color:#9aa3b8">{d}</div></div>'
        for e, t, d in feats)
    slide_html("contract", f"""
      <div class="grow" style="display:flex;flex-direction:column;justify-content:center;padding:110px 140px;gap:40px">
        <div class="kicker">PulseContract — audited & measured</div>
        <h2>Production-grade <span class="purple">Soroban</span></h2>
        <div class="row" style="flex-wrap:wrap;margin-top:20px">{fcards}</div>
        <div class="row" style="gap:18px">
          <span class="pill">WASM ≈ 64 KB</span>
          <span class="pill" style="border-color:rgba(34,197,94,.35);color:#22c55e">Gas-benchmarked</span>
          <span class="pill" style="border-color:rgba(34,197,94,.35);color:#22c55e">Formally audited</span>
        </div>
      </div>""")

    plat = [
        ("🔌", "REST API v1", "25+ endpoints — events, accounts, assets, stats, webhooks"),
        ("🔔", "HMAC-signed webhooks", "Replay, retries, rotate-secret"),
        ("🔑", "API keys", "Create · list · revoke · developer portal"),
        ("📡", "WebSocket + SSE", "subscribe by category, event type, account"),
    ]
    pcards = "".join(
        f'<div class="card" style="width:47%;font-size:27px"><div style="font-size:44px;margin-bottom:12px">{e}</div><div style="font-weight:700;font-size:30px;margin-bottom:6px">{t}</div><div style="color:#9aa3b8">{d}</div></div>'
        for e, t, d in plat)
    slide_html("devplat", f"""
      <div class="grow" style="display:flex;flex-direction:column;justify-content:center;padding:110px 150px;gap:40px">
        <div class="kicker">Ships for developers</div>
        <h2>A platform, <span class="accent2">not just a dashboard</span></h2>
        <div class="row" style="flex-wrap:wrap;margin-top:20px">{pcards}</div>
      </div>""")

    slide_html("trust", f"""
      <div class="grow" style="display:flex;flex-direction:column;justify-content:center;padding:110px 150px;gap:40px">
        <div class="kicker">Engineered to be trusted</div>
        <h2>Quality gates, <span class="accent">enforced</span></h2>
        <div class="row" style="flex-wrap:wrap;margin-top:20px;gap:24px">
          <div class="card" style="text-align:center"><div class="big" style="color:#22c55e">526</div><div style="font-size:28px;color:#9aa3b8">tests passing</div></div>
          <div class="card" style="text-align:center"><div class="big" style="color:#22c55e">98.7%</div><div style="font-size:28px;color:#9aa3b8">contract lines covered</div></div>
          <div class="card" style="text-align:center"><div class="big" style="color:#22c55e">90%</div><div style="font-size:28px;color:#9aa3b8">CI coverage floor</div></div>
          <div class="card" style="text-align:center"><div class="big" style="color:#0ea5e9">0</div><div style="font-size:28px;color:#9aa3b8">critical vulnerabilities</div></div>
        </div>
        <div class="sub">Dependency audits · CodeQL · secret scanning · protected main branch</div>
      </div>""")

    slide_html("cta", f"""
      <div class="grow" style="display:flex;flex-direction:column;align-items:center;justify-content:center;gap:40px;text-align:center">
        <div class="kicker">Try it now</div>
        <h1 style="max-width:1500px">Watch the network <span class="accent">beat in real time</span></h1>
        <div style="font-family:'JetBrains Mono','Inter',monospace;font-size:52px;font-weight:700;color:#22c55e;background:rgba(34,197,94,.08);border:1px solid rgba(34,197,94,.35);padding:24px 56px;border-radius:999px">mizpah-pulse.vercel.app</div>
        <div class="row" style="gap:18px">
          <span class="pill">Fork the repo</span>
          <span class="pill">Read the docs</span>
          <span class="pill">docker compose up</span>
        </div>
      </div>""")

    slide_html("end", f"""
      <div class="grow" style="display:flex;flex-direction:column;align-items:center;justify-content:center;gap:40px;text-align:center">
        {logo}
        <div style="font-size:44px;color:#9aa3b8;max-width:1300px">The heartbeat of on-chain activity on Stellar</div>
        <div class="row" style="gap:18px">
          <span class="pill">⚡ mizpah-pulse.vercel.app</span>
          <span class="pill">🔗 github.com/MizPahPulse/MizPahPulse</span>
        </div>
        <div style="font-size:30px;color:#5f6782;margin-top:10px">Fork · Deploy · Build</div>
      </div>""")


SLIDE_RENDERER = r"""
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
(async () => {
  const htmlDir = process.argv[2], outDir = process.argv[3];
  fs.mkdirSync(outDir, { recursive: true });
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });
  for (const f of fs.readdirSync(htmlDir).filter(f => f.endsWith('.html'))) {
    await page.goto('file://' + path.join(htmlDir, f), { waitUntil: 'load' });
    await page.waitForTimeout(300);
    await page.screenshot({ path: path.join(outDir, f.replace('.html', '.png')) });
    console.log('slide ' + f.replace('.html', ''));
  }
  await browser.close();
})();
"""


def render_slides():
    if os.path.exists(os.path.join(SLIDES_PNG, "title.png")) and os.environ.get("SKIP_SLIDES"):
        return
    os.makedirs(SLIDES_PNG, exist_ok=True)
    helper = os.path.join(TMP, "render-slides.cjs")
    with open(helper, "w") as f:
        f.write(SLIDE_RENDERER)
    env = dict(os.environ)
    env.setdefault("NODE_PATH", os.path.join(ROOT, "node_modules"))
    r = subprocess.run(["node", helper, SLIDES_HTML, SLIDES_PNG], capture_output=True, text=True, env=env)
    if r.returncode != 0:
        raise RuntimeError("slide render failed:\n" + r.stderr[-1500:])
    print(r.stdout.strip())


# ── 3. Still prep (callouts) ────────────────────────────────────────────
from PIL import Image, ImageDraw, ImageFont  # noqa: E402


def font(path, size):
    return ImageFont.truetype(path, size)


def prep_still(src, dst, callout=None, zoom=1.0):
    """Center-crop src to 1920x1080 (with zoom), then add a callout bar."""
    im = Image.open(src).convert("RGB")
    w, h = im.size
    # cover-crop to W:H
    target_ratio = W / H
    ratio = w / h
    if ratio > target_ratio:
        nw = int(h * target_ratio)
        x0 = (w - nw) // 2
        im = im.crop((x0, 0, x0 + nw, h))
    else:
        nh = int(w / target_ratio)
        y0 = (h - nh) // 2
        im = im.crop((0, y0, w, y0 + nh))
    im = im.resize((W, H), Image.LANCZOS)
    if callout:
        d = ImageDraw.Draw(im, "RGBA")
        # bottom callout bar
        d.rectangle([0, H - 150, W, H], fill=(7, 10, 20, 205))
        d.rectangle([0, H - 154, 10, H], fill=(34, 197, 94, 255))
        f = font(FONT_SEMI, 44)
        d.text((44, H - 105), callout, font=f, fill=(232, 234, 242, 255))
    im.save(dst)


# ── 4. Scene clips ──────────────────────────────────────────────────────
def zoompan_filter(motion, dur):
    n = int(dur * FPS)
    if motion == "in":
        return f"zoompan=z='1+0.10*on/{n}':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d={n}:s={W}x{H}:fps={FPS}"
    if motion == "out":
        return f"zoompan=z='1.10-0.10*on/{n}':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d={n}:s={W}x{H}:fps={FPS}"
    if motion == "left":
        return f"zoompan=z='1.08':x='(iw-iw/zoom)*(1-on/{n})':y='ih/2-(ih/zoom/2)':d={n}:s={W}x{H}:fps={FPS}"
    if motion == "right":
        return f"zoompan=z='1.08':x='(iw-iw/zoom)*on/{n}':y='ih/2-(ih/zoom/2)':d={n}:s={W}x{H}:fps={FPS}"
    if motion == "up":
        return f"zoompan=z='1.08':x='iw/2-(iw/zoom/2)':y='(ih-ih/zoom)*(1-on/{n})':d={n}:s={W}x{H}:fps={FPS}"
    return f"zoompan=z='1+0.06*on/{n}':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d={n}:s={W}x{H}:fps={FPS}"


def build_clip(still, dur, motion, out):
    vf = f"scale={int(W*1.6)}:{int(H*1.6)},{zoompan_filter(motion, dur)}"
    run([FFMPEG, "-y", "-loop", "1", "-framerate", str(FPS), "-i", still,
         "-vf", vf, "-t", f"{dur:.2f}", "-r", str(FPS),
         "-c:v", "libx264", "-preset", "ultrafast", "-crf", "20", "-pix_fmt", "yuv420p", out])


# ── 5. Audio per scene ──────────────────────────────────────────────────
def build_scene_audio(narr, scene_dur, out):
    if narr:
        run([FFMPEG, "-y", "-i", narr, "-af", f"apad=pad_dur={max(scene_dur - 0.2, 0):.2f}",
             "-t", f"{scene_dur:.2f}", "-ar", "44100", "-ac", "2", "-c:a", "pcm_s16le", out])
    else:
        run([FFMPEG, "-y", "-f", "lavfi", "-i", f"anullsrc=r=44100:cl=stereo",
             "-t", f"{scene_dur:.2f}", "-c:a", "pcm_s16le", out])


# ── 6. Main ─────────────────────────────────────────────────────────────
def build():
    for d in (NARR, SLIDES_HTML, SLIDES_PNG, SCENES):
        os.makedirs(d, exist_ok=True)

    print("▶ narration")
    narr_dur = gen_narration()
    total_narr = sum(narr_dur.values())
    print("  narration total: %.1fs" % total_narr)

    print("▶ slides")
    build_slides_html()
    render_slides()

    print("▶ stills")
    prep_still(os.path.join(STILLS, "landing.png"), os.path.join(TMP, "p_landing.png"))
    prep_still(os.path.join(STILLS, "dashboard.png"), os.path.join(TMP, "p_dash.png"),
               callout="Live pulse — transactions, top accounts, realtime activity")
    prep_still(os.path.join(STILLS, "feed.png"), os.path.join(TMP, "p_feed.png"),
               callout="Real-time events — filter by category, type, or account")
    prep_still(os.path.join(STILLS, "analytics.png"), os.path.join(TMP, "p_analytics.png"),
               callout="Trends across 24h · 7d · 30d — category breakdowns")
    prep_still(os.path.join(STILLS, "wallets.png"), os.path.join(TMP, "p_wallets.png"),
               callout="Freighter connect — balance & send, signed in-browser")
    prep_still(os.path.join(STILLS, "feed.png"), os.path.join(TMP, "p_feed2.png"),
               callout="What if you could watch the whole network live?")

    # scene plan: (still, motion, narration_key or None, min_dur)
    scenes = [
        (os.path.join(SLIDES_PNG, "title.png"), "in", None, 6),
        (os.path.join(SLIDES_PNG, "problem.png"), "in", "s1", 8),
        (os.path.join(TMP, "p_feed2.png"), "in", None, 6),
        (os.path.join(SLIDES_PNG, "arch.png"), "in", "s2", 8),
        (os.path.join(SLIDES_PNG, "categories.png"), "in", None, 5),
        (os.path.join(TMP, "p_landing.png"), "out", "s3", 7),
        (os.path.join(TMP, "p_dash.png"), "in", None, 7),
        (os.path.join(TMP, "p_feed.png"), "left", None, 7),
        (os.path.join(TMP, "p_analytics.png"), "in", None, 7),
        (os.path.join(TMP, "p_wallets.png"), "right", None, 7),
        (os.path.join(SLIDES_PNG, "monorepo.png"), "in", "s4", 8),
        (os.path.join(SLIDES_PNG, "code.png"), "in", None, 7),
        (os.path.join(SLIDES_PNG, "contract.png"), "in", None, 7),
        (os.path.join(SLIDES_PNG, "devplat.png"), "in", "s5", 8),
        (os.path.join(SLIDES_PNG, "trust.png"), "in", None, 7),
        (os.path.join(TMP, "p_landing.png"), "in", None, 6),
        (os.path.join(SLIDES_PNG, "cta.png"), "in", "s6", 8),
        (os.path.join(SLIDES_PNG, "end.png"), "out", None, 6),
    ]

    # scale scene durations so total ≈ TARGET while every narrated scene
    # keeps its narration + breathing room
    narrated = [(i, s) for i, s in enumerate(scenes) if s[2]]
    narr_sum = sum(narr_dur[s[2]] for _, s in narrated)
    pad_total = TARGET - narr_sum - sum(s[3] for i, s in enumerate(scenes) if not s[2])
    base_pad = max(pad_total / max(len(narrated), 1), 0.0)

    durations = []
    for i, (still, motion, key, mn) in enumerate(scenes):
        d = mn
        if key:
            d = max(mn, narr_dur[key] + base_pad)
        durations.append(d)

    # transitions eat 0.5s each; add that back so total lands on TARGET
    n_xfade = len(scenes) - 1
    excess = sum(durations) - n_xfade * 0.5
    if excess < TARGET:
        durations[0] += TARGET - excess

    t = 0.0
    timeline = []
    for i, ((still, motion, key, _), d) in enumerate(zip(scenes, durations)):
        clip = os.path.join(SCENES, f"scene{i:02d}.mp4")
        if not os.path.exists(clip):
            print(f"  clip {i:02d} ({d:.1f}s, {motion})")
            build_clip(still, d, motion, clip)
        audio = os.path.join(SCENES, f"scene{i:02d}.wav")
        narr_file = os.path.join(NARR, f"{key}.mp3") if key else None
        build_scene_audio(narr_file, d, audio)
        timeline.append((t, t + d, key, d))
        t += d

    print("▶ assemble")
    # video: concat clips with 0.5s xfades
    inputs = []
    for i in range(len(scenes)):
        inputs += ["-i", os.path.join(SCENES, f"scene{i:02d}.mp4")]
    filt = []
    prev = "0:v"
    for i in range(1, len(scenes)):
        off = sum(durations[:i]) - 0.5 * i
        out = f"x{i}"
        filt.append(f"[{prev}][{i}:v]xfade=transition=fade:duration=0.5:offset={off:.2f}[{out}]")
        prev = out
    vf = ";".join(filt)
    run([FFMPEG, "-y"] + inputs + ["-filter_complex", vf, "-map", f"[{prev}]",
         "-c:v", "libx264", "-preset", "ultrafast", "-crf", "20", "-pix_fmt", "yuv420p",
         "-r", str(FPS), os.path.join(TMP, "video-only.mp4")], timeout=900)

    # audio: concat scene wavs
    with open(os.path.join(TMP, "audio-list.txt"), "w") as f:
        for i in range(len(scenes)):
            f.write(f"file '{os.path.join(SCENES, f'scene{i:02d}.wav')}'\n")
    run([FFMPEG, "-y", "-f", "concat", "-safe", "0", "-i", os.path.join(TMP, "audio-list.txt"),
         "-c:a", "aac", "-b:a", "160k", os.path.join(TMP, "audio.m4a")])

    # mux
    run([FFMPEG, "-y", "-i", os.path.join(TMP, "video-only.mp4"), "-i", os.path.join(TMP, "audio.m4a"),
         "-c:v", "copy", "-c:a", "copy", "-movflags", "+faststart", OUT], timeout=300)

    dur = media_duration(OUT)
    size = os.path.getsize(OUT) / 1e6
    print(f"\n✓ {OUT}")
    print(f"  duration: {dur:.1f}s  size: {size:.1f} MB")

    shutil.copyfile(OUT, FINAL)
    print(f"✓ installed → {FINAL}")


if __name__ == "__main__":
    build()