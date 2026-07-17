# Readiness scorecard

| Gate | Status | Notes |
|------|--------|-------|
| CI | yes | web lint/test/build + postgres; Android `assembleDebug` after `cap sync` |
| Tests | pass | build: pass |
| .env.example | yes | includes Capacitor `VITE_API_BASE_URL` / `CORS_ORIGINS` hints |
| DEPLOY.md | deep | |
| Mobile Phase C | complete | Capacitor shell, shared web audio path |
| Mobile Phase D | scaffolding complete | signing templates, store scaffold, CI smoke; **device QA unchecked** |
| Mobile Phase E | complete | JS MediaSession, iOS PrivacyInfo, product store listing copy |
| Billing | none | |
| Last verified | 2026-07-17 | Phase E pre-submit harden |

## Next blocker

**Human-gated store credentials + device QA:** upload keystore / Play Console access, Apple Development Team + App Store Connect, host a privacy policy URL (see [`store/privacy.md`](store/privacy.md)), and flip checkboxes in [`docs/MOBILE.md`](docs/MOBILE.md) on hardware.

Repo templates: `android/key.properties.example`, `store/ios/ExportOptions.plist.example` — do not commit real secrets.

## Release ETA

Fast (blocked on credentials + device QA)
