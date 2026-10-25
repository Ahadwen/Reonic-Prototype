-- One row per visit: when, and the browser's time zone (e.g. Europe/Berlin) as a rough country.
-- No IP address or anything else about the visitor. The daily totals in reonic_visits stay.

create table if not exists public.reonic_visit_log (
  id bigserial primary key,
  at timestamptz not null default now(),
  time_zone text
);

alter table public.reonic_visit_log enable row level security;

-- Replace the no-argument counter with one that also logs the visit.
drop function if exists public.reonic_count_visit();

create or replace function public.reonic_count_visit(p_time_zone text default null)
returns void
language plpgsql
security definer
set search_path to 'public'
as $$
begin
  insert into public.reonic_visits (day, visits) values (current_date, 1)
  on conflict (day) do update set visits = reonic_visits.visits + 1, last_at = now();

  -- Only keep values shaped like an IANA time zone name; anything else is stored as null.
  insert into public.reonic_visit_log (time_zone)
  values (case when p_time_zone ~ '^[A-Za-z_]+(/[A-Za-z0-9_+-]+){0,2}$' and length(p_time_zone) <= 64 then p_time_zone end);
end;
$$;

revoke all on function public.reonic_count_visit(text) from public;
grant execute on function public.reonic_count_visit(text) to anon, authenticated;
