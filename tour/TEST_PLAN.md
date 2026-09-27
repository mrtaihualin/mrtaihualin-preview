# MVP V1 Test Plan

Use Phone A and Phone B on different networks. Use a private/incognito browser profile when repeating a creator-direction test.

## PWA installation

1. Open `/tour/` over HTTPS and verify the install card appears when the browser makes installation available.
2. Install on Android/Chrome and verify the home-screen icon opens `/tour/` without browser chrome.
3. On iPhone/Safari use Share → Add to Home Screen and verify the icon opens in standalone mode.
4. Reopen after a refresh and verify an active session still recovers normally.
5. Temporarily disconnect the network and verify the cached start screen reopens; verify live actions clearly fail rather than showing stale backend data.

## Remembered role

1. On a fresh browser choose Chinese Customer once and verify the Traditional Chinese Customer create page opens.
2. Close and reopen `/tour/`; verify only that Customer create/join page appears and the other choices are not shown.
3. Tap Change role, choose Japanese Customer, close and reopen; verify the Customer create/join page reopens in Japanese.
4. Tap Change role, choose English Customer, close and reopen; verify the Customer create/join page reopens in English.
5. Tap Change role, choose Driver, close and reopen; verify only the Driver create/join page appears in Thai.
6. Create a trip as Driver and open its QR on a fresh second phone; verify the second phone is assigned Customer and asked only `繁體中文`, `日本語`, or `English`.
7. Choose English, confirm, refresh, and verify the English trip returns without another language question.
8. End the trip and verify each phone returns to its own remembered role-and-language page.

## Customer creates

1. On Phone A choose Customer, enter a display name, and create the trip.
2. Confirm a QR appears.
3. On Phone B scan it, verify the display name, and confirm as Driver.
4. Verify both phones open the same paired trip.

## Driver creates

1. End the first trip.
2. On Phone B choose Driver, enter only a vehicle plate, and create the trip.
3. On Phone A scan it, verify the plate, and confirm as Customer.
4. Verify both phones open the same paired trip.

## Chat and voice

1. Send a Chinese standard phrase from Customer and verify Driver sees Thai.
2. Send a Thai standard phrase from Driver and verify Customer sees Traditional Chinese.
3. Repeat with a Japanese Customer: send a Japanese standard phrase and verify Driver sees Thai; send Thai and verify Customer sees Japanese.
4. Repeat with an English Customer: send an English standard phrase and verify Driver sees Thai; send Thai and verify Customer sees English.
5. Send text containing `<img src=x onerror=alert(1)>`; verify it appears as text and no script runs.
6. On Driver tap the read-aloud button and verify Thai speech.
7. Optionally enable driving mode and verify a new translated Customer phrase is read once.

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
