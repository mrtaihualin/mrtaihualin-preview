-- Tour Communication MVP V1
-- Standalone staging schema. The browser can call only the explicitly granted
-- RPC functions; no underlying table is exposed to anon/authenticated roles.

create schema if not exists tour_private;
revoke all on schema tour_private from public, anon, authenticated;

create table tour_private.sessions (
  id uuid primary key default extensions.gen_random_uuid(),
  creator_role text not null check (creator_role in ('customer', 'driver')),
  trip_display_name text,
  vehicle_plate text,
  status text not null default 'pending' check (status in ('pending', 'paired', 'ended')),
  join_token_hash bytea unique,
  created_at timestamptz not null default now(),
  paired_at timestamptz,
  ended_at timestamptz,
  last_active_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '7 days'),
  constraint tour_v1_label_matches_creator check (
    (creator_role = 'customer' and trip_display_name is not null and vehicle_plate is null)
    or
    (creator_role = 'driver' and vehicle_plate is not null and trip_display_name is null)
  )
);

create table tour_private.participants (
  session_id uuid not null references tour_private.sessions(id) on delete cascade,
  role text not null check (role in ('customer', 'driver')),
  access_token_hash bytea not null unique,
  created_at timestamptz not null default now(),
  primary key (session_id, role)
);

create table tour_private.messages (
  id bigint generated always as identity primary key,
  session_id uuid not null references tour_private.sessions(id) on delete cascade,
  sender_role text not null check (sender_role in ('customer', 'driver')),
  source_locale text not null check (source_locale in ('zh-TW', 'th')),
  body text not null check (char_length(body) between 1 and 1000),
  intent_key text check (
    intent_key is null or intent_key in (
      'on_my_way', 'arrived', 'where_are_you', 'please_wait',
      'traffic', 'thank_you', 'need_help', 'call_me'
    )
  ),
  created_at timestamptz not null default now()
);

create table tour_private.appointments (
  id uuid primary key default extensions.gen_random_uuid(),
  session_id uuid not null references tour_private.sessions(id) on delete cascade,
  creator_role text not null check (creator_role in ('customer', 'driver')),
  place text not null check (char_length(place) between 1 and 160),
  appointment_date date not null,
  appointment_time time not null,
  note text check (note is null or char_length(note) <= 280),
  status text not null default 'pending' check (status in ('pending', 'confirmed')),
  confirmed_by text check (confirmed_by is null or confirmed_by in ('customer', 'driver')),
  created_at timestamptz not null default now(),
  confirmed_at timestamptz
);

create table tour_private.location_shares (
  session_id uuid primary key references tour_private.sessions(id) on delete cascade,
  request_id uuid not null default extensions.gen_random_uuid(),
  requester_role text not null check (requester_role in ('customer', 'driver')),
  status text not null check (status in ('requested', 'active', 'ended')),
  requested_at timestamptz not null default now(),
  accepted_at timestamptz,
  expires_at timestamptz,
  ended_at timestamptz,
  ended_reason text check (ended_reason is null or ended_reason in ('stopped', 'met', 'expired', 'session_ended'))
);

create table tour_private.locations (
  session_id uuid not null references tour_private.sessions(id) on delete cascade,
  role text not null check (role in ('customer', 'driver')),
  latitude double precision not null check (latitude between -90 and 90),
  longitude double precision not null check (longitude between -180 and 180),
  accuracy_m double precision check (accuracy_m is null or accuracy_m between 0 and 100000),
  updated_at timestamptz not null default now(),
  primary key (session_id, role)
);

create index tour_v1_sessions_expiry_idx
  on tour_private.sessions (expires_at)
  where status <> 'ended';
create index tour_v1_messages_session_created_idx
  on tour_private.messages (session_id, created_at desc);
create index tour_v1_appointments_session_created_idx
  on tour_private.appointments (session_id, created_at desc);
create index tour_v1_location_shares_expiry_idx
  on tour_private.location_shares (expires_at)
  where status = 'active';

alter table tour_private.sessions enable row level security;
alter table tour_private.participants enable row level security;
alter table tour_private.messages enable row level security;
alter table tour_private.appointments enable row level security;
alter table tour_private.location_shares enable row level security;
alter table tour_private.locations enable row level security;

revoke all on all tables in schema tour_private from public, anon, authenticated;
revoke all on all sequences in schema tour_private from public, anon, authenticated;

create function tour_private.hash_token(p_token text)
returns bytea
language sql
immutable
strict
set search_path = ''
as $$
  select extensions.digest(p_token, 'sha256');
