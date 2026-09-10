# MizpahPulse — 5-Minute Pitch Video Script

Voice: en-US-ChristopherNeural (rate -8%). Target runtime ≈ 5:00.
Narration is generated per section with `scripts/build-pitch-video.py`, and each
scene's duration is derived from its narration segment so audio and visuals
stay in sync.

---

## S1 — Hook & Problem (~0:00–0:55)

> The Stellar network never sleeps. Every second, somewhere on the network, a
> payment settles, a smart contract runs, a trade executes on the orderbook.
> Millions of events every day — unseen, unstored, and gone. If you build on
> Stellar, or invest in it, you're flying blind: stitching together Horizon
> streams and RPC calls, maintaining your own dashboards, and missing the
> signals that actually matter. What if the entire network had a pulse you
> could watch in real time?

**Visuals:** Title card (logo + tagline) → "the network never sleeps" stats
slide (events/day, payments, contracts, DEX trades) → live-feed screenshot with
slow zoom + "millions of events, unseen" callout.

## S2 — Solution (~0:55–1:40)

> This is MizpahPulse — the heartbeat of on-chain activity on Stellar. A
> real-time blockchain intelligence platform purpose-built for the Stellar
> ecosystem. An ingestion engine listens to the network around the clock and
> normalizes more than thirty-five event types across six categories:
> payments, smart contracts, DEX trades, NFTs, tokens, and account activity.
> That stream flows through Redis into PostgreSQL, out through a WebSocket
> server, and onto a live dashboard. The Stellar network, made visible.

**Visuals:** Architecture diagram (Ingester → Redis → Worker → PostgreSQL →
WebSocket → Dashboard) with animated flow → category grid slide (6 categories,
35+ event types).

## S3 — Live Product Demo (~1:40–2:50)

> And it's live right now. This is the production deployment on Vercel,
> connected to Stellar Testnet. The dashboard gives you the network's pulse at
> a glance — live transaction counts, top accounts, and recent activity as it
> happens. The feed streams events in real time: every payment, every contract
> invocation, filterable by category, event type, or account. The analytics
> suite turns history into insight — trends across twenty-four hours, seven
> days, or thirty; category breakdowns; and the contracts driving the most
> activity. And the wallets hub connects Freighter in one click: live balance,
> send XLM, all signed in the browser. No server-side keys, no custody.

**Visuals:** Landing screenshot → dashboard screenshot + "live pulse" callout →
feed screenshot + "filter by category/account" callout → analytics screenshot +
"24h / 7d / 30d" callout → wallets screenshot (connected).

## S4 — Engineering Depth (~2:50–3:55)

> Under the hood, this is a serious engineering story. A Turborepo monorepo: a
> Next.js fifteen web application, a dedicated WebSocket server, and an
> ingestion worker — with shared packages for the database, the Stellar SDK
> layer, types, and a reusable UI library. And the smart contract is
> production-grade. PulseContract demonstrates payment rails for any SEP-41
> asset, batch payroll tips, allowance-based pull payments, cross-contract
> communication, multi-sig emergency controls, pause and kill switches — all
> audited, gas-benchmarked, and shipped under sixty-four kilobytes of WASM,
> with a machine-readable taxonomy of three hundred and sixty-five error codes.

**Visuals:** Monorepo structure slide (tree diagram) → code snippet slide
(`useContractInvoke`) → contract feature grid slide (tips, batch, multi-sig,
pause/kill, WASM 64 KB, 365 error codes).

## S5 — Differentiators & Trust (~3:55–4:45)

> So what makes this different? It runs on Stellar's native rails — no
> bridges, no wrapped assets, no middlemen. It's real-time by design, from
> ingestion to streaming to the UI. It ships for developers: a REST API with
> twenty-five plus endpoints, HMAC-signed webhooks with replay, API keys, and
> a developer portal. And it's engineered to be trusted: five hundred and
> twenty-six tests passing, coverage enforced in CI, dependency audits,
> CodeQL, secret scanning, and a protected main branch — every pull request
> runs the full gauntlet before it lands.

**Visuals:** Developer-platform slide (REST API, webhooks, API keys) →
quality/trust slide (526 tests, coverage floors, CI gates, protected main) →
live CI screenshot (GitHub Actions) or README screenshot.

## S6 — Conclusion & Call to Action (~4:45–5:00)

> MizpahPulse turns the Stellar network into something you can watch, query,
> and build on. Try it yourself at mizpah-dash-pulse dot vercel dot app. Fork
> the repo, explore the documentation, and spin up the full stack with a
> single Docker Compose command. The network is alive. Now you can watch it
> beat. MizpahPulse — the heartbeat of on-chain activity on Stellar.

**Visuals:** Live site screenshot + URL callout → end card (logo, tagline,
"Fork · Deploy · Build", repo link).