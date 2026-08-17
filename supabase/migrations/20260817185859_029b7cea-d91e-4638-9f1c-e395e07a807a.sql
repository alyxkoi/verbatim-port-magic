alter table public.client_payment_connection
  add constraint client_payment_connection_client_id_key unique (client_id);