$$;

create function tour_private.authorize_participant(p_session_id uuid, p_access_token text)
returns text
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_role text;
begin
  select p.role
    into v_role
  from tour_private.participants p
  where p.session_id = p_session_id
    and p.access_token_hash = tour_private.hash_token(p_access_token);

  if v_role is null then
    raise exception 'TOUR_ACCESS_DENIED' using errcode = 'P0001';
  end if;
  return v_role;
end;
$$;

create function tour_private.cleanup_expired()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_deleted integer := 0;
begin
  update tour_private.sessions
  set status = 'ended', ended_at = coalesce(ended_at, now()), join_token_hash = null
  where status <> 'ended' and expires_at <= now();

  update tour_private.location_shares ls
  set status = 'ended', ended_at = coalesce(ended_at, now()), ended_reason = 'expired'
  where ls.status = 'active' and ls.expires_at <= now();

  update tour_private.location_shares ls
  set status = 'ended', ended_at = coalesce(ended_at, now()), ended_reason = 'session_ended'
  where ls.status in ('requested', 'active')
    and exists (
      select 1 from tour_private.sessions s
      where s.id = ls.session_id and s.status = 'ended'
    );

  delete from tour_private.locations l
  where not exists (
    select 1
    from tour_private.location_shares ls
    join tour_private.sessions s on s.id = ls.session_id
    where ls.session_id = l.session_id
      and ls.status = 'active'
      and ls.expires_at > now()
      and s.status = 'paired'
      and s.expires_at > now()
  );
  get diagnostics v_deleted = row_count;
  return v_deleted;
end;
$$;

create function tour_private.assert_usable_session(p_session_id uuid, p_require_paired boolean default true)
returns tour_private.sessions
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_session tour_private.sessions;
begin
  perform tour_private.cleanup_expired();
  select * into v_session
  from tour_private.sessions
  where id = p_session_id;

  if v_session.id is null then
    raise exception 'TOUR_SESSION_NOT_FOUND' using errcode = 'P0001';
  end if;
  if v_session.status = 'ended' then
    if v_session.expires_at <= now() then
      raise exception 'TOUR_SESSION_EXPIRED' using errcode = 'P0001';
    end if;
    raise exception 'TOUR_SESSION_ENDED' using errcode = 'P0001';
  end if;
  if p_require_paired and v_session.status <> 'paired' then
    raise exception 'TOUR_NOT_PAIRED' using errcode = 'P0001';
  end if;
  return v_session;
end;
$$;

