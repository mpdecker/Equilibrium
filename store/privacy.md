# Privacy — store nutrition notes (Phase E)

## Privacy policy URL

`_(host TBD — required before App Store / Play submission)_`

Host a real policy page, then paste the URL into App Store Connect and Play Console. Do not invent a production URL in-repo.

## Data practices (aligned with current app)

| Data | Collected? | Notes |
|------|------------|-------|
| Mood text | Yes (user-entered) | Sent to `/api/generate-music` when online (Gemini). Offline: may queue related feedback |
| Journal text | Yes (user-entered) | POSTed to `/api/journals` or queued in IndexedDB outbox |
| Interaction / feedback labels | Yes | Stored with soundscape envelope; used for personalization summary |
| Soundscape params | Yes | AmbientParams + envelope in localStorage / IndexedDB; optional API persistence |
| Anonymous session id | Yes | Client-generated session id for envelopes / `/api/sessions` |
| Account / login | No | No auth product surface today |
| Location | No | |
| Advertising ID | No | |
| Crash / analytics SDKs | No | None bundled in Phase E |
| Lock-screen Media Session | Local only | Title/artist metadata via JS `navigator.mediaSession` — not uploaded |

## App Privacy (Apple) / Data safety (Play)

Use the table above. Mark tracking as **no**. Disclose network use for mood generation and sync when online.

## Reminders

- Do not claim medical treatment or diagnosis.
- Disclose AI-assisted mood → soundscape generation when online.
- Disclose local storage / IndexedDB for soundscape + offline outbox.
