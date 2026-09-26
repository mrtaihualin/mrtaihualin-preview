import { TOUR_CONFIG } from './config.js';

export class TourApiError extends Error {
  constructor(message, code = 'TOUR_API_ERROR', status = 0) {
    super(message);
    this.name = 'TourApiError';
    this.code = code;
    this.status = status;
  }
}

async function rpc(name, body = {}) {
  const response = await fetch(`${TOUR_CONFIG.supabaseUrl}/rest/v1/rpc/${TOUR_CONFIG.rpcPrefix}${name}`, {
    method: 'POST',
    headers: {
      apikey: TOUR_CONFIG.publishableKey,
      'Content-Type': 'application/json',
      Accept: 'application/json'
    },
    body: JSON.stringify(body),
    cache: 'no-store'
  });

  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    const rawMessage = payload?.message || payload?.details || `HTTP ${response.status}`;
    const matchedCode = String(rawMessage).match(/TOUR_[A-Z_]+/u)?.[0];
    throw new TourApiError(rawMessage, matchedCode || payload?.code || 'TOUR_API_ERROR', response.status);
  }
  if (payload?.ok === false) {
    throw new TourApiError(payload.message || payload.error || 'Request failed', payload.code || 'TOUR_API_ERROR', response.status);
  }
  return payload;
}

export const TourApi = Object.freeze({
  createSession(creatorRole, label) {
    return rpc('create_session', { p_creator_role: creatorRole, p_label: label });
  },
  previewSession(joinToken) {
    return rpc('preview_session', { p_join_token: joinToken });
  },
  confirmSession(joinToken, role) {
    return rpc('confirm_session', { p_join_token: joinToken, p_role: role });
  },
  getState(sessionId, accessToken, touch = false) {
    return rpc('get_state', {
      p_session_id: sessionId,
      p_access_token: accessToken,
      p_touch: touch
    });
  },
  sendMessage(sessionId, accessToken, body, intentKey = null) {
    return rpc('send_message', {
      p_session_id: sessionId,
      p_access_token: accessToken,
      p_body: body,
      p_intent_key: intentKey
    });
  },
  createAppointment(sessionId, accessToken, appointment) {
    return rpc('create_appointment', {
      p_session_id: sessionId,
      p_access_token: accessToken,
      p_place: appointment.place,
      p_date: appointment.date,
      p_time: appointment.time,
      p_note: appointment.note || null
    });
  },
  confirmAppointment(sessionId, accessToken, appointmentId) {
    return rpc('confirm_appointment', {
      p_session_id: sessionId,
      p_access_token: accessToken,
      p_appointment_id: appointmentId
    });
  },
  requestLocation(sessionId, accessToken) {
    return rpc('request_location', { p_session_id: sessionId, p_access_token: accessToken });
  },
  acceptLocation(sessionId, accessToken) {
    return rpc('accept_location', { p_session_id: sessionId, p_access_token: accessToken });
  },
  updateLocation(sessionId, accessToken, latitude, longitude, accuracy) {
    return rpc('update_location', {
      p_session_id: sessionId,
      p_access_token: accessToken,
      p_latitude: latitude,
      p_longitude: longitude,
      p_accuracy_m: accuracy ?? null
    });
  },
  stopLocation(sessionId, accessToken, reason = 'stopped') {
    return rpc('stop_location', {
      p_session_id: sessionId,
      p_access_token: accessToken,
      p_reason: reason
    });
  },
  endSession(sessionId, accessToken) {
    return rpc('end_session', { p_session_id: sessionId, p_access_token: accessToken });
  }
});

export function saveSession(session) {
  const safeSession = {
    sessionId: String(session.sessionId),
    accessToken: String(session.accessToken),
    role: session.role === 'driver' ? 'driver' : 'customer',
    joinToken: session.joinToken ? String(session.joinToken) : null
  };
  localStorage.setItem(TOUR_CONFIG.storageKey, JSON.stringify(safeSession));
  return safeSession;
}

export function loadSession() {
  try {
    const stored = JSON.parse(localStorage.getItem(TOUR_CONFIG.storageKey));
    if (!stored?.sessionId || !stored?.accessToken || !['customer', 'driver'].includes(stored.role)) return null;
    return stored;
  } catch {
    return null;
  }
}

export function clearSession() {
  localStorage.removeItem(TOUR_CONFIG.storageKey);
}

export function extractJoinToken(value) {
  const input = String(value || '').trim();
  if (!input) return null;
  try {
    const url = new URL(input, window.location.href);
    return url.searchParams.get('join') || null;
  } catch {
    return /^[A-Za-z0-9_-]{32,96}$/u.test(input) ? input : null;
  }
}

export function inviteUrl(joinToken) {
  const url = new URL('./', window.location.href);
  url.search = '';
  url.hash = '';
  url.searchParams.set('join', joinToken);
  return url.toString();
}
