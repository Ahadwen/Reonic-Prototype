-- A plain visit counter for the demo site: one row per day, no personal data.

create table if not exists public.reonic_visits (
  day date primary key default current_date,
  visits integer not null default 0,
  first_at timestamptz not null default now(),
  last_at timestamptz not null default now()
);

-- RLS on with no policies: the table can't be read or written directly with the public key.
alter table public.reonic_visits enable row level security;

-- The only way in: add one to today's count. Callable with the public (anon) key from the site.
create or replace function public.reonic_count_visit()
returns void
language sql
security definer
set search_path to 'public'
as $$
  insert into public.reonic_visits (day, visits) values (current_date, 1)
  on conflict (day) do update set visits = reonic_visits.visits + 1, last_at = now();
$$;

revoke all on function public.reonic_count_visit() from public;
grant execute on function public.reonic_count_visit() to anon, authenticated;
