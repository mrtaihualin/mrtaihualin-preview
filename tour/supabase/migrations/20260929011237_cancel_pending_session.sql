-- Allow a creator to leave the QR waiting screen without risking a race that
-- ends an already-paired trip. The row lock makes the pending-state check and
-- cancellation atomic with confirmation.

create function public.tour_v1_cancel_pending_session(p_session_id uuid, p_access_token text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_status text;
begin
  perform tour_private.cleanup_expired();
  perform tour_private.authorize_participant(p_session_id, p_access_token);

  select status
    into v_status
  from tour_private.sessions
  where id = p_session_id
  for update;

  if v_status is null then
    raise exception 'TOUR_SESSION_NOT_FOUND' using errcode = 'P0001';
  end if;
  if v_status = 'ended' then
    raise exception 'TOUR_SESSION_ENDED' using errcode = 'P0001';
  end if;
  if v_status <> 'pending' then
    raise exception 'TOUR_SESSION_ALREADY_PAIRED' using errcode = 'P0001';
  end if;

  update tour_private.sessions
  set status = 'ended', ended_at = now(), join_token_hash = null
  where id = p_session_id;

  return jsonb_build_object('ok', true, 'status', 'ended');
end;
$$;

revoke all on function public.tour_v1_cancel_pending_session(uuid, text) from public, anon, authenticated;
grant execute on function public.tour_v1_cancel_pending_session(uuid, text) to anon, authenticated;

comment on function public.tour_v1_cancel_pending_session(uuid, text)
  is 'Cancels only an unpaired Tour session; never ends a session that has already paired.';
