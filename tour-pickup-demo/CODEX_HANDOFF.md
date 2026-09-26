# CODEX_HANDOFF — Tour Communication MVP V1

## Mission
Build a clean new MVP V1 for a mobile-first tour communication system between foreign tourists and Thai drivers.

This must be a real staging system that can be opened on two separate phones and used end-to-end.

Do NOT keep patching the old prototype architecture. Use the existing prototype only as reference.

## Hard Product Rule
The first-use experience must be:

**Scan QR → Confirm → Use**

No login, OTP, email, LINE login, account, team, payment, or app download in MVP V1.

## Start Flow
Support both directions.

### A. Driver creates the trip
1. Driver enters only the vehicle plate.
2. System creates a trip/session and QR.
3. Customer scans QR.
4. Customer sees the vehicle plate.
5. Customer taps Confirm.
6. Pairing completes and the shared trip opens.

### B. Customer creates the trip
1. Customer enters only a trip display name / group name.
   - Does not need to be a real name.
   - Examples: Lin, Chen Family, Group A.
2. System creates a trip/session and QR.
3. Driver scans QR.
4. Driver sees the trip display name.
5. Driver taps Confirm.
6. Pairing completes and the shared trip opens.

The side that did not create the trip is the side that confirms.

## Privacy
MVP V1 must not require real personal identity.

Store only what the session needs:
- session id
- creator type
- trip display name OR vehicle plate
- pairing status
- chat messages
- appointments
- latest temporary location
- share/consent state
- timestamps / expiry

Do not require:
- real name
- phone
- email
- LINE ID
- passport
- permanent location history

## Languages
V1 user-facing languages:
- Customer: Traditional Chinese
- Driver: Thai

Architecture must be locale/key based from the start so these can be added later without rewriting logic:
- Traditional Chinese
- Simplified Chinese
- Thai
- English
- Japanese

Do not hardcode business logic around a language pair.

Use central keys for:
- UI labels
- system status
- standard intents
- appointment states
- flight status
- voice phrases

## Chat
Chat must work cross-device through the backend.

V1:
- Customer types Chinese → Driver sees Thai
- Driver types Thai → Customer sees Chinese

Translation can be simple in V1, but keep architecture ready for:
- intent normalization
- ambiguity confirmation
- standard human-owned phrase mappings

Do not make the interface feel like a command menu. It should feel like two humans chatting.

## Voice for Driver
Include the simplest useful driver voice mode in MVP:
- Thai text on driver side
- "Read aloud" button using browser/mobile Text-to-Speech
- Optional simple driving mode toggle if straightforward

No paid TTS is required in V1.

## Appointment
Keep MVP extremely small.

Each appointment has only:
- place
- date
- time
- optional short note

Either side can create an appointment.
The other side must Confirm it.

Only support:
- create
- pending
- confirmed

Do NOT implement reschedule, cancel, history, route planning, or full itinerary management yet.

## Map / Location
Map is a separate page/tab.

Both sides must see on the same map:
- self
- other party

Customer:
- self + driver

Driver:
- self + customer

Rules:
1. Either side can request location sharing.
2. The other side must accept.
3. Share for 20 minutes.
4. Auto-stop when time expires.
5. Either side can stop earlier.
6. Extension requires a new request.
7. "Met / found each other" stops location immediately.

Map behavior:
- create map instance once
- move markers only
- never recreate/redraw the entire map on every GPS update
- must not flicker
- provide route to the other party

Target UX should feel closer to Grab/Uber than raw coordinates.

## Backend
Use a real backend as source of truth.

Need backend support for:
- session creation
- QR/session token
- confirm pairing
- chat
- appointment
- location share request
- location share acceptance
- latest location
- location expiry
- session expiry
- end session

Do NOT use localStorage as the primary source of truth.
Do NOT use public PeerJS/P2P as the main transport.

Use secure random unguessable session tokens.

## Refresh / Reopen
If the user refreshes or reopens the same browser/device while the session is still valid, restore the active session automatically.

## Session Lifetime
Do not invent a permanent account model.
Choose a temporary session lifetime suitable for multi-day trips.
If a product decision is required on the exact expiry duration, stop and ask before locking it permanently.

## Flight Module
Flight is optional for MVP V1.

If included:
- flight number + date
- scheduled
- estimated
- landed/status
- delay
- terminal/gate when available
- render in the user's locale
- API key must stay server-side

If it cannot be made reliable quickly, hide the feature instead of leaving a half-working UI.

## UI
Mobile-first.

### Customer main page after pairing
Primary: Chat
Also show:
- latest appointment summary
- map button
- connection status

### Driver main page after pairing
Primary: Current trip + Chat
Also show:
- latest appointment summary
- map button
- voice/read-aloud control
- connection status

Rules:
- large tap targets
- no dead ends
- no unnecessary forms
- no setup wizard
- no account wall

## Explicitly Out of Scope for MVP V1
Do not add:
- Team system
- persistent driver accounts
- persistent customer accounts
- LINE integration
- email signup
- OTP
- payments
- company dashboard
- driver marketplace
- AI trip planning
- full itinerary
- reschedule/cancel appointment
- permanent location history
- marketing database

These are future scope.

## Future Architecture Considerations
Do not implement now, but do not block these future capabilities:
- LINE Official Account for customers
- Driver registration with name + phone + vehicle plate
- Team / company membership
- customer identity linking
- multilingual voice input
- Japanese / English / Simplified Chinese
- standard intent library
- human-owned translation mappings
- trip assistant
- flight automation
- company/fleet dashboard

## Staging / Deployment
Create a staging deployment that can be opened from normal mobile browsers.

Do not touch existing production.

The result must be testable on:
- Phone A on one network
- Phone B on another network

## Cross-device Acceptance Test
Do not call the task done until these pass:

1. Customer creates session → QR appears.
2. Driver scans QR → sees customer trip name → confirms.
3. Driver creates session → QR appears.
4. Customer scans QR → sees vehicle plate → confirms.
5. Both devices enter the same paired session.
6. Chat works cross-device.
7. Chinese/Thai render on correct sides.
8. Driver text-to-speech reads Thai.
9. Either side creates an appointment.
10. Other side confirms it.
11. Either side requests location sharing.
12. Other side accepts it.
13. Both maps show self + other party.
14. Markers update without flicker.
15. 20-minute timer is enforced by backend/state, not only UI.
16. Stop sharing removes the other side's location.
17. "Met" stops location immediately.
18. Refresh/reopen restores the session on the same device.
19. End session changes session state correctly.
20. No production site is modified.

## Engineering Quality
Before handoff:
- check auth/permissions/RLS
- check that session tokens cannot be guessed
- check XSS on chat rendering
- check location data exposure
- check expired sessions
- check stale location cleanup
- check mobile Safari and Android Chrome behavior
- document known limitations

## Deliverables
Return:
- staging URL
- repo/branch
- latest commit SHA
- backend schema/migrations
- test steps
- acceptance test results
- known limitations
- exact items not implemented

## Stop-and-Ask Rule
Do not invent product behavior that is not defined above.

If a decision affects:
- session lifetime
- confirmation logic
- privacy
- language behavior
- location consent
- appointment behavior
- persistent identity

STOP and ask before implementing that decision.
