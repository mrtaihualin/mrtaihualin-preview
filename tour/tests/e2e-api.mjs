import assert from 'node:assert/strict';
import { TOUR_CONFIG } from '../js/config.js';

async function rpc(name, body) {
  const response = await fetch(`${TOUR_CONFIG.supabaseUrl}/rest/v1/rpc/${TOUR_CONFIG.rpcPrefix}${name}`, {
    method: 'POST',
    headers: { apikey: TOUR_CONFIG.publishableKey, 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  const payload = await response.json().catch(() => null);
  assert.equal(response.ok, true, `${name}: ${JSON.stringify(payload)}`);
  return payload;
}

async function rpcMustFail(name, body, expectedMessage) {
  const response = await fetch(`${TOUR_CONFIG.supabaseUrl}/rest/v1/rpc/${TOUR_CONFIG.rpcPrefix}${name}`, {
    method: 'POST',
    headers: { apikey: TOUR_CONFIG.publishableKey, 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  const payload = await response.json().catch(() => null);
  assert.equal(response.ok, false, `${name} unexpectedly succeeded`);
  assert.match(payload?.message || '', new RegExp(expectedMessage));
}

async function createAndPair(creatorRole, label) {
  const otherRole = creatorRole === 'driver' ? 'customer' : 'driver';
  const created = await rpc('create_session', { p_creator_role: creatorRole, p_label: label });
  const preview = await rpc('preview_session', { p_join_token: created.joinToken });
  assert.equal(preview.creatorRole, creatorRole);
  const joined = await rpc('confirm_session', { p_join_token: created.joinToken, p_role: otherRole });
  await rpcMustFail('preview_session', { p_join_token: created.joinToken }, 'TOUR_JOIN_INVALID');
  return {
    sessionId: created.sessionId,
    [creatorRole]: created.accessToken,
    [otherRole]: joined.accessToken
  };
}

const customerFirst = await createAndPair('customer', `E2E Customer ${Date.now()}`);
const driverFirst = await createAndPair('driver', `TEST-${String(Date.now()).slice(-6)}`);

await rpcMustFail('get_state', {
  p_session_id: customerFirst.sessionId,
  p_access_token: 'invalid-token',
  p_touch: false
}, 'TOUR_ACCESS_DENIED');

await rpc('send_message', {
  p_session_id: customerFirst.sessionId,
  p_access_token: customerFirst.customer,
  p_body: '我到了',
  p_intent_key: 'arrived'
});
let state = await rpc('get_state', {
  p_session_id: customerFirst.sessionId,
  p_access_token: customerFirst.driver,
  p_touch: false
});
assert.equal(state.messages.at(-1).intentKey, 'arrived');
assert.equal(state.messages.at(-1).body, '我到了');

const appointment = await rpc('create_appointment', {
  p_session_id: customerFirst.sessionId,
  p_access_token: customerFirst.driver,
  p_place: 'สนามบินเชียงใหม่',
  p_date: '2026-10-01',
  p_time: '09:30',
  p_note: 'ประตู 3'
});
await rpcMustFail('confirm_appointment', {
  p_session_id: customerFirst.sessionId,
  p_access_token: customerFirst.driver,
  p_appointment_id: appointment.id
}, 'TOUR_CREATOR_CANNOT_CONFIRM');
await rpc('confirm_appointment', {
  p_session_id: customerFirst.sessionId,
  p_access_token: customerFirst.customer,
  p_appointment_id: appointment.id
});

await rpc('request_location', {
  p_session_id: customerFirst.sessionId,
  p_access_token: customerFirst.customer
});
await rpcMustFail('accept_location', {
  p_session_id: customerFirst.sessionId,
  p_access_token: customerFirst.customer
}, 'TOUR_REQUESTER_CANNOT_ACCEPT');
await rpc('accept_location', {
  p_session_id: customerFirst.sessionId,
  p_access_token: customerFirst.driver
});
await rpc('update_location', {
  p_session_id: customerFirst.sessionId,
  p_access_token: customerFirst.customer,
  p_latitude: 18.7883,
  p_longitude: 98.9853,
  p_accuracy_m: 10
});
await rpc('update_location', {
  p_session_id: customerFirst.sessionId,
  p_access_token: customerFirst.driver,
  p_latitude: 18.789,
  p_longitude: 98.986,
  p_accuracy_m: 12
});
state = await rpc('get_state', {
  p_session_id: customerFirst.sessionId,
  p_access_token: customerFirst.customer,
  p_touch: false
});
assert.equal(state.locationShare.status, 'active');
assert.equal(state.locations.length, 2);

await rpc('stop_location', {
  p_session_id: customerFirst.sessionId,
  p_access_token: customerFirst.driver,
  p_reason: 'met'
});
state = await rpc('get_state', {
  p_session_id: customerFirst.sessionId,
  p_access_token: customerFirst.customer,
  p_touch: false
});
assert.equal(state.locationShare.status, 'ended');
assert.equal(state.locations.length, 0);

for (const flow of [customerFirst, driverFirst]) {
  const token = flow.customer || flow.driver;
  await rpc('end_session', {
    p_session_id: flow.sessionId,
    p_access_token: token
  });
  await rpcMustFail('get_state', {
    p_session_id: flow.sessionId,
    p_access_token: token,
    p_touch: false
  }, 'TOUR_SESSION_ENDED');
}

console.log('Tour V1 API E2E PASS');
