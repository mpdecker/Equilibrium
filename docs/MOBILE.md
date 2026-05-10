# Mobile (Capacitor) and offline sync

Build the web client with a **non-empty** API base when the UI is served from a native WebView (production `dist/` copied into the app).

## Environment

| Variable | Client (Vite) | Server (Express) |
|----------|---------------|------------------|
| `VITE_API_BASE_URL` | Origin of the Express API, no trailing slash (e.g. `https://api.example.com`). Omit for same-origin web. | — |
| `CORS_ORIGINS` | — | Comma-separated `Origin` headers allowed to call the JSON API. Include your web app and the Capacitor WebView origin(s). |

Capacitor commonly sends `Origin: https://localhost` with `android.scheme: "https"` ([Capacitor config](https://capacitorjs.com/docs/config)). iOS may use `capacitor://localhost` depending on scheme. Add every failing origin from DevTools or native logs to `CORS_ORIGINS`.

Example:

```bash
CORS_ORIGINS=https://app.example.com,https://localhost,capacitor://localhost
```

## Build and sync

```bash
npm run build
npx cap sync
npx cap open ios    # or android
```

Shortcuts: `npm run cap:sync` (build + sync), `npm run cap:ios`, `npm run cap:android`.

The first `cap sync` generates `ios/` and `android/` if missing.

## Offline behavior

- Playback uses the last persisted soundscape (localStorage + IndexedDB mirror).
- Mood text and journal saves are **queued** offline and POSTed when the device is online (`online` event or app `resume` on native).
- **`/api/generate-music`** requires the network; offline mood entry still logs the note to the sync queue and keeps the current params.

## Native audio (manual QA)

1. **First gesture**: Start playback with a tap so the Web Audio context unlocks on iOS WKWebView.
2. **iOS background playback**: In Xcode, enable **Background Modes → Audio, AirPlay, and Picture in Picture** and verify audio when locking the device.
3. **Android**: Confirm long ambient sessions survive on low-RAM devices; introduce a foreground service only if testing shows kills.
