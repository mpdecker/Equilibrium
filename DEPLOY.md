# Equilibrium â€” deployment

_Last updated: 2026-07-01 (Phase 2 readiness pass)_

## Stack

node project under `C:\Development\Equilibrium`

## Prerequisites

- CI workflow: `.github/workflows/ci.yml` (if present)
- Copy `.env.example` â†’ `.env.local` / host secrets

## Environment

| Variable | Purpose |
|----------|---------|
| GEMINI_API_KEY | Required at deploy |
| APP_URL | Required at deploy |
| DATABASE_URL | Required at deploy |

## Local dev

```bash
cd C:\Development\Equilibrium
npm ci
npm run dev
```

## Build & test

```bash
npm test
npm run build
```

## Host

Vercel (Next/Vite web) or static hosting per README

## Smoke check

- [ ] Local dev server starts without env errors
- [ ] Test command exits 0 (or documented skip reason in READINESS.md)
- [ ] Production URL / store build succeeds

## Rollback

Redeploy the previous host build (Vercel promotion rollback, EAS prior build, or Docker image tag).
