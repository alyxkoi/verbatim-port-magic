-- ============ 2.1 leads and conversation ============
create table public.lead (
  id                uuid primary key default gen_random_uuid(),
  business          text not null,
  contact           text,
  phone             text,
  email             text,
  source            text,
  vertical          text,
  stage             text not null default 'new',
  screening_state   text not null default 'clean',
  automation_state  text not null default 'active',
  qualification_state text not null default 'incomplete',
  engagement_state  text not null default 'fresh',
  call_requested_at timestamptz,
  pillars           jsonb not null default '{}',
  tags              text[] not null default '{}',
  nudge_count       int not null default 0,
  last_inbound_at   timestamptz,
  last_outbound_at  timestamptz,
  consent_at        timestamptz,
  opted_out_at      timestamptz,
  created_at        timestamptz not null default now(),
  constraint lead_stage_check check (stage in ('new','talking','won','closed')),
  constraint lead_screening_state_check check (screening_state in ('clean','soft_flag','held','junk')),
  constraint lead_automation_state_check check (automation_state in ('active','paused_takeover','paused_call','opted_out','killed')),
  constraint lead_qualification_state_check check (qualification_state in ('incomplete','complete','needs_review')),
  constraint lead_engagement_state_check check (engagement_state in ('fresh','replying','stalled','cold'))
);

-- ============ 2.5 blip (blip_release first, message references it) ============
create table public.blip_release (
  id                    uuid primary key default gen_random_uuid(),
  number                int not null unique,
  status                text not null default 'draft',
  config_snapshot       jsonb not null,
  knowledge_snapshot    jsonb not null,
  compiled_prompts      jsonb not null,
  app_version           text,
  parent_release_id     uuid references public.blip_release(id),
  notes                 text,
  created_at            timestamptz not null default now(),
  promoted_at           timestamptz,
  constraint blip_release_status_check check (status in ('draft','active','archived'))
);

create table public.message (
  id                uuid primary key default gen_random_uuid(),
  lead_id           uuid not null references public.lead(id) on delete cascade,
  direction         text not null,
  body              text not null,
  status            text not null default 'queued',
  send_after        timestamptz,
  sent_at           timestamptz,
  provider_id       text unique,
  segments          int not null default 1,
  blip_release_id   uuid references public.blip_release(id),
  app_version       text,
  validation_retries int not null default 0,
  held_reason       text,
  authored_by       text not null default 'blip',
  created_at        timestamptz not null default now(),
  constraint message_direction_check check (direction in ('inbound','outbound')),
  constraint message_status_check check (status in ('queued','sent','delivered','failed','held','cancelled')),
  constraint message_authored_by_check check (authored_by in ('blip','alyx'))
);
create index message_lead_created_idx on public.message (lead_id, created_at);
create index message_queue_idx on public.message (status, send_after) where status = 'queued';

-- ============ 2.3 pricing ============
create table public.pricing_ruleset (
  id             uuid primary key default gen_random_uuid(),
  number         int not null unique,
  effective_from timestamptz not null default now(),
  tiers          jsonb not null,
  tag_floors     jsonb not null,
  features       jsonb not null,
  created_at     timestamptz not null default now()
);

create table public.plan (
  id                     uuid primary key default gen_random_uuid(),
  lead_id                uuid not null references public.lead(id),
  tier                   text not null,
  monthly                int not null,
  setup                  int not null,
  reason                 text not null,
  headline               text,
  situation              text,
  problems               jsonb,
  closing                text,
  status                 text not null default 'drafted',
  pricing_ruleset_version int not null,
  blip_release_id        uuid references public.blip_release(id),
  override_reason        text,
  slug                   text unique,
  ready_at               timestamptz,
  sent_at                timestamptz,
  expires_at             timestamptz,
  views                  int not null default 0,
  created_at             timestamptz not null default now(),
  constraint plan_status_check check (status in ('drafted','sent','won','expired')),
  constraint plan_tier_check check (tier in ('Presence','Connected','Operations'))
);

-- ============ 2.4 clients ============
create table public.client (
  id                uuid primary key default gen_random_uuid(),
  lead_id           uuid references public.lead(id),
  plan_id           uuid references public.plan(id),
  name              text not null,
  contact           text,
  tier              text not null,
  term              text not null default 'monthly',
  started_at        date not null,
  ends_at           date,
  sent_number       text,
  sent_subaccount_id text,
  status            text not null default 'active',
  created_at        timestamptz not null default now(),
  constraint client_term_check check (term in ('monthly','annual')),
  constraint client_status_check check (status in ('active','paused','ended')),
  constraint client_tier_check check (tier in ('Presence','Connected','Operations'))
);

