create table public.newsletter_signup_rate_limits (
  scope text not null,
  key_hash bytea not null,
  window_started_at timestamptz not null,
  request_count integer not null default 1,
  primary key (scope, key_hash, window_started_at),
  constraint newsletter_signup_rate_limits_scope_check check (scope in ('email', 'ip')),
  constraint newsletter_signup_rate_limits_hash_check check (octet_length(key_hash) = 32),
  constraint newsletter_signup_rate_limits_count_check check (request_count > 0)
);

alter table public.newsletter_signup_rate_limits enable row level security;
alter table public.newsletter_signup_rate_limits force row level security;
revoke all on table public.newsletter_signup_rate_limits from public, anon, authenticated;
revoke all on table public.newsletter_signup_rate_limits from service_role;

create or replace function public.newsletter_enforce_signup_rate_limit(
  p_ip_hash bytea,
  p_email_hash bytea,
  p_now timestamptz default now()
)
returns table (allowed boolean, retry_after_seconds integer)
language plpgsql
security definer
set search_path = ''
as $$
begin
  if p_now is null
     or p_ip_hash is null or octet_length(p_ip_hash) <> 32
     or p_email_hash is null or octet_length(p_email_hash) <> 32 then
    raise exception 'invalid newsletter rate-limit input' using errcode = '22023';
  end if;

  return query
  with dimensions(scope, key_hash, window_seconds, request_limit) as (
    values
      ('email'::text, p_email_hash, 3600, 5),
      ('ip'::text, p_ip_hash, 600, 10)
  ), buckets as (
    select
      scope,
      key_hash,
      window_seconds,
      request_limit,
      to_timestamp(floor(extract(epoch from p_now) / window_seconds) * window_seconds) as window_started_at
    from dimensions
  ), increments as (
    insert into public.newsletter_signup_rate_limits as rate_limit (
      scope,
      key_hash,
      window_started_at,
      request_count
    )
    select scope, key_hash, window_started_at, 1
    from buckets
    order by scope, key_hash
    on conflict (scope, key_hash, window_started_at)
    do update set request_count = rate_limit.request_count + 1
    returning scope, key_hash, window_started_at, request_count
  ), results as (
    select
      increments.request_count <= buckets.request_limit as within_limit,
      greatest(
        1,
        ceil(extract(epoch from (
          buckets.window_started_at + make_interval(secs => buckets.window_seconds) - p_now
        )))::integer
      ) as retry_after
    from increments
    join buckets using (scope, key_hash, window_started_at)
  )
  select
    bool_and(results.within_limit),
    case
      when bool_and(results.within_limit) then 0
      else least(3600, max(results.retry_after) filter (where not results.within_limit))
    end
  from results;
end;
$$;

revoke all on function public.newsletter_enforce_signup_rate_limit(bytea, bytea, timestamptz) from public, anon, authenticated;
grant execute on function public.newsletter_enforce_signup_rate_limit(bytea, bytea, timestamptz) to service_role;

comment on table public.newsletter_signup_rate_limits is
  'Server-only fixed-window newsletter signup counters keyed by HMAC digests; never stores client IP or email values.';
comment on function public.newsletter_enforce_signup_rate_limit(bytea, bytea, timestamptz) is
  'Atomically enforces per-email and per-IP newsletter signup limits for the service-role API.';
