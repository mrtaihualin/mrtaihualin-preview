# CODEX NEXT TASK — Airport Pickup MVP Polish
Date: 2026-09-30

## Read first
Repository:
`mrtaihualin/mrtaihualin-preview`

Work only inside:
`/tour/`

Read before coding:
- `tour/README.md`
- `tour/KNOWN_LIMITATIONS.md`
- `tour/TEST_PLAN.md`
- `tour/CHECKPOINT_2026-09-30.md`

Do not modify unrelated language-learning site logic.

## Goal
Take the current working Tour MVP and make the first real use case extremely easy:

**Language → Role → Create/Scan QR → Confirm customer name + vehicle plate → Airport pickup status → Ready for pickup → Driver ETA → pickup point → map if needed**

Do not add accounts, LINE, teams, payments, admin dashboard, full itinerary, or AI trip planning in this task.

---

# Priority 0 — Audit before changing code
First inspect the current /tour implementation and report:
1. current branch + commit
2. current frontend files involved in onboarding/pairing
3. current Supabase migration/RPC surface
4. whether deployed staging schema matches repository migrations
5. current QR generation/scanning failure mode
6. current language selector behavior
7. current pairing confirmation behavior
8. current map provider and flicker behavior
9. current session recovery behavior
10. current tests and failing tests

Do not rewrite blindly.
Preserve working security/session logic where possible.

---

# Priority 1 — Language selector UX

## First visit
Keep first screen as language selection.

Remember selected language on that device.

## Change language control
After language is chosen, every app screen must expose a universal language control.

Required visual:
- globe icon: 🌐
- current language label, e.g. `繁體中文`, `ไทย`, `English`, `日本語`
- chevron/dropdown cue

The control must remain understandable even if the user cannot read the current UI language.

Do not use a text-only “Change language” label in just the active language.

Changing language must:
- update current screen immediately
- keep current session/trip
- not force re-pairing
- persist on that device

Add/confirm central locale keys for:
- zh-TW
- zh-CN
- th
- en
- ja

If zh-CN is not ready for user selection yet, architecture must still support it without duplicating business logic.

---

# Priority 2 — Simplify entry screen
After language selection show:

1. Large Customer/Traveler card
2. Large Driver card
3. Clear `Scan QR / Join trip` action below

No account/login prompt.

User should understand the next action without instructions.

Mobile tap targets >= ~44px.

---

# Priority 3 — Pairing identity flow

Current required behavior:

## Customer creates
Customer enters only:
- display/group name

Create trip → show QR + invite link.

Driver scans/opens invite.

Driver must enter:
- vehicle plate

Then show confirmation:
- customer display/group name
- vehicle plate

Driver taps Confirm.
Pair trip.

## Driver creates
Driver enters only:
- vehicle plate

Create trip → show QR + invite link.

Customer scans/opens invite.

Customer must enter:
- display/group name

Then show confirmation:
- customer display/group name
- vehicle plate

Customer taps Confirm.
Pair trip.

## Confirmation
Only the scanner/non-creator needs the final Confirm action.

After confirm, both devices must show:
- customer/group name
- vehicle plate

Do not require OTP/phone/email/LINE/account.

## QR reliability
QR is core.

Fix the current QR failure if reproducible.

Requirements:
- QR generation must work on staging mobile Safari and Android Chrome
- scanning must work when camera permission is available
- invite link remains fallback
- if QR dependency fails, show explicit fallback without creating duplicate sessions
- avoid fragile CDN-only behavior if practical; prefer vendored/local QR generation/scanning dependency if that materially improves reliability

Do not declare complete without testing actual QR on physical phones.

---

# Priority 4 — Add Airport Pickup mode without bloating general trips

Do NOT convert the whole product into an airport-only app.

Add an optional airport section to a paired trip.

For this task support:
- BKK / Suvarnabhumi first

## Customer enters
- flight number
- travel/arrival date only if the flight provider requires it

## Shared airport status card
Both customer and driver see the same fields:
- flight number
- origin
- destination
- scheduled arrival
- estimated arrival
- actual arrival
- delay
- localized flight status
- terminal
- gate

Only show fields returned by provider.

All status labels must use the viewer's selected locale.

## Provider
Current README says reliable server-side flight provider is not configured.

Do NOT put a secret key in frontend.

Implement provider abstraction server-side / Edge Function or equivalent.

If there is no approved reliable provider/key available in the environment:
- build the interface + backend schema/provider interface
- keep live lookup feature visibly disabled with a clear “not configured” development state
- do not fabricate data
- report exactly what credential/provider is needed

If an existing Aviationstack test key exists only client-side/local, do not expose it in repo.

---

# Priority 5 — Airport quick status actions

Add customer quick actions to paired airport trip:

## Customer
1. `Baggage collected`
   - optional
   - one tap
   - updates shared airport state
   - driver sees a clear notification/status

2. `Ready for pickup`
   - important
   - one tap
   - prominent alert/status on driver side
   - record timestamp

Use central event/status keys, not hardcoded pair-language logic.

Suggested event keys:
- AIRPORT_BAGGAGE_COLLECTED
- AIRPORT_READY_FOR_PICKUP
- DRIVER_EN_ROUTE_PICKUP
- DRIVER_ARRIVED_PICKUP

Translate all visible wording through i18n.

---

