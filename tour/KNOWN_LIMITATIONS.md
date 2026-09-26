# MVP V1 Known Limitations

- Free-form machine translation is not enabled. V1 translates the central standard-intent phrases in `js/i18n.js`; unmatched messages remain visible as original text with a clear label.
- QR generation and scanning use pinned browser modules from jsDelivr. Manual invite-link entry remains available if the CDN or camera API is unavailable.
- The map uses OpenStreetMap tiles through Leaflet. Turn-by-turn routing opens Google Maps in a separate tab.
- Browser Text-to-Speech voice quality and Thai voice availability depend on the device. No paid TTS service is used.
- Polling can take up to about 2.5 seconds to show remote changes.
- Flight status is intentionally hidden because no reliable server-side flight provider is configured.
- MVP has one active session per browser profile and no persistent user identity.
- Appointment reschedule, cancellation, history, route planning, accounts, teams, payments, and LINE integration are intentionally not implemented.
