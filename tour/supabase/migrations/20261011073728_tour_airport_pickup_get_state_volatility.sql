-- get_airport_pickup calls the common expiry guard, which may perform cleanup.
-- It must remain VOLATILE so Postgres does not force a read-only function context.
alter function public.tour_v1_get_airport_pickup(uuid, text) volatile;
