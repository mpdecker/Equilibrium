# Mobile (Capacitor) — Phase C–E storefront

Equilibrium ships **one web audio stack** (Tone · AudioWorklet/WASM · preview PCM) for browsers and native storefronts. Capacitor is a thin WebView shell around the same Vite `dist/` build — there is no forked native synthesizer.

| Phase | Status | What |
|-------|--------|------|
| **C** — Native storefront shell | **Complete** | Capacitor iOS/Android wrap shared `dist/`; App / Haptics / StatusBar; worklet `BASE_URL`; iOS `UIBackgroundModes: audio` |
| **D** — Storefront ship scaffolding | **Complete** | Device QA checklist, release signing templates, store metadata scaffold, mobile CI smoke (`assembleDebug`) |
| **E** — Pre-submit harden | **Complete** | JS `MediaSession` lock-screen controls, iOS `PrivacyInfo.xcprivacy`, product-accurate store listing copy |

Ship to stores still needs **human** credentials + flipping Phase D device QA on hardware.

```
npm run build  →  dist/  →  cap sync  →  ios/ / android/ WebView assets
                      ↑
         ToneAmbientEngine / WorkletAmbientEngine / PreviewAmbientEngine
```

## Architecture guarantees

| Concern | Behavior |
|---------|----------|
| Synthesis | Identical `createAmbientEngine()` path as web |
| Worklets | Resolved via `import.meta.env.BASE_URL` (`./worklets/...` in production) so Capacitor `base: './'` packaging works |
| API | `VITE_API_BASE_URL` + `apiFetch()` when WebView origin ≠ API origin |
| Offline | localStorage + IndexedDB soundscape mirror; outbox flush on `online` / Cap `App.resume` |
| Haptics | `@capacitor/haptics` on native; `navigator.vibrate` on web (`pulseSessionCheckpoint`) |
| Lock screen | JS `navigator.mediaSession` metadata + play/pause (no Android FGS) |

## Environment

| Variable | Client (Vite) | Server (Express) |
|----------|---------------|------------------|
| `VITE_API_BASE_URL` | Origin of the Express API, no trailing slash (e.g. `https://api.example.com`). Omit for same-origin web. | — |
| `CORS_ORIGINS` | — | Comma-separated `Origin` headers allowed to call the JSON API. Include your web app and the Capacitor WebView origin(s). |

Capacitor origins from [`capacitor.config.ts`](../capacitor.config.ts):

- Android: `https://localhost` (`androidScheme: "https"`)
- iOS: `capacitor://localhost` (`iosScheme: "capacitor"`)

```bash
CORS_ORIGINS=https://app.example.com,https://localhost,capacitor://localhost
```

## Build and sync

```bash
# Local packaging checks (after npm run build)
npm run cap:doctor

# Production client + native asset copy
npm run cap:sync

# Open IDE after sync
npm run cap:ios        # requires macOS + Xcode
npm run cap:android    # Android Studio

# Release artifacts (signing required for Android release)
npm run cap:android:bundle   # AAB via Gradle bundleRelease
# iOS archive: macOS only — see "Release signing" below
```

`webDir` is `dist`. Sync copies that folder into native projects; do **not** point Capacitor at a second audio bundle.

## Phase D device QA

Flip boxes after a real device/emulator run. `npm run cap:doctor` is **not** a substitute.

| Pass | Check |
|------|-------|
| [ ] | **First gesture** — Start playback with a tap so Web Audio unlocks |
| [ ] | **Engine parity** — `VITE_AUDIO_ENGINE=tone` (default) and optionally `wasm`; visualiser + sound match desktop for the same params |
| [ ] | **Worklet asset** — `audioWorklet.addModule` loads `./worklets/equilibrium-dsp-processor.js` (no 404) |
| [ ] | **API** — Generate-music succeeds with `VITE_API_BASE_URL` + CORS |
| [ ] | **iOS background** — Audio continues with screen locked (`UIBackgroundModes` → `audio` in Info.plist) |
| [ ] | **Checkpoints** — Timed session 25/50/75% produces a light haptic (`pulseSessionCheckpoint`) |
| [ ] | **Lock screen Media Session** — System play/pause reflects app state (Phase E) |

## Phase E — Pre-submit harden

