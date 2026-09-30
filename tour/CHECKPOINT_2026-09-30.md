# CHECKPOINT — Tour Communication MVP
Date: 2026-09-30

## Product vision
Build the simplest possible communication layer between foreign tourists and Thai drivers so they can:
- find each other without a sign-holder/middle coordinator
- know who/which vehicle they are paired with
- share live location only when needed
- create simple meeting appointments
- later communicate naturally across languages
- eventually use the same driver flexibly across a 3–5 day trip

Long-term positioning:
**Independent travel freedom + a dedicated driver who can adapt with the trip.**

The product should feel closer to “自由行 with a car always available” than a fixed tour program.

---

## Deployment / module boundary
- Same domain/repository as the existing site
- Completely separate module under `/tour/`
- Do not depend on the language-learning product logic
- Existing staging URL:
  `https://mrtaihualin.github.io/mrtaihualin-preview/tour/`
- Production integration can happen later

---

## Current implementation found in repo
Current `/tour/` already has:
- mobile-first static frontend
- PWA install shell
- staging Supabase backend
- private tables + token-gated RPC
- language-first onboarding
- Traditional Chinese / Thai / Japanese / English UI choices
- role choice: Traveler / Driver
- both creator directions
- QR + invite-link fallback
- pairing confirmation
- temporary customer display name
- vehicle plate
- cross-device backend state
- chat
- standard-intent translations
- driver browser TTS
- simple appointment flow
- separate map page
- temporary location sharing with consent
- 20-minute location expiry
- Google Maps support when configured, Leaflet fallback
- same-device session recovery
- session expiry after seven days of inactivity
- test plan and known limitations

Known current limitations:
- free-form machine translation is not enabled
- QR modules depend on CDN, though share-link fallback exists
- Google Maps requires restricted billing-enabled browser key
- browser TTS quality varies
- polling delay is about 2.5 seconds
- flight status is hidden because there is no reliable server-side provider configured
- no persistent accounts/teams/LINE/payment/admin dashboard yet

---

# Decisions locked

## 1. Language UX
On first visit:
1. choose language
2. save chosen language on that device
3. user can change language later at any time

Language-change control is critical.
It must be recognizable regardless of current language.
Use a universal visual treatment such as:
**🌐 + current language name + chevron**
Do not make the control understandable only to someone who can read the currently selected language.

Target architecture must support:
- 繁體中文
- 简体中文
- ไทย
- English
- 日本語

V1 can expose only languages that are actually complete, but all system/status/intent phrases should use central keys.

---

## 2. First screen after language
Show two large role cards:
- Traveler / Customer
- Driver

Also provide an obvious:
- Scan QR / Join existing trip

No login wall.

---

## 3. Pairing flow
Support both creator directions.

### Customer creates
Customer enters:
- trip/customer display name only
- may be nickname or group name
- does not need to be legal/real name

System creates QR/invite.

Driver scans QR.
Before final pairing, driver enters:
- vehicle plate

Then confirmation screen shows:
- customer/group display name
- vehicle plate

Confirm → paired trip.

### Driver creates
Driver enters:
- vehicle plate

System creates QR/invite.

Customer scans QR.
Before final pairing, customer enters:
- customer/group display name

Confirmation screen shows:
- customer/group display name
- vehicle plate

Confirm → paired trip.

Goal:
Both sides know exactly “which customer + which vehicle” before entering the trip.

No OTP, phone, email, LINE, permanent account in MVP.

---

## 4. Privacy
MVP should not require personal identity.

Do not require:
- legal name
- phone number
- email
- LINE ID
- passport

Store only session/trip data needed to operate.

Future:
- customer may optionally connect LINE OA
- driver may later register name + phone + vehicle plate
- team/company membership can be added later

Those are NOT initial MVP requirements.

---

## 5. Appointments
Keep it minimal.

Appointment fields:
- place
- date
- time
- optional note

Either side can create.
Other side confirms.

No reschedule/cancel/history/full itinerary yet.

Map is a separate page.

---

## 6. Location
Either side may request sharing.
Other side must accept.

Rules:
- temporary share
- 20 minutes
- auto-expire
- stop early anytime
- new request required to extend
- “Met / found each other” stops sharing immediately

Map should show:
- my position
- other party position

Do not redraw/recreate map every GPS update.
Only move markers so the map does not flicker.

---

# Next product focus: AIRPORT PICKUP

This is now the best first concrete use case to polish because it can eliminate the sign-holder / middle coordinator.

## Airport flow target
When customer and driver are paired before arrival:

1. Customer provides flight number (+ date if required by provider)
2. Both sides see the same flight status
3. System shows scheduled / estimated / actual arrival / delay / terminal/gate when available
4. Customer can tap optional status:
   - “Baggage collected”
5. Driver receives the status
6. Customer taps important status:
   - “Ready for pickup”
7. Driver receives a prominent alert
8. Driver replies with:
   - estimated minutes to pickup
9. Both see the current pickup point
10. Customer waits at the agreed pickup point
11. Live map can be opened if they cannot find each other
12. After meeting, mark “Met” and stop location share

---

## Suvarnabhumi first
Start with BKK / Suvarnabhumi only for airport-specific UI.

Pickup-point policy is NOT fully locked yet.

Current idea:
- system can suggest a default pickup point (example discussed: Door 3)
- it must NOT be permanently hardcoded as unquestionable truth
- pickup point should be editable
- both sides should see the same confirmed pickup point

Before production, verify the actual operational/legal pickup rules for the vehicle type being served.

Do not silently assume any airport door is always valid.

---

## Flight module
Flight status is useful and should be visible to both sides.

Target fields:
- flight number
- origin
- destination
- scheduled arrival
- estimated arrival
- actual arrival
- delay
- flight status
- terminal/gate if available

All external API values must be localized to the user's selected language.

Flight provider/key must be server-side for real use.

If a reliable provider is not configured, do not fake live status.

---

## Airport quick actions
Customer side:
- Baggage collected (optional)
- Ready for pickup (important)

Driver side:
- acknowledge Ready for pickup
- enter ETA in minutes
- update pickup point if needed

Customer then sees:
- driver ETA
- plate
- pickup point
- map/open live location when needed

---

# Free vs future paid

## Free product direction
Free should remain genuinely useful:
- pair by QR/link
- airport pickup status
- simple pickup point
- driver ETA
- simple appointment
- temporary map/location
- basic trip continuity

## Future / possible paid layer
LINE Official Account integration:
- customer adds our LINE OA
- asks trip status through LINE
- receives alerts through LINE
- communicates via system without exposing driver's private LINE
- automated assistant/context
- later booking flow

Do not implement LINE in the current next task unless explicitly requested.

---

# Long-term roadmap (not current implementation)
- multi-day flexible charter
- “pick me up here”
- dynamic meeting points
- natural-language chat translation
- voice input for any language
- LINE OA
- driver accounts
- teams/fleets
- booking a car through our platform
- manual admin quote first
- automated pricing later
- modular trip builder / Lego-style itinerary
- AI + map travel-time feasibility
- recommendations
- flexible route constraints

---

# Product principle
Do not overbuild.

The near-term test is:
**Can a tourist and driver complete an airport pickup without a sign-holder or middle coordinator, with less confusion than LINE + phone calls?**

If yes, expand the same trip session into multi-day flexible transport.
