create extension if not exists pgcrypto with schema extensions;
create extension if not exists citext with schema extensions;

create schema if not exists longmont_private;
revoke all on schema longmont_private from public, anon, authenticated;
grant usage on schema longmont_private to postgres, service_role;

create or replace function longmont_private.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table public.newsletter_subscribers (
  id uuid primary key default extensions.gen_random_uuid(),
  email extensions.citext not null unique,
  name text,
  cadence text not null default 'weekly',
  status text not null default 'pending',
  source text not null default 'website',
  consented_at timestamptz not null default now(),
  listmonk_subscriber_id integer,
  listmonk_subscriber_uuid uuid,
  listmonk_subscription_status text,
  listmonk_last_synced_at timestamptz,
  sync_error text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint newsletter_subscribers_cadence_check
    check (cadence in ('weekly', 'biweekly')),
  constraint newsletter_subscribers_status_check
    check (status in ('pending', 'subscribed', 'unsubscribed', 'bounced', 'complained')),
  constraint newsletter_subscribers_metadata_object_check
    check (jsonb_typeof(metadata) = 'object')
);

create index newsletter_subscribers_status_created_idx
  on public.newsletter_subscribers (status, created_at desc);

create trigger newsletter_subscribers_set_updated_at
  before update on public.newsletter_subscribers
  for each row execute function longmont_private.set_updated_at();

create table public.newsletter_delivery_events (
  id uuid primary key default extensions.gen_random_uuid(),
  subscriber_id uuid references public.newsletter_subscribers(id) on delete set null,
  event_type text not null,
  provider text,
  provider_event_id text,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint newsletter_delivery_events_event_type_check
    check (
      event_type in (
        'subscribe',
        'listmonk_sync',
        'listmonk_campaign',
        'resend_notification',
        'unsubscribe',
        'bounce',
        'complaint',
        'draft_generated',
        'error'
      )
    ),
  constraint newsletter_delivery_events_payload_object_check
    check (jsonb_typeof(payload) = 'object')
);

create index newsletter_delivery_events_subscriber_created_idx
  on public.newsletter_delivery_events (subscriber_id, created_at desc);
create index newsletter_delivery_events_type_created_idx
  on public.newsletter_delivery_events (event_type, created_at desc);

create table public.newsletter_sources (
  id uuid primary key default extensions.gen_random_uuid(),
  source_key text not null unique,
  display_name text not null,
  source_type text not null,
  url text not null,
  lane text not null,
  priority text not null default 'core',
  active boolean not null default true,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint newsletter_sources_source_type_check
    check (source_type in ('website', 'model-watch', 'rss', 'html', 'api', 'research', 'benchmark')),
  constraint newsletter_sources_priority_check
    check (priority in ('core', 'open-weight', 'regional', 'community', 'archive')),
  constraint newsletter_sources_metadata_object_check
    check (jsonb_typeof(metadata) = 'object')
);

create index newsletter_sources_active_priority_idx
  on public.newsletter_sources (active, priority, display_name);

create trigger newsletter_sources_set_updated_at
  before update on public.newsletter_sources
  for each row execute function longmont_private.set_updated_at();

create table public.newsletter_issues (
  id uuid primary key default extensions.gen_random_uuid(),
  cadence text not null,
  period_start date not null,
  period_end date not null,
  status text not null default 'draft',
  subject text not null,
  preheader text,
  summary text not null,
  html_body text not null,
  text_body text not null,
  curator_model text,
  website_snapshot jsonb not null default '{}'::jsonb,
  source_urls text[] not null default '{}'::text[],
  listmonk_campaign_id integer,
  listmonk_campaign_status text,
  generated_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint newsletter_issues_cadence_check
    check (cadence in ('weekly', 'biweekly')),
  constraint newsletter_issues_period_check
    check (period_start <= period_end),
  constraint newsletter_issues_status_check
    check (status in ('draft', 'ready', 'scheduled', 'sent', 'archived', 'failed')),
  constraint newsletter_issues_website_snapshot_object_check
    check (jsonb_typeof(website_snapshot) = 'object')
);

create index newsletter_issues_status_generated_idx
  on public.newsletter_issues (status, generated_at desc);
create index newsletter_issues_period_idx
  on public.newsletter_issues (period_start, period_end);

create trigger newsletter_issues_set_updated_at
  before update on public.newsletter_issues
  for each row execute function longmont_private.set_updated_at();

create table public.newsletter_issue_items (
  id uuid primary key default extensions.gen_random_uuid(),
  issue_id uuid not null references public.newsletter_issues(id) on delete cascade,
  category text not null,
  title text not null,
  source_name text,
  source_url text,
  synthesis text not null,
  score integer not null default 50,
  sort_order integer not null default 0,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint newsletter_issue_items_category_check
    check (category in ('models', 'benchmarks', 'breakthroughs', 'agents', 'tools', 'policy', 'community', 'watchlist')),
  constraint newsletter_issue_items_score_check
    check (score between 0 and 100),
  constraint newsletter_issue_items_metadata_object_check
    check (jsonb_typeof(metadata) = 'object')
);

create index newsletter_issue_items_issue_order_idx
  on public.newsletter_issue_items (issue_id, sort_order, score desc);

insert into public.newsletter_sources (source_key, display_name, source_type, url, lane, priority, metadata)
values
  ('longmontai-home', 'LongmontAI Editions', 'website', 'https://longmontai.com/', 'Published meetup recaps and editorial archive', 'core', '{"owned": true}'::jsonb),
  ('longmontai-model-watch', 'LongmontAI Model Watch', 'model-watch', 'https://longmontai.com/model-watch', 'New model releases and source health', 'core', '{"owned": true}'::jsonb),
  ('longmontai-leaderboard', 'LongmontAI Leaderboard', 'benchmark', 'https://longmontai.com/leaderboard', 'Comparable benchmark movement', 'core', '{"owned": true}'::jsonb),
  ('longmontai-timeline', 'LongmontAI AI Timeline', 'website', 'https://longmontai.com/timeline', 'Historical context for frontier developments', 'archive', '{"owned": true}'::jsonb)
on conflict (source_key) do update
set
  display_name = excluded.display_name,
  source_type = excluded.source_type,
  url = excluded.url,
  lane = excluded.lane,
  priority = excluded.priority,
  metadata = excluded.metadata,
  updated_at = now();

alter table public.newsletter_subscribers enable row level security;
alter table public.newsletter_subscribers force row level security;
alter table public.newsletter_delivery_events enable row level security;
alter table public.newsletter_delivery_events force row level security;
alter table public.newsletter_sources enable row level security;
alter table public.newsletter_sources force row level security;
alter table public.newsletter_issues enable row level security;
alter table public.newsletter_issues force row level security;
alter table public.newsletter_issue_items enable row level security;
alter table public.newsletter_issue_items force row level security;

revoke all on table
  public.newsletter_subscribers,
  public.newsletter_delivery_events,
  public.newsletter_sources,
  public.newsletter_issues,
  public.newsletter_issue_items
from anon, authenticated;

grant select, insert, update, delete on table
  public.newsletter_subscribers,
  public.newsletter_delivery_events,
  public.newsletter_sources,
  public.newsletter_issues,
  public.newsletter_issue_items
to service_role;

comment on table public.newsletter_subscribers is
  'Server-owned newsletter intake records. RLS is forced; browser clients subscribe through /api/newsletter/subscribe.';
comment on table public.newsletter_issues is
  'AI-curated newsletter drafts synthesized from LongmontAI website data and monitored AI sources.';
comment on table public.newsletter_sources is
  'Source inventory used by the newsletter curation workflow.';
