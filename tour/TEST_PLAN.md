# MVP V1 Test Plan

Use Phone A and Phone B on different networks. Use a private/incognito browser profile when repeating a creator-direction test.

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
