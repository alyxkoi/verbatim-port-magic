create extension if not exists pg_cron with schema extensions;
create extension if not exists pg_net with schema extensions;

select cron.unschedule('alyxlab-message-worker') where exists (select 1 from cron.job where jobname = 'alyxlab-message-worker');
select cron.unschedule('alyxlab-daily-maintenance') where exists (select 1 from cron.job where jobname = 'alyxlab-daily-maintenance');

select cron.schedule(
  'alyxlab-message-worker',
  '* * * * *',
  $$
  select net.http_post(
    url := 'https://project--2dacd6ff-2e46-4ae0-95ff-29dec1a8b494.lovable.app/api/public/message-worker',
    headers := jsonb_build_object(
      'content-type', 'application/json',
      'x-cron-secret', '93d7a4cb63ed66b283c4f337c785f16db644b9b16224e30aa157438f40f2a0f2'
    ),
    body := '{}'::jsonb,
    timeout_milliseconds := 25000
  );
  $$
);

select cron.schedule(
  'alyxlab-daily-maintenance',
  '15 9 * * *',
  $$
  select net.http_post(
    url := 'https://project--2dacd6ff-2e46-4ae0-95ff-29dec1a8b494.lovable.app/api/public/daily-maintenance',
    headers := jsonb_build_object(
      'content-type', 'application/json',
      'x-cron-secret', '93d7a4cb63ed66b283c4f337c785f16db644b9b16224e30aa157438f40f2a0f2'
    ),
    body := '{}'::jsonb,
    timeout_milliseconds := 55000
  );
  $$
);