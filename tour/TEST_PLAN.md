# MVP V1 Test Plan

Use Phone A and Phone B on different networks. Use a private/incognito browser profile when repeating a creator-direction test.

## PWA installation

1. Open `/tour/` over HTTPS and verify the install card appears when the browser makes installation available.
2. Install on Android/Chrome and verify the home-screen icon opens `/tour/` without browser chrome.
3. On iPhone/Safari use Share → Add to Home Screen and verify the icon opens in standalone mode.
4. Reopen after a refresh and verify an active session still recovers normally.
5. Temporarily disconnect the network and verify the cached start screen reopens; verify live actions clearly fail rather than showing stale backend data.

## Language and role flow

1. On a fresh browser verify the first screen offers `繁體中文`, `ภาษาไทย`, `日本語`, and `English`.
2. Choose each language in a fresh profile and verify the next role screen contains only that selected language.
3. Choose Traveler or Driver and verify the create/join screen stays in the selected language.
4. Before creating a trip, close and reopen `/tour/`; verify the remembered language opens the role screen, not the create screen.
5. Choose a role, tap Back, and verify the role screen stays in the remembered language.
6. From the role screen tap Change language, choose another language, and verify the role and create screens switch fully to it.
7. Create a trip and open its QR on a fresh second phone; verify that phone chooses its own language and is assigned the opposite role automatically.
8. Confirm, refresh, and verify the selected language and inferred role return without another question.
9. End the trip and verify each phone returns to the role screen in its remembered language.
10. On the scanning phone, first leave an old pending or expired trip in the browser, then scan a new QR; verify the new trip confirmation opens instead of the create-trip screen.
11. From the confirmation screen tap Back; verify no pairing occurs, the creator remains waiting, and the scanner's prior session is restored when one existed.
12. From the creator QR screen tap Back to edit; verify the pending session is ended, the prior name/plate is preserved in the form, and the old QR can no longer be previewed.
13. Repeat step 12 with the browser Back control on mobile Safari/Chrome and verify it follows the same cancellation path instead of returning to the QR screen.
14. Pair just before the creator taps Back and verify the cancellation endpoint refuses to end the newly paired trip.

## Customer creates

1. On Phone A choose Customer, enter a display name, and create the trip.
2. Confirm a QR appears.
3. On Phone B scan it, verify the display name, enter the Driver vehicle plate, and confirm.
4. Verify both phones open the same paired trip and both the customer display name and vehicle plate are shown.

## Driver creates

1. End the first trip.
2. On Phone B choose Driver, enter only a vehicle plate, and create the trip.
3. On Phone A scan it, verify the plate, enter the Customer display name or group name, and confirm.
4. Verify both phones open the same paired trip and both the customer display name and vehicle plate are shown.
5. Disable the QR module request in browser developer tools for a disposable trip; verify the creator still sees and can copy/share the invite link.

## Chat and voice

1. Select Traditional Chinese on one phone and Thai on the other; verify standard phrases appear in each phone's selected language.
2. Repeat with Japanese and English, verifying each phone keeps its own selected language regardless of Traveler/Driver role.
3. Send text containing `<img src=x onerror=alert(1)>`; verify it appears as text and no script runs.
4. On Driver tap the read-aloud button and verify Thai speech.
5. Optionally enable driving mode and verify a new translated Customer phrase is read once.

## Appointment

1. Create an appointment from each side in separate runs.
2. Verify place, date, time, optional note, and Pending state.
3. Verify only the other side can confirm.
4. Verify both sides show Confirmed.

## Suvarnabhumi airport pickup

1. Pair a Traveler and Driver, then verify only the Traveler sees the flight-entry form.
2. Enter a flight number and verify both phones show the same normalized flight number and pickup panel.
3. Without `AVIATIONSTACK_API_KEY`, verify the UI says live flight data is not configured and does not invent an airport, time, terminal, gate, or status.
4. With the secret configured, enter a real flight arriving at `BKK`; verify airport, route, scheduled/estimated/actual arrival, delay, terminal, and flight gate appear only when supplied by the provider.
5. Enter a flight whose destination is not `BKK`; verify it is rejected as unsupported and the app does not relabel it as Suvarnabhumi.
6. On Traveler, tap **Baggage collected** and verify it is optional. In a separate run, skip it and continue successfully.
7. Verify the Driver ETA controls are unavailable until Traveler taps **At the pickup exit**.
8. Tap **At the pickup exit** and verify both phones instruct the Traveler to be ready by the roadside at the pickup point.
9. On Driver, choose 10 minutes and verify both phones show the approximate 10-minute ETA.
10. Change the pickup point from Exit Door 3 to another exit door, add an optional note, and verify both phones update.
11. On Driver, tap **Arrived — waiting** and verify both phones show that the Driver has arrived and is waiting.
12. Repeat the workflow while the tester is physically in Chiang Mai; verify the workflow still operates because the tester's current GPS location does not select the airport.
13. Verify the separate live-map link still opens and does not silently grant location permission.

## Location

1. With `GOOGLE_MAPS_API_KEY` configured, inspect the map page and verify `document.documentElement.dataset.mapProvider` is `google`; temporarily remove the deployment key in an isolated preview and verify it becomes `leaflet` without breaking the trip flow.
2. Request location from either phone and verify the other phone must accept.
3. Accept and grant browser location permission on both phones.
4. Verify one stable map shows self and other-party markers.
5. Move one phone and verify its marker moves without recreating/flickering the map.
6. Verify the route button opens directions to the other party.
7. Stop sharing and verify both sides lose the other-party marker.
8. Start a new request, accept, tap “Met,” and verify sharing stops immediately.
9. Verify an extension cannot occur without a new request.
10. Backend test: set a disposable active share to expired in staging, call state, and verify both latest-location rows are removed.

## Recovery and closure

1. Refresh each paired phone and verify the session restores without login.
2. Close and reopen the same browser before expiry and verify restoration.
3. End the session from either side and verify both sides become unusable.
4. Verify the production Supabase project and production website have no changes.
