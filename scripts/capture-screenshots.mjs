/**
 * MizpahPulse — screenshot capture (run against the live deploy).
 *
 * Captures the README screenshots (landing, dashboard, wallets, contracts,
 * live feed, analytics + two mobile views) at the standard viewports into
 * screenshots/. Wallets pages inject a Freighter v3 stub so the connect
 * flow resolves with a real funded Testnet account and the wallet UI
 * renders its connected state.
 *
 * Usage: node scripts/capture-screenshots.mjs
 *   BASE_URL=https://mizpah-pulse.vercel.app  (override target)
 *   ACCOUNT=G...                              (funded testnet account)
 */

import { chromium } from "playwright";
import fs from "node:fs";
import path from "node:path";

const BASE_URL = process.env.BASE_URL ?? "https://mizpah-pulse.vercel.app";
const ACCOUNT =
  process.env.ACCOUNT ?? "GC7J7IBB6FY55R4ZFA2UNCBNEF466CHD2R7RQRH2NHC2YPY6M355XURR";
const OUT_DIR = path.resolve("screenshots");
const DESKTOP = { width: 1440, height: 900 };
const MOBILE = { width: 375, height: 812 };

fs.mkdirSync(OUT_DIR, { recursive: true });

// Freighter v3 stub — the app detects the extension via window.freighterApi
// and calls isConnected/requestAccess/getAddress on it directly.
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
const failures = [];

async function shot(page, file) {
  const target = path.join(OUT_DIR, file);
  try {
    await page.screenshot({ path: target });
    const kb = Math.round(fs.statSync(target).size / 1024);
    if (kb < 8) throw new Error(`suspiciously small (${kb} KB) — likely blank`);
    console.log(`✓ ${file} (${kb} KB)`);
  } catch (err) {
    try {
      fs.unlinkSync(target);
    } catch {}
    failures.push(file);
    console.error(`✗ ${file}: ${err.message}`);
  }
}

async function capture({ file, route, viewport = DESKTOP, stub = false }) {
  const context = await browser.newContext({ viewport });
  if (stub) await context.addInitScript(FREIGHTER_STUB);
  const page = await context.newPage();
  await page.goto(`${BASE_URL}${route}`, { waitUntil: "load", timeout: 45_000 });
  // Let live data / charts settle before capturing.
  await page.waitForTimeout(6000);
  if (stub && route === "/dashboard/wallets") {
    await page
      .getByRole("button", { name: /connect/i })
      .first()
      .click({ timeout: 10_000 })
      .catch(() => {});
    await page.waitForTimeout(2500);
  }
  await shot(page, file);
  await context.close();
}

await capture({ file: "01-landing.png", route: "/" });
await capture({ file: "02-dashboard.png", route: "/dashboard" });
await capture({ file: "03-wallet-options.png", route: "/dashboard/wallets", stub: true });
await capture({ file: "04-contracts.png", route: "/dashboard/contracts" });
await capture({ file: "05-live-feed.png", route: "/dashboard/feed" });
await capture({ file: "06-analytics.png", route: "/dashboard/analytics" });
await capture({ file: "07-mobile-dashboard.png", route: "/dashboard", viewport: MOBILE });
await capture({ file: "08-mobile-wallets.png", route: "/dashboard/wallets", viewport: MOBILE, stub: true });

await browser.close();

if (failures.length) {
  console.error(`\n${failures.length} screenshot(s) failed: ${failures.join(", ")}`);
  process.exit(1);
}
console.log("\nAll screenshots captured → screenshots/");