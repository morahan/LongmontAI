alter table public.newsletter_issues
  add column generation_idempotency_key text,
  add column generation_state text not null default 'completed',
  add column generation_owner uuid,
  add column generation_claim_expires_at timestamptz,
  add column generation_error text,
  add column campaign_identity text,
  add column campaign_attempted_at timestamptz,
  add column generation_completed_at timestamptz,
  add constraint newsletter_issues_generation_state_check
    check (generation_state in ('in_progress', 'prepared', 'campaign_unknown', 'completed', 'failed'));

create unique index newsletter_issues_generation_idempotency_idx
  on public.newsletter_issues (generation_idempotency_key)
  where generation_idempotency_key is not null;

create or replace function public.newsletter_claim_generation(
  p_cadence text,
  p_period_start date,
  p_period_end date,
  p_now timestamptz default now(),
  p_lease_seconds integer default 900
)
returns table (
  outcome text,
  issue_id uuid,
  owner_token uuid,
  deterministic_campaign_identity text,
  issue jsonb
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_owner uuid := extensions.gen_random_uuid();
  v_identity text := 'longmontai-' || p_cadence || '-' || p_period_start::text || '-' || p_period_end::text;
  v_now timestamptz := clock_timestamp();
  v_issue public.newsletter_issues%rowtype;
begin
  if p_cadence not in ('weekly', 'biweekly')
     or p_period_start is null or p_period_end is null or p_period_start > p_period_end
     or p_now is null or p_lease_seconds < 30 or p_lease_seconds > 3600 then
    raise exception 'invalid newsletter generation claim' using errcode = '22023';
  end if;

  insert into public.newsletter_issues (
    cadence, period_start, period_end, status, subject, summary, html_body, text_body,
    generation_idempotency_key, generation_state, generation_owner, generation_claim_expires_at, campaign_identity
  ) values (
    p_cadence, p_period_start, p_period_end, 'draft', 'Generation in progress',
    'Generation in progress', '', '', v_identity, 'in_progress', v_owner,
    v_now + make_interval(secs => p_lease_seconds), v_identity
  )
  on conflict (generation_idempotency_key) where generation_idempotency_key is not null do nothing
  returning * into v_issue;

  if v_issue.id is not null then
    return query select 'claimed'::text, v_issue.id, v_owner, v_identity, to_jsonb(v_issue);
    return;
  end if;

  select i.* into v_issue
  from public.newsletter_issues as i
  where i.generation_idempotency_key = v_identity
  for update;
  v_now := clock_timestamp();

  if v_issue.generation_state = 'completed' then
    return query select 'completed'::text, v_issue.id, null::uuid,
      v_issue.campaign_identity, to_jsonb(v_issue);
    return;
  end if;

  if v_issue.generation_claim_expires_at > v_now then
    return query select 'in_progress'::text, v_issue.id, null::uuid,
      v_issue.campaign_identity, null::jsonb;
    return;
  end if;

  if v_issue.generation_state = 'campaign_unknown' or v_issue.campaign_attempted_at is not null then
    update public.newsletter_issues as i
    set generation_owner = v_owner,
        generation_claim_expires_at = v_now + make_interval(secs => p_lease_seconds),
        generation_error = null
    where i.id = v_issue.id
    returning * into v_issue;
    return query select 'recover_campaign'::text, v_issue.id, v_owner,
      v_issue.campaign_identity, to_jsonb(v_issue);
    return;
  end if;

  update public.newsletter_issues as i
  set generation_state = 'in_progress',
      generation_owner = v_owner,
      generation_claim_expires_at = v_now + make_interval(secs => p_lease_seconds),
      generation_error = null
  where i.id = v_issue.id
  returning * into v_issue;
  return query select 'claimed'::text, v_issue.id, v_owner,
    v_issue.campaign_identity, to_jsonb(v_issue);
end;
$$;

create or replace function public.newsletter_prepare_generation(
  p_issue_id uuid,
  p_owner uuid,
  p_draft jsonb,
  p_items jsonb,
  p_now timestamptz default now()
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_issue public.newsletter_issues%rowtype;
  v_count integer;
begin
  if jsonb_typeof(p_draft) <> 'object' or jsonb_typeof(p_items) <> 'array' then
    raise exception 'invalid newsletter draft payload' using errcode = '22023';
  end if;

  update public.newsletter_issues as i
  set status = coalesce(p_draft->>'status', 'draft'),
      subject = p_draft->>'subject',
      preheader = nullif(p_draft->>'preheader', ''),
      summary = p_draft->>'summary',
      html_body = p_draft->>'html',
      text_body = p_draft->>'text',
      curator_model = nullif(p_draft->>'curatorModel', ''),
      website_snapshot = coalesce(p_draft->'websiteSnapshot', '{}'::jsonb),
      source_urls = coalesce(array(select jsonb_array_elements_text(p_draft->'sourceUrls')), '{}'::text[]),
      generation_state = 'prepared',
      generation_claim_expires_at = clock_timestamp() + interval '15 minutes',
      generation_error = null
  where i.id = p_issue_id
    and i.generation_owner = p_owner
    and i.generation_state = 'in_progress'
  returning * into v_issue;

  if v_issue.id is null then
    raise exception 'newsletter generation ownership lost' using errcode = 'P0001';
  end if;

  delete from public.newsletter_issue_items where issue_id = p_issue_id;
  insert into public.newsletter_issue_items (
    issue_id, category, title, source_name, source_url, synthesis, score, sort_order, metadata
  )
  select
    p_issue_id,
    item->>'category',
    item->>'title',
    nullif(item->>'sourceName', ''),
    nullif(item->>'sourceUrl', ''),
    item->>'synthesis',
    coalesce((item->>'score')::integer, 50),
    coalesce((item->>'sortOrder')::integer, ordinal - 1),
    coalesce(item->'metadata', '{}'::jsonb)
  from jsonb_array_elements(p_items) with ordinality as entries(item, ordinal);

  get diagnostics v_count = row_count;
  return to_jsonb(v_issue) || jsonb_build_object('item_count', v_count);
end;
$$;

create or replace function public.newsletter_mark_campaign_attempt(
  p_issue_id uuid,
  p_owner uuid,
  p_now timestamptz default now()
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.newsletter_issues as i
  set generation_state = 'campaign_unknown',
      campaign_attempted_at = clock_timestamp(),
      generation_claim_expires_at = clock_timestamp() + interval '15 minutes'
  where i.id = p_issue_id
    and i.generation_owner = p_owner
    and i.generation_state = 'prepared';
  if not found then
    raise exception 'newsletter generation ownership lost' using errcode = 'P0001';
  end if;
end;
$$;

create or replace function public.newsletter_release_campaign_recovery(
  p_issue_id uuid,
  p_owner uuid,
  p_error text,
  p_now timestamptz default now()
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.newsletter_issues as i
  set generation_state = 'campaign_unknown',
      generation_claim_expires_at = clock_timestamp(),
      generation_error = left(coalesce(p_error, 'campaign outcome unknown'), 500)
  where i.id = p_issue_id and i.generation_owner = p_owner;
  if not found then
    raise exception 'newsletter generation ownership lost' using errcode = 'P0001';
  end if;
end;
$$;

create or replace function public.newsletter_complete_generation(
  p_issue_id uuid,
  p_owner uuid,
  p_campaign_id integer,
  p_campaign_status text,
  p_now timestamptz default now()
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_issue public.newsletter_issues%rowtype;
begin
  if p_campaign_id is not null and p_campaign_id <= 0 then
    raise exception 'invalid newsletter campaign id' using errcode = '22023';
  end if;

  update public.newsletter_issues as i
  set listmonk_campaign_id = p_campaign_id,
      listmonk_campaign_status = p_campaign_status,
      generation_state = 'completed',
      generation_completed_at = clock_timestamp(),
      generation_claim_expires_at = null,
      generation_error = null
  where i.id = p_issue_id
    and i.generation_owner = p_owner
    and i.generation_state in ('prepared', 'campaign_unknown')
    and (i.campaign_attempted_at is null or p_campaign_id > 0)
  returning * into v_issue;
  if v_issue.id is null then
    raise exception 'newsletter generation ownership lost' using errcode = 'P0001';
  end if;
  return to_jsonb(v_issue);
end;
$$;

create or replace function public.newsletter_create_issue_with_items(
  p_draft jsonb,
  p_items jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_issue public.newsletter_issues%rowtype;
  v_count integer;
begin
  if jsonb_typeof(p_draft) <> 'object' or jsonb_typeof(p_items) <> 'array' then
    raise exception 'invalid newsletter issue payload' using errcode = '22023';
  end if;

  insert into public.newsletter_issues (
    cadence, period_start, period_end, status, subject, preheader, summary, html_body,
    text_body, curator_model, website_snapshot, source_urls, listmonk_campaign_id,
    listmonk_campaign_status, generation_idempotency_key, generation_state, generation_completed_at, campaign_identity
  ) values (
    p_draft->>'cadence', (p_draft->>'periodStart')::date, (p_draft->>'periodEnd')::date,
    coalesce(p_draft->>'status', 'draft'), p_draft->>'subject', nullif(p_draft->>'preheader', ''),
    p_draft->>'summary', p_draft->>'html', p_draft->>'text', nullif(p_draft->>'curatorModel', ''),
    coalesce(p_draft->'websiteSnapshot', '{}'::jsonb),
    coalesce(array(select jsonb_array_elements_text(p_draft->'sourceUrls')), '{}'::text[]),
    nullif(p_draft->>'listmonkCampaignId', '')::integer,
    nullif(p_draft->>'listmonkCampaignStatus', ''),
    'longmontai-' || (p_draft->>'cadence') || '-' || (p_draft->>'periodStart') || '-' || (p_draft->>'periodEnd'),
    'completed', clock_timestamp(),
    'longmontai-' || (p_draft->>'cadence') || '-' || (p_draft->>'periodStart') || '-' || (p_draft->>'periodEnd')
  ) returning * into v_issue;

  insert into public.newsletter_issue_items (
    issue_id, category, title, source_name, source_url, synthesis, score, sort_order, metadata
  )
  select
    v_issue.id, item->>'category', item->>'title', nullif(item->>'sourceName', ''),
    nullif(item->>'sourceUrl', ''), item->>'synthesis', coalesce((item->>'score')::integer, 50),
    coalesce((item->>'sortOrder')::integer, ordinal - 1), coalesce(item->'metadata', '{}'::jsonb)
  from jsonb_array_elements(p_items) with ordinality as entries(item, ordinal);
  get diagnostics v_count = row_count;

  return to_jsonb(v_issue) || jsonb_build_object('item_count', v_count);
end;
$$;

revoke all on function public.newsletter_claim_generation(text, date, date, timestamptz, integer) from public, anon, authenticated;
revoke all on function public.newsletter_prepare_generation(uuid, uuid, jsonb, jsonb, timestamptz) from public, anon, authenticated;
revoke all on function public.newsletter_mark_campaign_attempt(uuid, uuid, timestamptz) from public, anon, authenticated;
revoke all on function public.newsletter_release_campaign_recovery(uuid, uuid, text, timestamptz) from public, anon, authenticated;
revoke all on function public.newsletter_complete_generation(uuid, uuid, integer, text, timestamptz) from public, anon, authenticated;
revoke all on function public.newsletter_create_issue_with_items(jsonb, jsonb) from public, anon, authenticated;
grant execute on function public.newsletter_claim_generation(text, date, date, timestamptz, integer) to service_role;
grant execute on function public.newsletter_prepare_generation(uuid, uuid, jsonb, jsonb, timestamptz) to service_role;
grant execute on function public.newsletter_mark_campaign_attempt(uuid, uuid, timestamptz) to service_role;
grant execute on function public.newsletter_release_campaign_recovery(uuid, uuid, text, timestamptz) to service_role;
grant execute on function public.newsletter_complete_generation(uuid, uuid, integer, text, timestamptz) to service_role;
grant execute on function public.newsletter_create_issue_with_items(jsonb, jsonb) to service_role;
revoke select, insert, update, delete on table
  public.newsletter_issues,
  public.newsletter_issue_items
from service_role;

comment on index public.newsletter_issues_generation_idempotency_idx is
  'Authoritative uniqueness for generation-only cadence and period keys; legacy rows remain nullable and duplicate-safe.';
comment on column public.newsletter_issues.campaign_identity is
  'Deterministic Listmonk identity used to recover ambiguous campaign creation outcomes without blind retries.';
