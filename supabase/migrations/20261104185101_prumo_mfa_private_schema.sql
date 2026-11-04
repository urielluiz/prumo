-- A funcao das policies sai do schema public (exposto pela API) para prumo_sec (nao exposto).
create schema if not exists prumo_sec;
revoke all on schema prumo_sec from public, anon;
grant usage on schema prumo_sec to authenticated;
create or replace function prumo_sec.aal_ok() returns boolean
language sql stable security definer set search_path = '' as $$
  select coalesce((select auth.jwt()->>'aal'), 'aal1') = 'aal2'
      or not exists (select 1 from auth.mfa_factors f where f.user_id = (select auth.uid()) and f.status = 'verified');
$$;
revoke all on function prumo_sec.aal_ok() from public, anon;
grant execute on function prumo_sec.aal_ok() to authenticated;

alter policy prumo_items_aal on public.prumo_items using ((select prumo_sec.aal_ok())) with check ((select prumo_sec.aal_ok()));
alter policy prumo_push_subs_aal on public.prumo_push_subs using ((select prumo_sec.aal_ok())) with check ((select prumo_sec.aal_ok()));
alter policy prumo_timers_aal on public.prumo_timers using ((select prumo_sec.aal_ok())) with check ((select prumo_sec.aal_ok()));
alter policy prumo_reminders_aal on public.prumo_reminders using ((select prumo_sec.aal_ok())) with check ((select prumo_sec.aal_ok()));
alter policy prumo_avatars_aal on storage.objects using (bucket_id <> 'avatars' or (select prumo_sec.aal_ok())) with check (bucket_id <> 'avatars' or (select prumo_sec.aal_ok()));
drop function public.prumo_aal_ok();
