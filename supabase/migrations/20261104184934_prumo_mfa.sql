-- Verificacao em duas etapas: quem tem fator TOTP verificado so le e grava com sessao aal2.
-- Policies restritivas (somam-se as existentes) em todas as tabelas do app e na foto.
create or replace function public.prumo_aal_ok() returns boolean
language sql stable security definer set search_path = '' as $$
  select coalesce((select auth.jwt()->>'aal'), 'aal1') = 'aal2'
      or not exists (select 1 from auth.mfa_factors f where f.user_id = (select auth.uid()) and f.status = 'verified');
$$;
revoke all on function public.prumo_aal_ok() from public, anon;
grant execute on function public.prumo_aal_ok() to authenticated;

create policy prumo_items_aal on public.prumo_items as restrictive for all to authenticated
  using ((select public.prumo_aal_ok())) with check ((select public.prumo_aal_ok()));
create policy prumo_push_subs_aal on public.prumo_push_subs as restrictive for all to authenticated
  using ((select public.prumo_aal_ok())) with check ((select public.prumo_aal_ok()));
create policy prumo_timers_aal on public.prumo_timers as restrictive for all to authenticated
  using ((select public.prumo_aal_ok())) with check ((select public.prumo_aal_ok()));
create policy prumo_reminders_aal on public.prumo_reminders as restrictive for all to authenticated
  using ((select public.prumo_aal_ok())) with check ((select public.prumo_aal_ok()));
create policy prumo_avatars_aal on storage.objects as restrictive for all to authenticated
  using (bucket_id <> 'avatars' or (select public.prumo_aal_ok()))
  with check (bucket_id <> 'avatars' or (select public.prumo_aal_ok()));
