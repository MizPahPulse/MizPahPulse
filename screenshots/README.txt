Place screenshots here for the README:

Desktop (1440×900):
1. 01-landing.png          — Landing page
2. 02-dashboard.png        — Real-time dashboard with live feed
3. 03-wallet-options.png   — Wallets page with Freighter connected
4. 04-contracts.png        — Contract explorer
5. 05-live-feed.png        — Live event feed
6. 06-analytics.png        — Analytics suite

Mobile (375×812):
7. 07-mobile-dashboard.png — Dashboard on mobile
8. 08-mobile-wallets.png   — Wallets page on mobile

All screenshots are captured against the live deploy with
scripts/capture-screenshots.mjs (Playwright; a Freighter v3 stub makes the
wallet connect flow resolve with a real funded Testnet account):

  BASE_URL=https://mizpah-pulse.vercel.app node scripts/capture-screenshots.mjs

Pitch video: demo-video.mp4 — 5-minute narrated product pitch (1080p,
problem → solution → live demo → engineering → CTA). Poster frame:
pitch-video-poster.png. Rebuild with scripts/build-pitch-video.py
(edge-tts narration + Playwright slides + ffmpeg; see scripts/pitch-script.md
for the narration script).