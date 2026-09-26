# IMPLEMENTATION_CHECKLIST — Tour Communication MVP V1

## Foundation
- [ ] Create clean MVP V1 structure
- [ ] Mobile-first layout
- [ ] Separate staging deployment
- [ ] Backend is source of truth
- [ ] Temporary session recovery on same device

## Pairing
- [ ] Driver creates with vehicle plate
- [ ] Customer creates with trip display name
- [ ] QR generation
- [ ] QR scanning
- [ ] Non-creator confirmation
- [ ] Secure unguessable tokens
- [ ] Pairing state persisted

## Chat
- [ ] Cross-device realtime/polling chat
- [ ] Customer Traditional Chinese UI
- [ ] Driver Thai UI
- [ ] Translation layer
- [ ] Escape/sanitize chat content
- [ ] Driver read-aloud via browser TTS

## Appointment
- [ ] Place
- [ ] Date
- [ ] Time
- [ ] Optional note
- [ ] Pending
- [ ] Confirmed
- [ ] Both sides can create
- [ ] Other side confirms

## Location
- [ ] Separate map page
- [ ] Self marker
- [ ] Other-party marker
- [ ] Request share
- [ ] Accept share
- [ ] 20-minute backend-enforced expiry
- [ ] Stop early
- [ ] New request required for extension
- [ ] "Met" stops immediately
- [ ] No map flicker
- [ ] Route to other party
- [ ] No permanent location history

## Internationalization
- [ ] Central translation keys
- [ ] Central status keys
- [ ] Central intent keys
- [ ] Architecture ready for zh-TW / zh-CN / th / en / ja
- [ ] V1 exposes zh-TW + th only

## Flight
- [ ] Optional module only
- [ ] Server-side API key if enabled
- [ ] Localized status text
- [ ] Hide if unreliable

## Security / Privacy
- [ ] RLS / permissions reviewed
- [ ] No real identity required
- [ ] No phone/email/LINE required
- [ ] Session expiry
- [ ] Location exposure reviewed
- [ ] Chat XSS reviewed
- [ ] Tokens unguessable

## Cross-device Test
- [ ] iPhone / Android or two separate phones
- [ ] Different networks
- [ ] Both creator directions tested
- [ ] QR confirm tested
- [ ] Chat tested
- [ ] Appointment tested
- [ ] Location tested
- [ ] Map flicker tested
- [ ] Refresh/reopen tested
- [ ] End session tested

## Final Handoff
- [ ] Staging URL
- [ ] Repo/branch
- [ ] Commit SHA
- [ ] Schema/migrations
- [ ] Test evidence
- [ ] Known limitations
- [ ] Not-implemented list