create table public.client_payment_connection (
  id                   uuid primary key default gen_random_uuid(),
  client_id            uuid not null references public.client(id),
  provider             text not null default 'stripe',
  stripe_account_id    text not null,
  stripe_business_name text,
  stripe_last4         text,
  scope                text not null default 'read_only',
  connection_status    text not null default 'pending',
  connected_at         timestamptz,
  disconnected_at      timestamptz,
  last_sync_at         timestamptz,
  last_error           text,
  created_at           timestamptz not null default now(),
  unique (provider, stripe_account_id),
  constraint cpc_status_check check (connection_status in ('pending','connected','disconnected','revoked_by_client','error'))
);

create table public.client_usage (
  id             uuid primary key default gen_random_uuid(),
  client_id      uuid not null references public.client(id),
  period_start   date not null,
  segments_used  int not null default 0,
  warned_at_80   timestamptz,
  unique (client_id, period_start)
);

create table public.blip_config_item (
  key        text primary key,
  area       text not null,
  value      jsonb not null,
  updated_at timestamptz not null default now(),
  constraint blip_config_item_area_check check (area in ('behavior','logic','knowledge'))
);

create table public.blip_correction (
  id              uuid primary key default gen_random_uuid(),
  lead_id         uuid references public.lead(id),
  message_id      uuid references public.message(id),
  blip_release_id uuid references public.blip_release(id),
  blip_draft      text not null,
  alyx_actual     text not null,
  kind            text not null,
  resolved_at     timestamptz,
  created_at      timestamptz not null default now(),
  constraint blip_correction_kind_check check (kind in ('takeover','edited_before_send','plan_copy_edit'))
);

create table public.blip_correction_learning (
  id            uuid primary key default gen_random_uuid(),
  correction_id uuid not null references public.blip_correction(id) on delete cascade,
  area          text not null,
  status        text not null default 'proposed',
  constraint bcl_area_check check (area in ('behavior','logic','knowledge','example','none')),
  constraint bcl_status_check check (status in ('proposed','accepted','dismissed'))
);

create table public.blip_replay_run (
  id                 uuid primary key default gen_random_uuid(),
  release_id         uuid not null references public.blip_release(id),
  conversation_count int not null,
  metrics            jsonb not null,
  created_at         timestamptz not null default now()
);

-- ============ 2.6 operational ============
create table public.runtime_state (
  id             int primary key default 1,
  autonomy_level text not null default 'draft',
  kill_switch    boolean not null default false,
  updated_at     timestamptz not null default now(),
  constraint runtime_state_single_row check (id = 1),
  constraint runtime_state_autonomy_check check (autonomy_level in ('draft','assisted','live'))
);

create table public.app_setting (
  id                  int primary key default 1,
  required_pillars    jsonb not null,
  vertical_questions  jsonb not null,
  first_followup_min  int not null default 8,
  reply_delay_min_sec int not null default 30,
  reply_delay_max_sec int not null default 60,
  stall_nudge_hours   int not null default 24,
  max_nudges          int not null default 2,
  quiet_start         time not null default '21:00',
  quiet_end           time not null default '08:00',
  timezone            text not null default 'America/Chicago',
  constraint app_setting_single_row check (id = 1)
);

create table public.calendar_event (
  id          uuid primary key default gen_random_uuid(),
  lead_id     uuid references public.lead(id),
  kind        text not null,
  starts_at   timestamptz not null,
  ends_at     timestamptz not null,
  title       text,
  created_at  timestamptz not null default now(),
  constraint calendar_event_kind_check check (kind in ('call','block'))
);
create index calendar_event_starts_idx on public.calendar_event (starts_at);

create table public.link_group (
  id uuid primary key default gen_random_uuid(),
  parent_id uuid references public.link_group(id),
  name text not null,
  position int not null default 0
);

create table public.tracked_link (
  id           uuid primary key default gen_random_uuid(),
  group_id     uuid references public.link_group(id),
  label        text not null,
  slug         text not null unique,
  destination  text not null,
  clicks       int not null default 0,
  real_clicks  int not null default 0,
  forms        int not null default 0,
  created_at   timestamptz not null default now()
);

