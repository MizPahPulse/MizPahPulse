/**
 * MizpahPulse — high-res (1920x1080) still captures for the pitch video.
 * Same Freighter v3 stub as scripts/capture-screenshots.mjs so wallet pages
 * render their connected state. Output goes to /tmp/pitch/stills/ (scratch,
 * not committed).
 *
 * Usage: node scripts/capture-pitch-stills.mjs
 *   BASE_URL=https://mizpah-pulse.vercel.app
 */

import { chromium } from "playwright";
import fs from "node:fs";
import path from "node:path";

const BASE_URL = process.env.BASE_URL ?? "https://mizpah-pulse.vercel.app";
const ACCOUNT =
  process.env.ACCOUNT ?? "GC7J7IBB6FY55R4ZFA2UNCBNEF466CHD2R7RQRH2NHC2YPY6M355XURR";
const OUT = path.resolve("/tmp/pitch/stills");

fs.mkdirSync(OUT, { recursive: true });

const FREIGHTER_STUB = `(() => {
  const acct = ${JSON.stringify(ACCOUNT)};
  const stub = {
    isConnected: () => Promise.resolve({ isConnected: true }),
    isAllowed: () => Promise.resolve({ isAllowed: true }),
    getPublicKey: () => Promise.resolve(acct),
    getAddress: () => Promise.resolve({ address: acct }),
    requestAccess: () => Promise.resolve({ address: acct }),
    getNetwork: () => Promise.resolve("TESTNET"),
    signTransaction: (tx) => Promise.resolve(tx),
  };
  window.freighterApi = stub;
  window.freighter = stub;
})();`;

const browser = await chromium.launch();
const shots = [
  { file: "landing.png", route: "/", viewport: { width: 1920, height: 1080 }, stub: false },
  { file: "dashboard.png", route: "/dashboard", viewport: { width: 1920, height: 1080 }, stub: false },
  { file: "feed.png", route: "/dashboard/feed", viewport: { width: 1920, height: 1080 }, stub: false },
  { file: "analytics.png", route: "/dashboard/analytics", viewport: { width: 1920, height: 1080 }, stub: false },
  { file: "wallets.png", route: "/dashboard/wallets", viewport: { width: 1920, height: 1080 }, stub: true },
];

for (const s of shots) {
  const context = await browser.newContext({ viewport: s.viewport, deviceScaleFactor: 1 });
  if (s.stub) await context.addInitScript(FREIGHTER_STUB);
  const page = await context.newPage();
  await page.goto(`${BASE_URL}${s.route}`, { waitUntil: "load", timeout: 45_000 });
  await page.waitForTimeout(6000);
  if (s.stub) {
    await page.getByRole("button", { name: /connect/i }).first().click({ timeout: 10_000 }).catch(() => {});
    await page.waitForTimeout(2500);
  }
  await page.screenshot({ path: path.join(OUT, s.file) });
  console.log(`✓ ${s.file} (${Math.round(fs.statSync(path.join(OUT, s.file)).size / 1024)} KB)`);
  await context.close();
}
await browser.close();
console.log("done → /tmp/pitch/stills/");