create function public.tour_v1_create_session(p_creator_role text, p_label text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_session_id uuid;
  v_access_token text;
  v_join_token text;
  v_label text := btrim(p_label);
begin
  if p_creator_role not in ('customer', 'driver') then
    raise exception 'TOUR_INVALID_ROLE' using errcode = 'P0001';
  end if;
  if v_label is null or char_length(v_label) < 1 then
    raise exception 'TOUR_LABEL_REQUIRED' using errcode = 'P0001';
  end if;
  if (p_creator_role = 'driver' and char_length(v_label) > 24)
     or (p_creator_role = 'customer' and char_length(v_label) > 80) then
    raise exception 'TOUR_LABEL_TOO_LONG' using errcode = 'P0001';
  end if;

  v_access_token := translate(encode(extensions.gen_random_bytes(32), 'base64'), '+/=', '-_');
  v_join_token := translate(encode(extensions.gen_random_bytes(32), 'base64'), '+/=', '-_');

  insert into tour_private.sessions (
    creator_role, trip_display_name, vehicle_plate, join_token_hash
  ) values (
    p_creator_role,
    case when p_creator_role = 'customer' then v_label else null end,
    case when p_creator_role = 'driver' then v_label else null end,
    tour_private.hash_token(v_join_token)
  ) returning id into v_session_id;

  insert into tour_private.participants (session_id, role, access_token_hash)
  values (v_session_id, p_creator_role, tour_private.hash_token(v_access_token));

  return jsonb_build_object(
    'sessionId', v_session_id,
    'accessToken', v_access_token,
    'joinToken', v_join_token,
    'role', p_creator_role,
    'expiresAt', now() + interval '7 days'
  );
end;
$$;

create function public.tour_v1_preview_session(p_join_token text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_session tour_private.sessions;
begin
  perform tour_private.cleanup_expired();
  select * into v_session
  from tour_private.sessions
  where join_token_hash = tour_private.hash_token(p_join_token)
    and status = 'pending';

  if v_session.id is null then
    raise exception 'TOUR_JOIN_INVALID' using errcode = 'P0001';
  end if;
  if v_session.expires_at <= now() then
    raise exception 'TOUR_JOIN_EXPIRED' using errcode = 'P0001';
  end if;

  return jsonb_build_object(
    'sessionId', v_session.id,
    'creatorRole', v_session.creator_role,
    'tripDisplayName', v_session.trip_display_name,
    'vehiclePlate', v_session.vehicle_plate,
    'expiresAt', v_session.expires_at
  );
end;
$$;

create function public.tour_v1_confirm_session(p_join_token text, p_role text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_session tour_private.sessions;
  v_access_token text;
begin
  perform tour_private.cleanup_expired();
  select * into v_session
  from tour_private.sessions
  where join_token_hash = tour_private.hash_token(p_join_token)
  for update;

  if v_session.id is null then
    raise exception 'TOUR_JOIN_INVALID' using errcode = 'P0001';
  end if;
  if v_session.status <> 'pending' then
    raise exception 'TOUR_ALREADY_PAIRED' using errcode = 'P0001';
  end if;
  if v_session.expires_at <= now() then
    raise exception 'TOUR_JOIN_EXPIRED' using errcode = 'P0001';
  end if;
  if p_role not in ('customer', 'driver') or p_role = v_session.creator_role then
    raise exception 'TOUR_CONFIRM_ROLE_MISMATCH' using errcode = 'P0001';
  end if;

  v_access_token := translate(encode(extensions.gen_random_bytes(32), 'base64'), '+/=', '-_');
  insert into tour_private.participants (session_id, role, access_token_hash)
  values (v_session.id, p_role, tour_private.hash_token(v_access_token));

  update tour_private.sessions
  set status = 'paired', paired_at = now(), last_active_at = now(),
      expires_at = now() + interval '7 days', join_token_hash = null
  where id = v_session.id;

  return jsonb_build_object(
    'sessionId', v_session.id,
    'accessToken', v_access_token,
    'role', p_role,
    'pairedAt', now()
  );
end;
$$;

create function public.tour_v1_get_state(
  p_session_id uuid,
  p_access_token text,
  p_touch boolean default false
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_role text;
  v_session tour_private.sessions;
  v_messages jsonb;
  v_appointments jsonb;
  v_share jsonb;
  v_locations jsonb;
begin
  v_role := tour_private.authorize_participant(p_session_id, p_access_token);
  v_session := tour_private.assert_usable_session(p_session_id, false);

  if p_touch then
    update tour_private.sessions
    set last_active_at = now(), expires_at = now() + interval '7 days'
    where id = p_session_id
    returning * into v_session;
  end if;

  select coalesce(jsonb_agg(jsonb_build_object(
    'id', m.id,
    'senderRole', m.sender_role,
    'sourceLocale', m.source_locale,
    'body', m.body,
    'intentKey', m.intent_key,
    'createdAt', m.created_at
  ) order by m.created_at, m.id), '[]'::jsonb)
  into v_messages
  from (
    select * from tour_private.messages
    where session_id = p_session_id
    order by created_at desc, id desc
    limit 100
  ) m;

  select coalesce(jsonb_agg(jsonb_build_object(
    'id', a.id,
    'creatorRole', a.creator_role,
    'place', a.place,
    'date', a.appointment_date,
    'time', to_char(a.appointment_time, 'HH24:MI'),
    'note', a.note,
    'status', a.status,
    'confirmedBy', a.confirmed_by,
    'createdAt', a.created_at,
    'confirmedAt', a.confirmed_at
  ) order by a.created_at desc), '[]'::jsonb)
  into v_appointments
  from (
    select * from tour_private.appointments
    where session_id = p_session_id
    order by created_at desc
    limit 20
  ) a;

  select jsonb_build_object(
    'requestId', ls.request_id,
    'requesterRole', ls.requester_role,
    'status', ls.status,
    'requestedAt', ls.requested_at,
    'acceptedAt', ls.accepted_at,
    'expiresAt', ls.expires_at,
    'endedAt', ls.ended_at,
    'endedReason', ls.ended_reason
  ) into v_share
  from tour_private.location_shares ls
  where ls.session_id = p_session_id;

  select coalesce(jsonb_agg(jsonb_build_object(
    'role', l.role,
    'latitude', l.latitude,
    'longitude', l.longitude,
    'accuracyM', l.accuracy_m,
    'updatedAt', l.updated_at
  )), '[]'::jsonb)
  into v_locations
  from tour_private.locations l
  where l.session_id = p_session_id;

  return jsonb_build_object(
    'viewerRole', v_role,
    'session', jsonb_build_object(
      'id', v_session.id,
      'creatorRole', v_session.creator_role,
      'tripDisplayName', v_session.trip_display_name,
      'vehiclePlate', v_session.vehicle_plate,
      'status', v_session.status,
      'createdAt', v_session.created_at,
      'pairedAt', v_session.paired_at,
      'expiresAt', v_session.expires_at
    ),
    'messages', v_messages,
    'appointments', v_appointments,
    'locationShare', v_share,
    'locations', v_locations
  );
end;
$$;

create function public.tour_v1_send_message(
  p_session_id uuid,
  p_access_token text,
  p_body text,
  p_intent_key text default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_role text;
  v_body text := btrim(p_body);
  v_id bigint;
begin
  v_role := tour_private.authorize_participant(p_session_id, p_access_token);
  perform tour_private.assert_usable_session(p_session_id, true);
  if v_body is null or char_length(v_body) not between 1 and 1000 then
    raise exception 'TOUR_MESSAGE_INVALID' using errcode = 'P0001';
  end if;
  if p_intent_key is not null and p_intent_key not in (
    'on_my_way', 'arrived', 'where_are_you', 'please_wait',
    'traffic', 'thank_you', 'need_help', 'call_me'
  ) then
    raise exception 'TOUR_INTENT_INVALID' using errcode = 'P0001';
  end if;

  insert into tour_private.messages (session_id, sender_role, source_locale, body, intent_key)
  values (p_session_id, v_role, case when v_role = 'customer' then 'zh-TW' else 'th' end, v_body, p_intent_key)
  returning id into v_id;

  update tour_private.sessions
  set last_active_at = now(), expires_at = now() + interval '7 days'
  where id = p_session_id;

  return jsonb_build_object('ok', true, 'id', v_id);
end;
$$;

create function public.tour_v1_create_appointment(
  p_session_id uuid,
  p_access_token text,
  p_place text,
  p_date date,
  p_time time,
  p_note text default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_role text;
  v_place text := btrim(p_place);
  v_note text := nullif(btrim(p_note), '');
  v_id uuid;
begin
  v_role := tour_private.authorize_participant(p_session_id, p_access_token);
  perform tour_private.assert_usable_session(p_session_id, true);
  if v_place is null or char_length(v_place) not between 1 and 160 or p_date is null or p_time is null then
    raise exception 'TOUR_APPOINTMENT_INVALID' using errcode = 'P0001';
  end if;
  if v_note is not null and char_length(v_note) > 280 then
    raise exception 'TOUR_APPOINTMENT_NOTE_TOO_LONG' using errcode = 'P0001';
  end if;

  insert into tour_private.appointments (
    session_id, creator_role, place, appointment_date, appointment_time, note
  ) values (
    p_session_id, v_role, v_place, p_date, p_time, v_note
  ) returning id into v_id;

  update tour_private.sessions
  set last_active_at = now(), expires_at = now() + interval '7 days'
  where id = p_session_id;
  return jsonb_build_object('ok', true, 'id', v_id, 'status', 'pending');
end;
$$;

create function public.tour_v1_confirm_appointment(
  p_session_id uuid,
  p_access_token text,
  p_appointment_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_role text;
  v_appointment tour_private.appointments;
begin
  v_role := tour_private.authorize_participant(p_session_id, p_access_token);
  perform tour_private.assert_usable_session(p_session_id, true);
  select * into v_appointment
  from tour_private.appointments
  where id = p_appointment_id and session_id = p_session_id
  for update;

  if v_appointment.id is null or v_appointment.status <> 'pending' then
    raise exception 'TOUR_APPOINTMENT_NOT_PENDING' using errcode = 'P0001';
  end if;
  if v_appointment.creator_role = v_role then
    raise exception 'TOUR_CREATOR_CANNOT_CONFIRM' using errcode = 'P0001';
  end if;

  update tour_private.appointments
  set status = 'confirmed', confirmed_by = v_role, confirmed_at = now()
  where id = p_appointment_id;
  update tour_private.sessions
  set last_active_at = now(), expires_at = now() + interval '7 days'
  where id = p_session_id;
  return jsonb_build_object('ok', true, 'id', p_appointment_id, 'status', 'confirmed');
end;
$$;

create function public.tour_v1_request_location(p_session_id uuid, p_access_token text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_role text;
  v_existing tour_private.location_shares;
  v_request_id uuid := extensions.gen_random_uuid();
begin
  v_role := tour_private.authorize_participant(p_session_id, p_access_token);
  perform tour_private.assert_usable_session(p_session_id, true);
  select * into v_existing from tour_private.location_shares
  where session_id = p_session_id for update;
  if v_existing.status in ('requested', 'active') then
    raise exception 'TOUR_LOCATION_ALREADY_OPEN' using errcode = 'P0001';
  end if;

  delete from tour_private.locations where session_id = p_session_id;
  insert into tour_private.location_shares (
    session_id, request_id, requester_role, status, requested_at,
    accepted_at, expires_at, ended_at, ended_reason
  ) values (
    p_session_id, v_request_id, v_role, 'requested', now(),
    null, null, null, null
  ) on conflict (session_id) do update set
    request_id = excluded.request_id,
    requester_role = excluded.requester_role,
    status = 'requested',
    requested_at = now(),
    accepted_at = null,
    expires_at = null,
    ended_at = null,
    ended_reason = null;

  update tour_private.sessions
  set last_active_at = now(), expires_at = now() + interval '7 days'
  where id = p_session_id;
  return jsonb_build_object('ok', true, 'requestId', v_request_id, 'status', 'requested');
end;
$$;

create function public.tour_v1_accept_location(p_session_id uuid, p_access_token text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_role text;
  v_share tour_private.location_shares;
  v_expires_at timestamptz := now() + interval '20 minutes';
begin
  v_role := tour_private.authorize_participant(p_session_id, p_access_token);
  perform tour_private.assert_usable_session(p_session_id, true);
  select * into v_share from tour_private.location_shares
  where session_id = p_session_id for update;
  if v_share.session_id is null or v_share.status <> 'requested' then
    raise exception 'TOUR_LOCATION_NOT_REQUESTED' using errcode = 'P0001';
  end if;
  if v_share.requester_role = v_role then
    raise exception 'TOUR_REQUESTER_CANNOT_ACCEPT' using errcode = 'P0001';
  end if;

  update tour_private.location_shares
  set status = 'active', accepted_at = now(), expires_at = v_expires_at
  where session_id = p_session_id;
  update tour_private.sessions
  set last_active_at = now(), expires_at = now() + interval '7 days'
  where id = p_session_id;
  return jsonb_build_object('ok', true, 'status', 'active', 'expiresAt', v_expires_at);
end;
$$;

create function public.tour_v1_update_location(
  p_session_id uuid,
  p_access_token text,
  p_latitude double precision,
  p_longitude double precision,
  p_accuracy_m double precision default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_role text;
  v_share tour_private.location_shares;
begin
  v_role := tour_private.authorize_participant(p_session_id, p_access_token);
  perform tour_private.assert_usable_session(p_session_id, true);
  if p_latitude not between -90 and 90 or p_longitude not between -180 and 180
     or (p_accuracy_m is not null and p_accuracy_m not between 0 and 100000) then
    raise exception 'TOUR_LOCATION_INVALID' using errcode = 'P0001';
  end if;

  select * into v_share from tour_private.location_shares
  where session_id = p_session_id for update;
  if v_share.session_id is null or v_share.status <> 'active' or v_share.expires_at <= now() then
    perform tour_private.cleanup_expired();
    raise exception 'TOUR_LOCATION_NOT_ACTIVE' using errcode = 'P0001';
  end if;

  insert into tour_private.locations (
    session_id, role, latitude, longitude, accuracy_m, updated_at
  ) values (
    p_session_id, v_role, p_latitude, p_longitude, p_accuracy_m, now()
  ) on conflict (session_id, role) do update set
    latitude = excluded.latitude,
    longitude = excluded.longitude,
    accuracy_m = excluded.accuracy_m,
    updated_at = now();

  update tour_private.sessions
  set last_active_at = now(), expires_at = now() + interval '7 days'
  where id = p_session_id;
  return jsonb_build_object('ok', true, 'updatedAt', now());
end;
$$;

create function public.tour_v1_stop_location(
  p_session_id uuid,
  p_access_token text,
  p_reason text default 'stopped'
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
  if p_reason not in ('stopped', 'met') then
    raise exception 'TOUR_STOP_REASON_INVALID' using errcode = 'P0001';
  end if;

  update tour_private.location_shares
  set status = 'ended', ended_at = now(), ended_reason = p_reason
  where session_id = p_session_id and status in ('requested', 'active');
  if not found then
    raise exception 'TOUR_LOCATION_NOT_OPEN' using errcode = 'P0001';
  end if;
  delete from tour_private.locations where session_id = p_session_id;
  update tour_private.sessions
  set last_active_at = now(), expires_at = now() + interval '7 days'
  where id = p_session_id;
  return jsonb_build_object('ok', true, 'status', 'ended', 'reason', p_reason);
end;
$$;

create function public.tour_v1_end_session(p_session_id uuid, p_access_token text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform tour_private.authorize_participant(p_session_id, p_access_token);
  perform tour_private.assert_usable_session(p_session_id, false);
  update tour_private.sessions
  set status = 'ended', ended_at = now(), join_token_hash = null
  where id = p_session_id;
  update tour_private.location_shares
  set status = 'ended', ended_at = now(), ended_reason = 'session_ended'
  where session_id = p_session_id and status in ('requested', 'active');
  delete from tour_private.locations where session_id = p_session_id;
  return jsonb_build_object('ok', true, 'status', 'ended');
end;
$$;

revoke all on all functions in schema tour_private from public, anon, authenticated;

revoke all on function public.tour_v1_create_session(text, text) from public, anon, authenticated;
revoke all on function public.tour_v1_preview_session(text) from public, anon, authenticated;
revoke all on function public.tour_v1_confirm_session(text, text) from public, anon, authenticated;
revoke all on function public.tour_v1_get_state(uuid, text, boolean) from public, anon, authenticated;
revoke all on function public.tour_v1_send_message(uuid, text, text, text) from public, anon, authenticated;
revoke all on function public.tour_v1_create_appointment(uuid, text, text, date, time, text) from public, anon, authenticated;
revoke all on function public.tour_v1_confirm_appointment(uuid, text, uuid) from public, anon, authenticated;
revoke all on function public.tour_v1_request_location(uuid, text) from public, anon, authenticated;
revoke all on function public.tour_v1_accept_location(uuid, text) from public, anon, authenticated;
revoke all on function public.tour_v1_update_location(uuid, text, double precision, double precision, double precision) from public, anon, authenticated;
revoke all on function public.tour_v1_stop_location(uuid, text, text) from public, anon, authenticated;
revoke all on function public.tour_v1_end_session(uuid, text) from public, anon, authenticated;

grant execute on function public.tour_v1_create_session(text, text) to anon, authenticated;
grant execute on function public.tour_v1_preview_session(text) to anon, authenticated;
grant execute on function public.tour_v1_confirm_session(text, text) to anon, authenticated;
grant execute on function public.tour_v1_get_state(uuid, text, boolean) to anon, authenticated;
grant execute on function public.tour_v1_send_message(uuid, text, text, text) to anon, authenticated;
grant execute on function public.tour_v1_create_appointment(uuid, text, text, date, time, text) to anon, authenticated;
grant execute on function public.tour_v1_confirm_appointment(uuid, text, uuid) to anon, authenticated;
grant execute on function public.tour_v1_request_location(uuid, text) to anon, authenticated;
grant execute on function public.tour_v1_accept_location(uuid, text) to anon, authenticated;
grant execute on function public.tour_v1_update_location(uuid, text, double precision, double precision, double precision) to anon, authenticated;
grant execute on function public.tour_v1_stop_location(uuid, text, text) to anon, authenticated;
grant execute on function public.tour_v1_end_session(uuid, text) to anon, authenticated;

comment on schema tour_private is 'Private storage for standalone Tour Communication MVP V1.';
comment on table tour_private.locations is 'Latest location only; removed when sharing ends or expires.';
comment on function public.tour_v1_create_session(text, text) is 'Creates a seven-day inactivity session with unguessable creator and join tokens.';
comment on function public.tour_v1_get_state(uuid, text, boolean) is 'Token-gated session snapshot; p_touch is used only for explicit resume/foreground activity.';

-- Background privacy cleanup. The function-level checks enforce expiry as well;
-- this job removes stale latest-location rows even if neither device returns.
create extension if not exists pg_cron;
do $$
declare
  v_job_id bigint;
begin
  select jobid into v_job_id from cron.job where jobname = 'tour-v1-location-cleanup' limit 1;
  if v_job_id is not null then
    perform cron.unschedule(v_job_id);
  end if;
  perform cron.schedule(
    'tour-v1-location-cleanup',
    '*/5 * * * *',
    'select tour_private.cleanup_expired();'
  );
end;
$$;
