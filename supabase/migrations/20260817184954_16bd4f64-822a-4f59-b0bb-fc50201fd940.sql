-- Reconciliation datasets stay in two separate tables so the platform's own
-- money and clients' customer money can never be merged.
create table public.retainer_payment (
  id               uuid primary key default gen_random_uuid(),
  client_id        uuid references public.client(id),
  stripe_object_id text not null unique,
  kind             text not null,
  amount_cents     int not null default 0,
  currency         text not null default 'usd',
  status           text not null default 'succeeded',
  customer_email   text,
  description      text,
  occurred_at      timestamptz not null default now(),
  matched_at       timestamptz,
  created_at       timestamptz not null default now()
);

create table public.client_customer_payment (
  id                uuid primary key default gen_random_uuid(),
  client_id         uuid not null references public.client(id),
  stripe_account_id text not null,
  stripe_object_id  text not null,
  kind              text not null,
  amount_cents      int not null default 0,
  currency          text not null default 'usd',
  status            text not null default 'succeeded',
  occurred_at       timestamptz not null default now(),
  created_at        timestamptz not null default now(),
  unique (stripe_account_id, stripe_object_id, kind)
);
create index client_customer_payment_client_idx on public.client_customer_payment (client_id, occurred_at desc);

-- Overage is recorded so it can be displayed. It is never charged.
alter table public.client_usage
  add column if not exists overage_segments int not null default 0,
  add column if not exists warned_email_at timestamptz;

do $$
declare t text;
begin
  foreach t in array array['retainer_payment','client_customer_payment']
  loop
    execute format('alter table public.%I enable row level security', t);
    execute format('grant select, insert, update, delete on public.%I to authenticated', t);
    execute format('grant all on public.%I to service_role', t);
    execute format('revoke all on public.%I from anon', t);
    execute format('create policy "operator_all" on public.%I for all to authenticated using (true) with check (true)', t);
  end loop;
end $$;