-- Tour airport pickup state for the existing token-gated trip session.
-- External flight data is written only by the server-side Edge Function.

create table tour_private.airport_pickups (
  session_id uuid primary key references tour_private.sessions(id) on delete cascade,
  flight_number text not null check (flight_number ~ '^[A-Z0-9]{2,12}$'),
  flight_date date,
  airport_code text check (airport_code is null or airport_code = 'BKK'),
  origin_code text,
  destination_code text,
  scheduled_arrival timestamptz,
  estimated_arrival timestamptz,
  actual_arrival timestamptz,
  delay_minutes integer check (delay_minutes is null or delay_minutes between 0 and 2880),
  flight_status text check (
    flight_status is null or flight_status in (
      'scheduled', 'active', 'en_route', 'landed', 'cancelled', 'diverted', 'unknown'
    )
  ),
  arrival_terminal text,
  arrival_gate text,
  provider_name text,
  provider_state text not null default 'not_configured' check (
    provider_state in ('not_configured', 'available', 'not_found', 'error')
  ),
  provider_checked_at timestamptz,
  baggage_collected_at timestamptz,
  ready_for_pickup_at timestamptz,
  driver_eta_minutes integer check (driver_eta_minutes is null or driver_eta_minutes between 1 and 180),
  driver_eta_updated_at timestamptz,
  driver_en_route_at timestamptz,
  driver_arrived_at timestamptz,
  pickup_point_code text,
  pickup_point_label text check (pickup_point_label is null or char_length(pickup_point_label) between 1 and 120),
  pickup_point_note text check (pickup_point_note is null or char_length(pickup_point_note) <= 280),
  pickup_point_updated_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table tour_private.airport_pickups enable row level security;
revoke all on table tour_private.airport_pickups from public, anon, authenticated;

create function public.tour_v1_setup_airport_pickup(
  p_session_id uuid,
  p_access_token text,
  p_flight_number text,
  p_flight_date date default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_role text;
  v_flight_number text := upper(regexp_replace(coalesce(p_flight_number, ''), '[^A-Za-z0-9]', '', 'g'));
begin
  v_role := tour_private.authorize_participant(p_session_id, p_access_token);
  perform tour_private.assert_usable_session(p_session_id, true);
  if v_role <> 'customer' then
    raise exception 'TOUR_AIRPORT_CUSTOMER_ONLY' using errcode = 'P0001';
  end if;
  if v_flight_number !~ '^[A-Z0-9]{2,12}$' then
    raise exception 'TOUR_FLIGHT_NUMBER_INVALID' using errcode = 'P0001';
  end if;

  insert into tour_private.airport_pickups (
    session_id, flight_number, flight_date, pickup_point_code, pickup_point_updated_at
  ) values (
    p_session_id, v_flight_number, p_flight_date, 'BKK_EXIT_DOOR_3', now()
  ) on conflict (session_id) do update set
    flight_number = excluded.flight_number,
    flight_date = excluded.flight_date,
    airport_code = null,
    origin_code = null,
    destination_code = null,
    scheduled_arrival = null,
    estimated_arrival = null,
    actual_arrival = null,
    delay_minutes = null,
    flight_status = null,
    arrival_terminal = null,
    arrival_gate = null,
    provider_name = null,
    provider_state = 'not_configured',
    provider_checked_at = null,
    baggage_collected_at = null,
    ready_for_pickup_at = null,
    driver_eta_minutes = null,
    driver_eta_updated_at = null,
    driver_en_route_at = null,
    driver_arrived_at = null,
    updated_at = now();

  update tour_private.sessions
  set last_active_at = now(), expires_at = now() + interval '7 days'
  where id = p_session_id;
  return jsonb_build_object('ok', true, 'flightNumber', v_flight_number);
end;
$$;

create function public.tour_v1_get_airport_pickup(
  p_session_id uuid,
  p_access_token text
)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_pickup tour_private.airport_pickups;
begin
  perform tour_private.authorize_participant(p_session_id, p_access_token);
  perform tour_private.assert_usable_session(p_session_id, true);
  select * into v_pickup from tour_private.airport_pickups where session_id = p_session_id;
  if v_pickup.session_id is null then
    return null;
  end if;
  return jsonb_build_object(
    'flightNumber', v_pickup.flight_number,
    'flightDate', v_pickup.flight_date,
    'airportCode', v_pickup.airport_code,
    'originCode', v_pickup.origin_code,
    'destinationCode', v_pickup.destination_code,
    'scheduledArrival', v_pickup.scheduled_arrival,
    'estimatedArrival', v_pickup.estimated_arrival,
    'actualArrival', v_pickup.actual_arrival,
    'delayMinutes', v_pickup.delay_minutes,
    'flightStatus', v_pickup.flight_status,
    'arrivalTerminal', v_pickup.arrival_terminal,
    'arrivalGate', v_pickup.arrival_gate,
    'providerName', v_pickup.provider_name,
    'providerState', v_pickup.provider_state,
    'providerCheckedAt', v_pickup.provider_checked_at,
    'baggageCollectedAt', v_pickup.baggage_collected_at,
    'readyForPickupAt', v_pickup.ready_for_pickup_at,
    'driverEtaMinutes', v_pickup.driver_eta_minutes,
    'driverEtaUpdatedAt', v_pickup.driver_eta_updated_at,
    'driverEnRouteAt', v_pickup.driver_en_route_at,
    'driverArrivedAt', v_pickup.driver_arrived_at,
    'pickupPointCode', v_pickup.pickup_point_code,
    'pickupPointLabel', v_pickup.pickup_point_label,
    'pickupPointNote', v_pickup.pickup_point_note,
    'pickupPointUpdatedAt', v_pickup.pickup_point_updated_at,
    'updatedAt', v_pickup.updated_at
  );
end;
$$;

create function public.tour_v1_set_airport_action(
  p_session_id uuid,
  p_access_token text,
  p_action text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_role text;
begin
  v_role := tour_private.authorize_participant(p_session_id, p_access_token);
  perform tour_private.assert_usable_session(p_session_id, true);
  if not exists (select 1 from tour_private.airport_pickups where session_id = p_session_id) then
    raise exception 'TOUR_AIRPORT_NOT_CONFIGURED' using errcode = 'P0001';
  end if;

  if p_action = 'AIRPORT_BAGGAGE_COLLECTED' then
    if v_role <> 'customer' then
      raise exception 'TOUR_AIRPORT_CUSTOMER_ONLY' using errcode = 'P0001';
    end if;
    update tour_private.airport_pickups
    set baggage_collected_at = coalesce(baggage_collected_at, now()), updated_at = now()
    where session_id = p_session_id;
  elsif p_action = 'AIRPORT_READY_FOR_PICKUP' then
    if v_role <> 'customer' then
      raise exception 'TOUR_AIRPORT_CUSTOMER_ONLY' using errcode = 'P0001';
    end if;
    update tour_private.airport_pickups
    set ready_for_pickup_at = coalesce(ready_for_pickup_at, now()), updated_at = now()
    where session_id = p_session_id;
  elsif p_action = 'DRIVER_EN_ROUTE_PICKUP' then
    if v_role <> 'driver' then
      raise exception 'TOUR_AIRPORT_DRIVER_ONLY' using errcode = 'P0001';
    end if;
    update tour_private.airport_pickups
    set driver_en_route_at = coalesce(driver_en_route_at, now()), updated_at = now()
    where session_id = p_session_id and ready_for_pickup_at is not null;
    if not found then
      raise exception 'TOUR_AIRPORT_NOT_READY' using errcode = 'P0001';
    end if;
  elsif p_action = 'DRIVER_ARRIVED_PICKUP' then
    if v_role <> 'driver' then
      raise exception 'TOUR_AIRPORT_DRIVER_ONLY' using errcode = 'P0001';
    end if;
    update tour_private.airport_pickups
    set driver_arrived_at = coalesce(driver_arrived_at, now()), updated_at = now()
    where session_id = p_session_id and ready_for_pickup_at is not null;
    if not found then
      raise exception 'TOUR_AIRPORT_NOT_READY' using errcode = 'P0001';
    end if;
  else
    raise exception 'TOUR_AIRPORT_ACTION_INVALID' using errcode = 'P0001';
  end if;

  update tour_private.sessions
  set last_active_at = now(), expires_at = now() + interval '7 days'
  where id = p_session_id;
  return jsonb_build_object('ok', true, 'action', p_action, 'at', now());
end;
$$;

create function public.tour_v1_set_driver_eta(
  p_session_id uuid,
  p_access_token text,
  p_minutes integer
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_role text;
begin
  v_role := tour_private.authorize_participant(p_session_id, p_access_token);
  perform tour_private.assert_usable_session(p_session_id, true);
  if v_role <> 'driver' then
    raise exception 'TOUR_AIRPORT_DRIVER_ONLY' using errcode = 'P0001';
  end if;
  if p_minutes not between 1 and 180 then
    raise exception 'TOUR_DRIVER_ETA_INVALID' using errcode = 'P0001';
  end if;

  update tour_private.airport_pickups
  set driver_eta_minutes = p_minutes,
      driver_eta_updated_at = now(),
      driver_en_route_at = coalesce(driver_en_route_at, now()),
      updated_at = now()
  where session_id = p_session_id and ready_for_pickup_at is not null;
  if not found then
    raise exception 'TOUR_AIRPORT_NOT_READY' using errcode = 'P0001';
  end if;
  return jsonb_build_object('ok', true, 'minutes', p_minutes, 'updatedAt', now());
end;
$$;

create function public.tour_v1_update_pickup_point(
  p_session_id uuid,
  p_access_token text,
  p_label text,
  p_note text default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_role text;
  v_label text := nullif(btrim(p_label), '');
  v_note text := nullif(btrim(p_note), '');
begin
  v_role := tour_private.authorize_participant(p_session_id, p_access_token);
  perform tour_private.assert_usable_session(p_session_id, true);
  if v_role <> 'driver' then
    raise exception 'TOUR_AIRPORT_DRIVER_ONLY' using errcode = 'P0001';
  end if;
  if v_label is null or char_length(v_label) > 120 or (v_note is not null and char_length(v_note) > 280) then
    raise exception 'TOUR_PICKUP_POINT_INVALID' using errcode = 'P0001';
  end if;

  update tour_private.airport_pickups
  set pickup_point_code = null,
      pickup_point_label = v_label,
      pickup_point_note = v_note,
      pickup_point_updated_at = now(),
      updated_at = now()
  where session_id = p_session_id;
  if not found then
    raise exception 'TOUR_AIRPORT_NOT_CONFIGURED' using errcode = 'P0001';
  end if;
  return jsonb_build_object('ok', true, 'label', v_label, 'updatedAt', now());
end;
$$;

create function public.tour_v1_store_flight_status(
  p_session_id uuid,
  p_access_token text,
  p_flight_number text,
  p_airport_code text,
  p_origin_code text,
  p_destination_code text,
  p_scheduled_arrival timestamptz,
  p_estimated_arrival timestamptz,
  p_actual_arrival timestamptz,
  p_delay_minutes integer,
  p_flight_status text,
  p_arrival_terminal text,
  p_arrival_gate text,
  p_provider_name text,
  p_provider_state text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_flight_number text := upper(regexp_replace(coalesce(p_flight_number, ''), '[^A-Za-z0-9]', '', 'g'));
begin
  perform tour_private.authorize_participant(p_session_id, p_access_token);
  perform tour_private.assert_usable_session(p_session_id, true);
  if p_airport_code <> 'BKK' or p_destination_code <> 'BKK' then
    raise exception 'TOUR_FLIGHT_DESTINATION_UNSUPPORTED' using errcode = 'P0001';
  end if;
  if p_provider_state not in ('available', 'not_found', 'error') then
    raise exception 'TOUR_FLIGHT_PROVIDER_STATE_INVALID' using errcode = 'P0001';
  end if;

  update tour_private.airport_pickups
  set airport_code = p_airport_code,
      origin_code = nullif(btrim(p_origin_code), ''),
      destination_code = p_destination_code,
      scheduled_arrival = p_scheduled_arrival,
      estimated_arrival = p_estimated_arrival,
      actual_arrival = p_actual_arrival,
      delay_minutes = p_delay_minutes,
      flight_status = p_flight_status,
      arrival_terminal = nullif(btrim(p_arrival_terminal), ''),
      arrival_gate = nullif(btrim(p_arrival_gate), ''),
      provider_name = nullif(btrim(p_provider_name), ''),
      provider_state = p_provider_state,
      provider_checked_at = now(),
      updated_at = now()
  where session_id = p_session_id and flight_number = v_flight_number;
  if not found then
    raise exception 'TOUR_FLIGHT_REQUEST_MISMATCH' using errcode = 'P0001';
  end if;
  return jsonb_build_object('ok', true, 'checkedAt', now());
end;
$$;

revoke all on function public.tour_v1_setup_airport_pickup(uuid, text, text, date) from public, anon, authenticated;
revoke all on function public.tour_v1_get_airport_pickup(uuid, text) from public, anon, authenticated;
revoke all on function public.tour_v1_set_airport_action(uuid, text, text) from public, anon, authenticated;
revoke all on function public.tour_v1_set_driver_eta(uuid, text, integer) from public, anon, authenticated;
revoke all on function public.tour_v1_update_pickup_point(uuid, text, text, text) from public, anon, authenticated;
revoke all on function public.tour_v1_store_flight_status(uuid, text, text, text, text, text, timestamptz, timestamptz, timestamptz, integer, text, text, text, text, text) from public, anon, authenticated;

grant execute on function public.tour_v1_setup_airport_pickup(uuid, text, text, date) to anon, authenticated;
grant execute on function public.tour_v1_get_airport_pickup(uuid, text) to anon, authenticated;
grant execute on function public.tour_v1_set_airport_action(uuid, text, text) to anon, authenticated;
grant execute on function public.tour_v1_set_driver_eta(uuid, text, integer) to anon, authenticated;
grant execute on function public.tour_v1_update_pickup_point(uuid, text, text, text) to anon, authenticated;
grant execute on function public.tour_v1_store_flight_status(uuid, text, text, text, text, text, timestamptz, timestamptz, timestamptz, integer, text, text, text, text, text) to service_role;

comment on table tour_private.airport_pickups is 'Shared BKK airport pickup state; external flight data is server-written only.';
comment on function public.tour_v1_setup_airport_pickup(uuid, text, text, date) is 'Customer initializes or replaces the flight for a paired trip.';
comment on function public.tour_v1_store_flight_status(uuid, text, text, text, text, text, timestamptz, timestamptz, timestamptz, integer, text, text, text, text, text) is 'Server-only normalized flight status writer for the configured provider.';
