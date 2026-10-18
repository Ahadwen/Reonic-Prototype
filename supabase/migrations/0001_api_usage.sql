-- Daily call counter for the claude-proxy Edge Function, so a public demo can't run up an unbounded bill.
-- Everything for this prototype is prefixed reonic_ to stay clear of other tables in this project.

create table if not exists public.reonic_api_usage (
  day date primary key default current_date,
  calls integer not null default 0,
  input_tokens bigint not null default 0,
  output_tokens bigint not null default 0
);

-- RLS on with no policies: only the service role (used inside the Edge Function) can touch it.
alter table public.reonic_api_usage enable row level security;

-- Atomically claim one call for today. Returns false once the daily limit is reached.
create or replace function public.reonic_take_api_call(p_daily_limit integer)
returns boolean
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_calls integer;
begin
  insert into public.reonic_api_usage (day, calls) values (current_date, 1)
  on conflict (day) do update set calls = reonic_api_usage.calls + 1
  returning calls into v_calls;
  return v_calls <= p_daily_limit;
end;
$$;

create or replace function public.reonic_record_tokens(p_input integer, p_output integer)
returns void
language sql
security definer
set search_path to 'public'
as $$
  update public.reonic_api_usage
  set input_tokens = input_tokens + coalesce(p_input, 0),
      output_tokens = output_tokens + coalesce(p_output, 0)
  where day = current_date;
$$;

revoke all on function public.reonic_take_api_call(integer) from public, anon, authenticated;
revoke all on function public.reonic_record_tokens(integer, integer) from public, anon, authenticated;
grant execute on function public.reonic_take_api_call(integer) to service_role;
grant execute on function public.reonic_record_tokens(integer, integer) to service_role;
