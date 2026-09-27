-- Every newly paired Tour session keeps both the customer display name and
-- vehicle plate. Existing sessions remain readable without inventing data.

alter table tour_private.sessions
  drop constraint tour_v1_label_matches_creator;

alter table tour_private.sessions
  add constraint tour_v1_creator_label_present check (
    (creator_role = 'customer' and trip_display_name is not null)
    or
    (creator_role = 'driver' and vehicle_plate is not null)
  ),
  add constraint tour_v1_trip_display_name_length check (
    trip_display_name is null or char_length(trip_display_name) between 1 and 80
  ),
  add constraint tour_v1_vehicle_plate_length check (
    vehicle_plate is null or char_length(vehicle_plate) between 1 and 24
  );

revoke all on function public.tour_v1_confirm_session(text, text) from public, anon, authenticated;
drop function public.tour_v1_confirm_session(text, text);

create function public.tour_v1_confirm_session(
  p_join_token text,
  p_role text,
  p_label text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_session tour_private.sessions;
  v_access_token text;
  v_label text := btrim(p_label);
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
  if v_label is null or char_length(v_label) < 1 then
    raise exception 'TOUR_LABEL_REQUIRED' using errcode = 'P0001';
  end if;
  if (p_role = 'driver' and char_length(v_label) > 24)
     or (p_role = 'customer' and char_length(v_label) > 80) then
    raise exception 'TOUR_LABEL_TOO_LONG' using errcode = 'P0001';
  end if;

  v_access_token := translate(encode(extensions.gen_random_bytes(32), 'base64'), '+/=', '-_');
  insert into tour_private.participants (session_id, role, access_token_hash)
  values (v_session.id, p_role, tour_private.hash_token(v_access_token));

  update tour_private.sessions
  set trip_display_name = case when p_role = 'customer' then v_label else trip_display_name end,
      vehicle_plate = case when p_role = 'driver' then v_label else vehicle_plate end,
      status = 'paired',
      paired_at = now(),
      last_active_at = now(),
      expires_at = now() + interval '7 days',
      join_token_hash = null
  where id = v_session.id;

  return jsonb_build_object(
    'sessionId', v_session.id,
    'accessToken', v_access_token,
    'role', p_role,
    'tripDisplayName', case when p_role = 'customer' then v_label else v_session.trip_display_name end,
    'vehiclePlate', case when p_role = 'driver' then v_label else v_session.vehicle_plate end,
    'pairedAt', now()
  );
end;
$$;

revoke all on function public.tour_v1_confirm_session(text, text, text) from public, anon, authenticated;
grant execute on function public.tour_v1_confirm_session(text, text, text) to anon, authenticated;

comment on function public.tour_v1_confirm_session(text, text, text) is
  'Pairs the opposite role and records that participant display name or vehicle plate.';
