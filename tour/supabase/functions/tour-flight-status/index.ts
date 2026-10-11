import 'jsr:@supabase/functions-js/edge-runtime.d.ts';

const allowedOrigins = new Set([
  'https://mrtaihualin.github.io',
  'http://localhost:8080',
  'http://127.0.0.1:8080'
]);

function corsHeaders(origin: string | null) {
  const allowedOrigin = origin && allowedOrigins.has(origin) ? origin : 'https://mrtaihualin.github.io';
  return {
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Headers': 'content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Vary': 'Origin'
  };
}

function json(origin: string | null, status: number, body: Record<string, unknown>) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders(origin), 'Content-Type': 'application/json; charset=utf-8' }
  });
}

function firstConfiguredKey(name: string, legacyName: string) {
  const collection = Deno.env.get(name);
  if (collection) {
    try {
      const keys = JSON.parse(collection);
      return keys.default || Object.values(keys).find((value) => typeof value === 'string') || null;
    } catch {
      // Fall through to the legacy environment variable during key migration.
    }
  }
  return Deno.env.get(legacyName) || null;
}

function compactFlightNumber(value: unknown) {
  return String(value || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
}

function utcTimestamp(value: unknown) {
  if (!value) return null;
  const normalized = String(value).trim().replace(' ', 'T');
  const parsed = new Date(/[zZ]|[+-]\d\d:?\d\d$/u.test(normalized) ? normalized : `${normalized}Z`);
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
}

function normalizeStatus(value: unknown) {
  const status = String(value || '').toLowerCase();
  if (status === 'en-route' || status === 'en_route') return 'en_route';
  if (['scheduled', 'active', 'landed', 'cancelled', 'diverted'].includes(status)) return status;
  return 'unknown';
}

async function rpc(
  supabaseUrl: string,
  apiKey: string,
  name: string,
  body: Record<string, unknown>
) {
  const response = await fetch(`${supabaseUrl}/rest/v1/rpc/${name}`, {
    method: 'POST',
    headers: { apikey: apiKey, 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify(body)
  });
  const payload = await response.json().catch(() => null);
  if (!response.ok) throw new Error(payload?.message || `RPC ${name} failed`);
  return payload;
}

Deno.serve(async (request: Request) => {
  const origin = request.headers.get('origin');
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders(origin) });
  if (request.method !== 'POST') return json(origin, 405, { ok: false, code: 'METHOD_NOT_ALLOWED' });
  if (origin && !allowedOrigins.has(origin)) return json(origin, 403, { ok: false, code: 'ORIGIN_NOT_ALLOWED' });

  const body = await request.json().catch(() => null);
  const sessionId = String(body?.sessionId || '');
  const accessToken = String(body?.accessToken || '');
  const flightNumber = compactFlightNumber(body?.flightNumber);
  if (!/^[0-9a-f-]{36}$/iu.test(sessionId) || accessToken.length < 32 || !/^[A-Z0-9]{2,12}$/u.test(flightNumber)) {
    return json(origin, 400, { ok: false, code: 'TOUR_FLIGHT_REQUEST_INVALID' });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const publishableKey = firstConfiguredKey('SUPABASE_PUBLISHABLE_KEYS', 'SUPABASE_ANON_KEY');
  const secretKey = firstConfiguredKey('SUPABASE_SECRET_KEYS', 'SUPABASE_SERVICE_ROLE_KEY');
  if (!supabaseUrl || !publishableKey || !secretKey) {
    return json(origin, 503, { ok: false, code: 'TOUR_FLIGHT_SERVER_NOT_CONFIGURED' });
  }

  try {
    await rpc(supabaseUrl, publishableKey, 'tour_v1_get_state', {
      p_session_id: sessionId,
      p_access_token: accessToken,
      p_touch: false
    });
  } catch {
    return json(origin, 403, { ok: false, code: 'TOUR_ACCESS_DENIED' });
  }

  const providerKey = Deno.env.get('AIRLABS_API_KEY');
  if (!providerKey) {
    return json(origin, 503, { ok: false, code: 'TOUR_FLIGHT_PROVIDER_NOT_CONFIGURED' });
  }

  const providerUrl = new URL('https://airlabs.co/api/v9/flight');
  providerUrl.searchParams.set('flight_iata', flightNumber);
  providerUrl.searchParams.set('api_key', providerKey);

  let providerResponse: Response;
  try {
    providerResponse = await fetch(providerUrl, { headers: { Accept: 'application/json' } });
  } catch {
    return json(origin, 502, { ok: false, code: 'TOUR_FLIGHT_PROVIDER_UNAVAILABLE' });
  }
  const providerPayload = await providerResponse.json().catch(() => null);
  if (!providerResponse.ok || providerPayload?.error) {
    return json(origin, 502, { ok: false, code: 'TOUR_FLIGHT_PROVIDER_UNAVAILABLE' });
  }

  const flight = providerPayload?.response || providerPayload;
  if (!flight?.flight_iata) return json(origin, 404, { ok: false, code: 'TOUR_FLIGHT_NOT_FOUND' });
  if (String(flight.arr_iata || '').toUpperCase() !== 'BKK') {
    return json(origin, 422, {
      ok: false,
      code: 'TOUR_FLIGHT_DESTINATION_UNSUPPORTED',
      destinationCode: flight.arr_iata || null
    });
  }

  const normalized = {
    flightNumber: compactFlightNumber(flight.flight_iata || flightNumber),
    airportCode: 'BKK',
    originCode: String(flight.dep_iata || '').toUpperCase() || null,
    destinationCode: 'BKK',
    scheduledArrival: utcTimestamp(flight.arr_time_utc),
    estimatedArrival: utcTimestamp(flight.arr_estimated_utc),
    actualArrival: utcTimestamp(flight.arr_actual_utc),
    delayMinutes: Number.isFinite(Number(flight.arr_delayed)) ? Math.max(0, Math.round(Number(flight.arr_delayed))) : null,
    flightStatus: normalizeStatus(flight.status),
    arrivalTerminal: flight.arr_terminal || null,
    arrivalGate: flight.arr_gate || null
  };

  try {
    await rpc(supabaseUrl, secretKey, 'tour_v1_store_flight_status', {
      p_session_id: sessionId,
      p_access_token: accessToken,
      p_flight_number: flightNumber,
      p_airport_code: normalized.airportCode,
      p_origin_code: normalized.originCode,
      p_destination_code: normalized.destinationCode,
      p_scheduled_arrival: normalized.scheduledArrival,
      p_estimated_arrival: normalized.estimatedArrival,
      p_actual_arrival: normalized.actualArrival,
      p_delay_minutes: normalized.delayMinutes,
      p_flight_status: normalized.flightStatus,
      p_arrival_terminal: normalized.arrivalTerminal,
      p_arrival_gate: normalized.arrivalGate,
      p_provider_name: 'airlabs',
      p_provider_state: 'available'
    });
  } catch {
    return json(origin, 500, { ok: false, code: 'TOUR_FLIGHT_SAVE_FAILED' });
  }

  return json(origin, 200, { ok: true, flight: normalized });
});
