# Tour Communication MVP V1

Standalone mobile-first module for temporary communication between a foreign tourist and a Thai driver.

## Runtime

- Frontend: static HTML/CSS/ES modules under `/tour/`
- Staging backend: Supabase project `mrtaihualin-STAGING` (`xufxvwcelbovzsxywawg`)
- Data access: token-gated Postgres RPC functions; underlying tables are private
- Transport: 2.5-second polling (no P2P and no localStorage data cache)
- Session recovery: localStorage keeps only the session id, participant role, and unguessable participant token
- Session lifetime: expires after seven days without explicit foreground use or a meaningful write
- Location consent: one request, one acceptance, exactly 20 minutes; a new request is required to extend

No code or runtime logic is imported from the existing language-learning website. The only shared infrastructure is the existing staging Supabase project and GitHub Pages preview host.

## Files

- `index.html` — create, scan, confirm, chat, voice, and appointment UI
- `map.html` — separate two-party live map
- `js/api.js` — isolated backend RPC client and session-token recovery
- `js/i18n.js` — locale keys, status keys, and standard intent translations
- `js/app.js` — pairing/chat/appointment flow
- `js/map.js` — consent, GPS updates, stable markers, and routing
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

## Tests

```sh
node --test tour/tests/contract.test.mjs
node tour/tests/e2e-api.mjs
```

The API test creates disposable sessions, exercises both creator directions, and ends them. Physical two-phone validation remains required for camera, mobile browser TTS, GPS quality, map behavior, and separate-network behavior.

## Privacy and security notes

- No real name, phone, email, LINE ID, passport, login, or account is required.
- QR join tokens stop working immediately after pairing.
- Participant tokens authorize only one role in one session.
- Message and appointment text is rendered with `textContent`; user text is never inserted as HTML.
- Only the latest location per role exists. It is deleted when sharing stops, expires, the parties mark “met,” or the session ends.
- The frontend contains only the Supabase publishable key. No service-role or secret key is shipped.

See `KNOWN_LIMITATIONS.md` and `TEST_PLAN.md` before staging handoff.
