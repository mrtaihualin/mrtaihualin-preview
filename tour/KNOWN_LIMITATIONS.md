# MVP V1 Known Limitations

- Free-form machine translation is not enabled. V1 translates the central Chinese/Japanese/English/Thai standard-intent phrases in `js/i18n.js`; unmatched messages remain visible as original text with a clear label.
- QR generation and scanning use pinned browser modules from jsDelivr. Manual invite-link entry remains available if the CDN or camera API is unavailable.
- Google Maps requires a billing-enabled, website-restricted browser key supplied through the deployment secret. Until that key is configured, or whenever Google Maps cannot load, the map automatically uses OpenStreetMap tiles through Leaflet. Turn-by-turn routing still opens Google Maps in a separate tab.
- Browser Text-to-Speech voice quality and Thai voice availability depend on the device. No paid TTS service is used.
- Polling can take up to about 2.5 seconds to show remote changes.
- Flight status is intentionally hidden because no reliable server-side flight provider is configured.
- MVP has one active session per browser profile and no persistent user identity.
- The customer label is only a temporary display or group name for the trip; it is not verified and does not need to be a real name.
- The remembered Customer/Driver role and selected language are local to one browser profile. They are convenience preferences, not identity verification, and can be changed from the role page.
- The PWA caches only the same-origin app shell. Supabase actions, QR/Leaflet CDN modules, Google Maps or OpenStreetMap tiles, GPS sharing, and live updates still require internet access.
- Appointment reschedule, cancellation, history, route planning, accounts, teams, payments, and LINE integration are intentionally not implemented.
