DELETE FROM public.message;
DELETE FROM public.event_log;
DELETE FROM public.lead;
UPDATE public.app_setting SET max_nudges = 2, required_pillars = jsonb_set(required_pillars, '{0,label}', '"Business type"') WHERE id = 1;
UPDATE public.blip_config_item SET value = value || '{"everyLead": false}'::jsonb WHERE key = 'notifications';