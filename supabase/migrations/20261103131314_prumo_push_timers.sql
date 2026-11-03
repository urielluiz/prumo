create extension if not exists pg_cron;
create extension if not exists pg_net;

create table public.prumo_push_subs(
  endpoint text primary key,
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  p256dh text not null, auth text not null,
  created_at timestamptz not null default now());
create table public.prumo_timers(
  user_id uuid primary key default auth.uid() references auth.users(id) on delete cascade,
  ends_at timestamptz not null, title text not null, body text not null,
  sent boolean not null default false, updated_at timestamptz not null default now());
create table public.prumo_private(key text primary key, value text not null);

alter table public.prumo_push_subs enable row level security;
alter table public.prumo_timers enable row level security;
alter table public.prumo_private enable row level security;
revoke all on public.prumo_private from anon, authenticated;

create policy "subs own" on public.prumo_push_subs for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "timers own" on public.prumo_timers for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create index on public.prumo_push_subs(user_id);
create index on public.prumo_timers(ends_at) where not sent;

insert into public.prumo_private(key,value) values
 ('vapid_public','<redigido>'),('vapid_private','<redigido>'),('cron_secret','<redigido>');

select cron.schedule('prumo-push','10 seconds',$$
 select net.http_post(
   url:='https://cpdeptlintjvdqcfrafg.supabase.co/functions/v1/prumo-push',
   headers:=jsonb_build_object('Content-Type','application/json','x-cron-secret',(select value from public.prumo_private where key='cron_secret')),
   body:='{}'::jsonb)
 where exists (select 1 from public.prumo_timers where not sent and ends_at + interval '4 seconds' <= now())
$$);
