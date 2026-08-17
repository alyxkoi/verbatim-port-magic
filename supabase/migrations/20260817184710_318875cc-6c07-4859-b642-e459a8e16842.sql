delete from blip_release where number > 1;
update blip_release set status = 'active' where number = 1;
update blip_config_item set value = jsonb_set(value, '{maxSentences}', '3') where key = 'behavior' and value ? 'maxSentences';
delete from blip_correction_learning;
delete from blip_correction;
delete from message;
delete from lead;