| Item | Location |
|------|----------|
| JS Media Session | [`src/lib/platform/media-session.ts`](../src/lib/platform/media-session.ts) — title/artist + play/pause; wired from `App.tsx` |
| iOS Privacy Manifest | [`ios/App/App/PrivacyInfo.xcprivacy`](../ios/App/App/PrivacyInfo.xcprivacy) — no tracking; required-reason APIs for UserDefaults / file timestamps used by the WKWebView shell |
| Store listing copy | [`store/`](../store/) — product-accurate text; privacy/support **host URLs still TBD** |

**Still deferred:** Android foreground `MediaSession` *service* / `FOREGROUND_SERVICE` — only if OEM kills of the WebView are proven in device QA.

## Release signing (no secrets in git)

### Android

1. Copy [`android/key.properties.example`](../android/key.properties.example) → `android/key.properties` (gitignored).
2. Point `storeFile` at a local keystore (also gitignored via `*.keystore`).
3. [android/app/build.gradle](../android/app/build.gradle) loads `key.properties` when present and applies `signingConfigs.release` to the release build type.
4. Versioning: bump `versionCode` (integer, Play-required) and `versionName` (semver string) in `defaultConfig` for each store upload.
5. Produce an AAB: `npm run cap:sync` then `npm run cap:android:bundle`.

Without `key.properties`, debug builds and CI `assembleDebug` still work; `bundleRelease` needs a keystore.

### iOS (macOS)

1. In Xcode → **Signing & Capabilities**: Automatic signing + your **Team** (`DEVELOPMENT_TEAM`). Do not commit team IDs if your policy forbids it.
2. Confirm **Background Modes → Audio** (also declared in [`ios/App/App/Info.plist`](../ios/App/App/Info.plist)).
3. Archive: Product → Archive, or `xcodebuild` using [`store/ios/ExportOptions.plist.example`](../store/ios/ExportOptions.plist.example) as a starting point for `exportArchive`.
4. Bump `MARKETING_VERSION` / `CURRENT_PROJECT_VERSION` in the Xcode project for each App Store upload.
5. Confirm `PrivacyInfo.xcprivacy` is in the app target (Phase E).

`npm run cap:ios:archive` prints macOS-only instructions (no-op archive on Windows/Linux).

## Store listing

See [`store/README.md`](../store/README.md) for App Store / Play copy, privacy notes, and icon/screenshot checklist. Replace Capacitor default icons before submission. Host a privacy policy URL before upload.

## iOS — background audio (storefront)

After `cap:add:ios` / first sync, in Xcode:

1. **Signing & Capabilities** → **Background Modes** → enable **Audio, AirPlay, and Picture in Picture** (verify against Info.plist).
2. Confirm first playback starts from a user gesture (unlocks `AudioContext` in WKWebView).
3. Lock the device and verify ambient audio continues.

Bundle id: `app.equilibrium.sound`.

## Android — long sessions

- `INTERNET`, `WAKE_LOCK`, `VIBRATE`, `MODIFY_AUDIO_SETTINGS` are declared for Web Audio + checkpoint haptics.
- Confirm long ambient sessions on a mid-range device. Introduce a foreground service only if OEMs kill the WebView — keep synthesis in JS either way.

## Native shell plugins

| Package | Role |
|---------|------|
| `@capacitor/core` / `cli` | Runtime + tooling |
| `@capacitor/app` | Resume → outbox flush |
| `@capacitor/haptics` | Session checkpoint pulses |
| `@capacitor/status-bar` | Dark bar matching `#0a0502` |

Bootstrap runs from `src/main.tsx` via `bootstrapNativeShell()` (no-op on web).

## Offline behavior

- Playback uses the last persisted soundscape (localStorage + IndexedDB mirror).
- Mood text and journal saves are **queued** offline and POSTed when the device is online (`online` event or app `resume` on native).
- **`/api/generate-music`** requires the network; offline mood entry still logs the note to the sync queue and keeps the current params.

## Non-goals (still deferred)

- Android foreground service / native MediaSession service (unless OEM kills proven)
- Instrument Mode UX phases beyond existing stage/form
- Auth, push, offline generate-music
- Committing keystores, API keys, or Apple team IDs
