# MVP V1 Test Plan

Use Phone A and Phone B on different networks. Use a private/incognito browser profile when repeating a creator-direction test.

## PWA installation

1. Open `/tour/` over HTTPS and verify the install card appears when the browser makes installation available.
2. Install on Android/Chrome and verify the home-screen icon opens `/tour/` without browser chrome.
3. On iPhone/Safari use Share → Add to Home Screen and verify the icon opens in standalone mode.
4. Reopen after a refresh and verify an active session still recovers normally.
5. Temporarily disconnect the network and verify the cached start screen reopens; verify live actions clearly fail rather than showing stale backend data.

## Language and remembered role

1. On a fresh browser verify the first screen offers `繁體中文`, `ภาษาไทย`, `日本語`, and `English`.
2. Choose each language in a fresh profile and verify the next role screen contains only that selected language.
3. Choose Traveler or Driver and verify the create/join screen stays in the selected language.
4. Close and reopen `/tour/`; verify the remembered role opens directly in the same language.
5. Tap Change role and verify the role screen stays in the same language.
6. Tap Change language, choose another language, and verify the role and create/join screens switch fully to it.
7. Create a trip and open its QR on a fresh second phone; verify that phone chooses its own language and is assigned the opposite role automatically.
8. Confirm, refresh, and verify the selected language and inferred role return without another question.
9. End the trip and verify each phone returns to its own remembered role-and-language page.

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

## Location

1. Request location from either phone and verify the other phone must accept.
2. Accept and grant browser location permission on both phones.
3. Verify one stable map shows self and other-party markers.
4. Move one phone and verify its marker moves without recreating/flickering the map.
5. Verify the route button opens directions to the other party.
6. Stop sharing and verify both sides lose the other-party marker.
7. Start a new request, accept, tap “Met,” and verify sharing stops immediately.
8. Verify an extension cannot occur without a new request.
9. Backend test: set a disposable active share to expired in staging, call state, and verify both latest-location rows are removed.

## Recovery and closure

1. Refresh each paired phone and verify the session restores without login.
2. Close and reopen the same browser before expiry and verify restoration.
3. End the session from either side and verify both sides become unusable.
4. Verify the production Supabase project and production website have no changes.
