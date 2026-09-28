# Tour Communication MVP V1

Standalone mobile-first module for temporary communication between a foreign tourist and a Thai driver.

## Runtime

- Frontend: static HTML/CSS/ES modules under `/tour/`
- Install experience: standards-based PWA with a scoped service worker, home-screen icon, and standalone display
- Staging backend: Supabase project `mrtaihualin-STAGING` (`xufxvwcelbovzsxywawg`)
- Data access: token-gated Postgres RPC functions; underlying tables are private
- Transport: 2.5-second polling (no P2P and no localStorage data cache)
- Session recovery: localStorage keeps only the session id, participant role, UI locale, and unguessable participant token
- Language-first onboarding: each device chooses Traditional Chinese, Thai, Japanese, or English, then chooses Traveler or Driver; both choices are remembered locally
- Single-language UI: after language selection, every visible app screen uses only that device's selected language, independent of the other person's choice
- Pairing identity: the creator enters their own customer display name or vehicle plate; the scanner enters the missing value before confirming, so the paired trip shows both
- Session lifetime: expires after seven days without explicit foreground use or a meaningful write
- Location consent: one request, one acceptance, exactly 20 minutes; a new request is required to extend
- Map provider: Google Maps when the restricted deployment key is configured; OpenStreetMap/Leaflet remains the automatic no-key/load-failure fallback

No code or runtime logic is imported from the existing language-learning website. The only shared infrastructure is the existing staging Supabase project and GitHub Pages preview host.

## Files

- `index.html` — create, scan, confirm, chat, voice, and appointment UI
- `map.html` — separate two-party live map
- `js/api.js` — isolated backend RPC client and session-token recovery
- `js/i18n.js` — locale keys, status keys, and standard intent translations
- `js/app.js` — pairing/chat/appointment flow
- `js/map.js` — consent, GPS updates, stable markers, and routing
- `js/pwa.js` / `sw.js` / `manifest.webmanifest` — installation and same-origin app-shell caching
- `supabase/migrations/` — private schema and public token-gated RPC API
- `tests/` — static contract checks and cross-device backend flow test

## Backend deployment

Apply the migration in `supabase/migrations/` only to the staging project. It creates:

- private tables for sessions, participants, messages, appointments, consent, and latest locations
- RLS on every table with no direct anonymous table policy
- explicit `anon`/`authenticated` grants for the `tour_v1_*` RPC surface only
- SHA-256 hashes for all join/access tokens; raw access tokens are never stored
- backend enforcement for seven-day inactivity and 20-minute location sharing
- location cleanup on every API call plus a five-minute staging cleanup job

## Local preview

Serve the repository root (not the `tour` directory alone), then open `/tour/`:

```sh
python3 -m http.server 8080
```

Camera and geolocation require HTTPS outside `localhost`; use the GitHub Pages staging URL for phone tests.

## Google Maps deployment

- Add the restricted browser key as the GitHub Actions secret `GOOGLE_MAPS_API_KEY`.
- Optionally add a Google Maps map ID as the repository variable `GOOGLE_MAPS_MAP_ID`; otherwise the Google demo map ID is used for the basic marker preview.
- Restrict the browser key to `https://mrtaihualin.github.io/mrtaihualin-preview/*` and to the Maps JavaScript API only.
- The workflow writes the key only into the deployed static artifact. The repository keeps an empty runtime config, and the map automatically falls back to OpenStreetMap if the secret is absent or Google Maps fails to load.

## Install on a phone

- Android/Chrome: use the in-app install card when offered, or choose **Install app** from the browser menu.
- iPhone/Safari: tap **Share**, then **Add to Home Screen**.
- Installation is optional. QR invite links continue to open the same `/tour/` module in a normal browser.
- The cached app shell can reopen without a network connection, but creating/joining a trip, chat, maps, and all live features still require internet access.
- Invite URLs are never written to the service-worker cache; QR join tokens remain transient and stop working after pairing.

## Tests

```sh
node --test tour/tests/contract.test.mjs
node tour/tests/e2e-api.mjs
```

The API test creates disposable sessions, exercises both creator directions, and ends them. Physical two-phone validation remains required for camera, mobile browser TTS, GPS quality, map behavior, and separate-network behavior.

## Privacy and security notes

- No real name, phone, email, LINE ID, passport, login, or account is required.
- QR join tokens stop working immediately after pairing.
- A QR join always infers the opposite role from the creator. A fresh device chooses its language before confirming; it does not need to choose the inferred role again.
- A customer display name may be a nickname or group name; a real personal name is not required.
- Participant tokens authorize only one role in one session.
- Message and appointment text is rendered with `textContent`; user text is never inserted as HTML.
- Only the latest location per role exists. It is deleted when sharing stops, expires, the parties mark “met,” or the session ends.
- The frontend contains only the Supabase publishable key. No service-role or secret key is shipped.

See `KNOWN_LIMITATIONS.md` and `TEST_PLAN.md` before staging handoff.
