# MVP V1 Known Limitations

- Free-form machine translation is not enabled. V1 translates the central Chinese/Japanese/English/Thai standard-intent phrases in `js/i18n.js`; unmatched messages remain visible as original text with a clear label.
- QR generation and scanning use pinned browser modules from jsDelivr. A visible copy/share link remains available if QR generation fails, and manual invite-link entry remains available if the scanner CDN or camera API is unavailable.
- Google Maps requires a billing-enabled, website-restricted browser key supplied through the deployment secret. Until that key is configured, or whenever Google Maps cannot load, the map automatically uses OpenStreetMap tiles through Leaflet. Turn-by-turn routing still opens Google Maps in a separate tab.
- Browser Text-to-Speech voice quality and Thai voice availability depend on the device. No paid TTS service is used.
- Polling can take up to about 2.5 seconds to show remote changes.
- Airport pickup currently supports only flights arriving at Suvarnabhumi (`BKK`). The airport is accepted from the provider result; there is no generic default airport or Chiang Mai airport workflow yet.
- Live flight status requires the server-side `AVIATIONSTACK_API_KEY`. Until it is configured, the UI clearly reports that live data is unavailable while flight entry and every pickup coordination action remain usable.
- Flight data accuracy, terminal, boarding gate, and arrival estimates depend on the upstream provider. The editable pickup point is the airport exit door for meeting the car, not the flight's boarding gate.
- MVP has one active session per browser profile and no persistent user identity.
- The customer label is only a temporary display or group name for the trip; it is not verified and does not need to be a real name.
- The selected language is remembered locally, but Customer/Driver is intentionally chosen again for every new trip. Neither is identity verification.
- The PWA caches only the same-origin app shell. Supabase actions, QR/Leaflet CDN modules, Google Maps or OpenStreetMap tiles, GPS sharing, and live updates still require internet access.
- Appointment reschedule, cancellation, history, route planning, accounts, teams, payments, and LINE integration are intentionally not implemented.