create table public.event_log (
  id         uuid primary key default gen_random_uuid(),
  entity     text not null,
  entity_id  uuid,
  action     text not null,
  detail     jsonb,
  app_version text,
  created_at timestamptz not null default now()
);
create index event_log_entity_idx on public.event_log (entity, entity_id, created_at);

create table public.webhook_event (
  event_id     text primary key,
  source       text not null,
  account_id   text,
  received_at  timestamptz not null default now(),
  processed_at timestamptz,
  constraint webhook_event_source_check check (source in ('sent','stripe_connect','stripe_platform'))
);

create table public.stripe_oauth_state (
  nonce       text primary key,
  client_id   uuid not null references public.client(id),
  scope       text not null,
  expires_at  timestamptz not null,
  consumed_at timestamptz
);

-- Server-side login throttling. Service role only; never readable by the browser.
create table public.login_attempt (
  id         uuid primary key default gen_random_uuid(),
  email_key  text not null,
  ip         text,
  succeeded  boolean not null default false,
  created_at timestamptz not null default now()
);
create index login_attempt_lookup_idx on public.login_attempt (email_key, created_at desc);
create index login_attempt_ip_idx on public.login_attempt (ip, created_at desc);

-- ============ 2.7 RLS: single operator ============
do $$
declare t text;
begin
  foreach t in array array[
    'lead','message','pricing_ruleset','plan','client','client_payment_connection',
    'client_usage','blip_release','blip_config_item','blip_correction',
    'blip_correction_learning','blip_replay_run','runtime_state','app_setting',
    'calendar_event','link_group','tracked_link','webhook_event','stripe_oauth_state'
  ]
  loop
    execute format('grant select, insert, update, delete on public.%I to authenticated', t);
    execute format('grant all on public.%I to service_role', t);
    execute format('alter table public.%I enable row level security', t);
    execute format('create policy "operator_all" on public.%I for all to authenticated using (true) with check (true)', t);
  end loop;
end $$;

-- event_log is append only: no update, no delete for the operator.
grant select, insert on public.event_log to authenticated;
grant all on public.event_log to service_role;
alter table public.event_log enable row level security;
create policy "operator_read" on public.event_log for select to authenticated using (true);
create policy "operator_append" on public.event_log for insert to authenticated with check (true);

-- login_attempt: service role only.
grant all on public.login_attempt to service_role;
alter table public.login_attempt enable row level security;

-- ============ 3. seeds ============
insert into public.runtime_state (id, autonomy_level, kill_switch) values (1, 'draft', false);

insert into public.app_setting (id, required_pillars, vertical_questions) values (
  1,
  '[
    {"key":"business_type","label":"Business type","type":"choice"},
    {"key":"staff_count","label":"Staff count","type":"integer"},
    {"key":"location_count","label":"Locations","type":"integer"},
    {"key":"takes_payments","label":"Takes payments","type":"boolean"},
    {"key":"primary_struggle","label":"Primary struggle","type":"tag_array"}
  ]'::jsonb,
  '{
    "barbershop": [],
    "clinic": [],
    "home_services": [],
    "restaurant": [],
    "dealership": [],
    "other": []
  }'::jsonb
);

insert into public.pricing_ruleset (number, tiers, tag_floors, features) values (
  1,
  '{
    "Presence":   {"price": 97,  "setup": 297, "setup_annual": 149, "segments": 2000},
    "Connected":  {"price": 249, "setup": 597, "setup_annual": 299, "segments": 6000},
    "Operations": {"price": 499, "setup": 997, "setup_annual": 499, "segments": 12000}
  }'::jsonb,
  '{
    "slow_follow_up": "Presence",
    "after_hours": "Presence",
    "missed_calls": "Connected",
    "no_shows": "Connected",
    "deposits_payments": "Connected",
    "intake_forms": "Connected",
    "review_requests": "Connected",
    "multi_location_routing": "Operations",
    "dedicated_line": "Operations",
    "rebooking_recalls": "Operations",
    "unclear": null
  }'::jsonb,
  '{
    "follow_up_automation": "Presence",
    "after_hours_reply": "Presence",
    "missed_call_text_back": "Connected",
    "reminders_no_show_recovery": "Connected",
    "deposits_and_payments": "Connected",
    "intake_forms": "Connected",
    "review_requests": "Connected",
    "multi_location_routing": "Operations",
    "dedicated_line": "Operations",
    "rebooking_and_recalls": "Operations"
  }'::jsonb
);