create table public.prumo_reminders(
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  day date not null,
  fire_at timestamptz not null,
  title text not null,
  body text not null,
  sent boolean not null default false,
  primary key (user_id, day));
alter table public.prumo_reminders enable row level security;
create policy "reminders own" on public.prumo_reminders for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create index on public.prumo_reminders(fire_at) where not sent;

select cron.schedule('prumo-push','10 seconds',$$
 select net.http_post(
   url:='https://cpdeptlintjvdqcfrafg.supabase.co/functions/v1/prumo-push',
   headers:=jsonb_build_object('Content-Type','application/json','x-cron-secret',(select value from public.prumo_private where key='cron_secret')),
   body:='{}'::jsonb)
 where exists (select 1 from public.prumo_timers where not sent and ends_at + interval '4 seconds' <= now())
    or exists (select 1 from public.prumo_reminders where not sent and fire_at <= now())
$$);
