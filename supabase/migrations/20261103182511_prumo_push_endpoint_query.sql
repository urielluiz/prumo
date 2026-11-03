alter table public.prumo_push_subs drop constraint prumo_push_subs_endpoint_check;
alter table public.prumo_push_subs add constraint prumo_push_subs_endpoint_check check (
  char_length(endpoint) <= 1024 and
  endpoint ~ '^https://(fcm\.googleapis\.com|updates\.push\.services\.mozilla\.com|web\.push\.apple\.com|[a-z0-9-]+\.notify\.windows\.com)/[A-Za-z0-9_:./%~=+?&-]+$');
