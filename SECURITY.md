# Security Policy

MizPahPulse processes blockchain data, signing secrets, and API credentials —
we take security reports seriously and appreciate the community's help keeping
the platform safe.

## Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| main    | ✅ Fully supported |
| < main  | ❌ Not supported   |

We support the `main` branch and the latest release. Older tags are not
supported — please upgrade before reporting issues against them.

## Reporting a Vulnerability

**Please do not open a public GitHub issue for security vulnerabilities.**

Instead, report privately through one of the following channels:

1. **GitHub Private Vulnerability Reporting** (preferred) — use the
   *Report a vulnerability* button on the repository's
   [Security tab](https://github.com/MizPahPulse/MizPahPulse/security/advisories).
2. **Email** the maintainers with the subject line
   `[MizPahPulse Security] <short summary>`.

### What to include

To help us triage quickly, please include:

- The affected component (web app, API route, WebSocket server, ingester,
  smart contract, CI/CD, dependencies).
- A description of the vulnerability and its impact.
- Steps to reproduce (including any testnet accounts, contracts, or payloads).
- Whether the issue is public or known to others.

### What happens next

- **Ack within 48 hours** — we confirm receipt and start triage.
- **Triage within 5 business days** — we assess severity and impact.
- **Fix & disclosure** — for confirmed issues we develop a fix, prepare a
  release, and coordinate disclosure with you. You will be credited in the
  advisory unless you prefer to remain anonymous.

## Scope

We accept reports for:

- The web dashboard and public REST/SSE/WebSocket APIs.
- The event ingester and webhook delivery worker.
- The Soroban smart contract (`contracts/pulse`).
- Build, CI/CD, and deployment configuration that affects production security.

Out of scope: unmodified upstream dependencies (report those to their
maintainers), social engineering of users, and issues requiring physical
access to a victim's device.

## Security Best Practices for Users

- Keep your `whsec_` webhook secrets and `mp_live_`/`mp_test_` API keys out of
  client-side code and git history.
- Rotate secrets immediately if they may have leaked (see the dashboard
  webhooks page).
- Run local instances with the demo `REQUIRE_API_KEY` default (`false`) only
  on isolated networks; set `REQUIRE_API_KEY=true` and a strong
  `API_KEY_SECRET` for anything reachable publicly.