# Priority 6 — Driver ETA

After customer marks Ready for pickup:

Driver must have a very fast control:
- preset buttons: 5 / 10 / 15 / 20 min
- optional custom minutes

One tap should publish ETA.

Customer sees:
- “Driver arriving in ~X minutes”
- last updated time

Do not attempt automatic road ETA yet.

This ETA is driver-provided.

Use central data field + locale rendering.

---

# Priority 7 — Pickup point

MVP pickup point object:
- airport
- human-readable point label
- optional note

For BKK:
- allow a suggested default pickup point
- BUT do not hardcode an unverified door as mandatory

Implementation rule:
- central config for BKK defaults
- easily editable
- both sides see same current pickup point

Who can change:
For this iteration, allow Driver to propose/set the pickup point before Ready for pickup.
Customer sees it clearly.

Do not build a complex proposal/history system yet.

If changing the pickup point after customer is Ready creates ambiguity, show an obvious “pickup point updated” status.

Before locking Door 3 as production default, STOP and ask/verify airport operational rules.

---

# Priority 8 — Map

Keep map as separate page.

When location sharing is active:
- show self marker
- show other marker
- update marker coordinates only
- no map reinitialization on GPS update
- no flicker

Preserve existing consent:
- either side requests
- other side accepts
- 20 min backend-enforced
- stop early
- Met stops immediately

Airport card should have a clear:
`Open live map`
button when useful.

Do not expose old/stale location after share expires.

---

# Priority 9 — General appointment remains tiny

Do not expand itinerary.

Keep:
- place
- date
- time
- optional note
- pending
- confirmed

No cancellation/reschedule/history in this task.

Airport pickup point/status should be separate from general appointment data where that keeps logic simpler.

---

# Priority 10 — Free-product booking teaser (UI only, minimal)

The business direction may later include direct vehicle booking.

Do NOT build booking/pricing/payment now.

If adding a CTA does not distract from MVP, add a low-priority button after/around completed trip:
- zh-TW: 車輛預約 / 預約包車 (choose natural final copy)
- th: จองรถ
- en: Book a car
- ja: 車を予約

For now it may open a simple “coming soon / contact admin” placeholder ONLY if explicitly useful.

If this creates scope creep, omit it and document as next phase.

---

# Data model additions
Prefer additive changes.

Airport state should be session-scoped.

Suggested conceptual fields/tables (adapt to existing schema):
- airport_code
- flight_number
- flight_date
- flight_status JSON / normalized fields
- baggage_collected_at
- ready_for_pickup_at
- driver_eta_minutes
- driver_eta_updated_at
- pickup_point_code/label
- pickup_point_note
- pickup_point_updated_at

Use server timestamps.

Do not store unnecessary personal data.

---

# Security/privacy
Preserve current token-gated design.

Review:
- join token invalidation after pairing
- role token authorization
- no direct anon table access
- XSS-safe rendering
- airport status mutations authorized by correct role
- customer cannot impersonate driver ETA
- driver cannot spoof customer baggage/ready status
- location remains latest-only and temporary

Run security advisor/checks if schema changes.

---

# Tests to add/update

## Language
- selected locale persists
- globe language control appears on all major screens
- change language mid-session without losing trip
- no mixed-language system labels on each device

## Pairing
- customer creates → driver enters plate → confirm
- driver creates → customer enters display name → confirm
- creator sees scanner-provided counterpart identity after pairing
- invite replay blocked
- QR fallback does not create duplicate sessions

## Airport
- add flight metadata to paired trip
- both roles see same airport state localized
- baggage action only customer role
- ready action only customer role
- ETA action only driver role
- ETA presets + custom validation
- pickup point visible to both
- pickup point update event visible

## Map
- existing consent tests still pass
- map instance is not recreated on location updates
- marker positions update
- expired location disappears

## Regression
- general chat still works
- TTS still works
- general appointment still works
- session recovery still works
- end session still works

---

# Physical-device acceptance test
Do not call complete until tested on two real phones on separate networks.

Minimum:
1. Phone A selects Traditional Chinese.
2. Phone B selects Thai.
3. Customer creates using group name.
4. Driver scans actual QR.
5. Driver enters plate and confirms.
6. Both see same name + plate.
7. Customer adds airport/flight.
8. Shared airport card appears on both.
9. Customer taps Baggage collected.
10. Driver sees update.
11. Customer taps Ready for pickup.
12. Driver sees prominent update.
13. Driver taps 10-minute ETA.
14. Customer sees ETA.
15. Both see same pickup point.
16. Open map, consent/share, verify two markers.
17. Move one phone and confirm marker moves without flicker.
18. Mark Met and verify location disappears.
19. Refresh both and confirm session recovery.

If flight provider is not configured, steps 7–8 must use “provider not configured” mode without fake status, while all non-flight airport states still work.

---

# Definition of done
Return:
- staging URL
- branch
- commit SHA
- list of changed files
- migrations/RPC changes
- test results
- physical-device test status
- QR status
- flight provider status
- known limitations
- any decision that still needs product approval

## Stop-and-ask decisions
Do NOT guess these:
- exact BKK default pickup door
- paid flight provider choice/cost
- production LINE behavior
- permanent accounts
- team/company model
- payment/pricing
- booking workflow
- admin dashboard

If one blocks implementation, stop and ask.
