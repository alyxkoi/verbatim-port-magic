alter table public.lead
  add column if not exists sms_consent_requested_at timestamptz,
  add column if not exists email_consent_at timestamptz;

comment on column public.lead.sms_consent_requested_at is
  'When the visitor separately requested the Alyxlab customer care SMS double opt-in.';

comment on column public.lead.email_consent_at is
  'When the visitor separately opted in to Alyxlab customer care email.';