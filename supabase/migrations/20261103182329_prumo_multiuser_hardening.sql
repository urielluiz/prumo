-- 1) privilegios minimos: anon nao toca em nada; authenticated so CRUD (RLS continua valendo)
revoke all on public.prumo_items, public.prumo_push_subs, public.prumo_reminders, public.prumo_timers, public.prumo_private from anon;
revoke truncate, trigger, references on public.prumo_items, public.prumo_push_subs, public.prumo_reminders, public.prumo_timers from authenticated;
revoke all on public.prumo_private from authenticated;

-- 2) validacoes estaticas
alter table public.prumo_push_subs
  add constraint prumo_push_subs_endpoint_check check (
    char_length(endpoint) <= 1024 and
    endpoint ~ '^https://(fcm\.googleapis\.com|updates\.push\.services\.mozilla\.com|web\.push\.apple\.com|[a-z0-9-]+\.notify\.windows\.com)/[A-Za-z0-9_:./%~=+-]+$'),
  add constraint prumo_push_subs_keys_check check (char_length(p256dh) between 1 and 200 and char_length(auth) between 1 and 100);
alter table public.prumo_reminders
  add constraint prumo_reminders_kind_check check (kind in ('day', 'wrap')),
  add constraint prumo_reminders_text_check check (char_length(title) between 1 and 200 and char_length(body) <= 1000),
  add constraint prumo_reminders_url_check check (url is null or url in ('./', './?retro=1'));
alter table public.prumo_timers
  add constraint prumo_timers_text_check check (char_length(title) between 1 and 200 and char_length(body) <= 1000);

-- 3) limites por conta e por tempo (precisam de now() ou contagem: trigger)
create or replace function public.prumo_guard()
returns trigger language plpgsql security definer set search_path = '' as $$
declare n int;
begin
  if tg_table_name = 'prumo_items' then
    if tg_op = 'INSERT' and not exists (select 1 from public.prumo_items where user_id = new.user_id and kind = new.kind and id = new.id) then
      select count(*) into n from (select 1 from public.prumo_items where user_id = new.user_id limit 20000) s;
      if n >= 20000 then raise exception 'prumo: limite de itens da conta' using errcode = 'P0001'; end if;
    end if;
    if new.updated_at < 0 or new.updated_at > (extract(epoch from now()) * 1000)::bigint + 86400000 then
      raise exception 'prumo: updated_at fora do intervalo' using errcode = 'P0001';
    end if;
  elsif tg_table_name = 'prumo_push_subs' then
    if tg_op = 'INSERT' then
      select count(*) into n from public.prumo_push_subs where user_id = new.user_id;
      if n >= 10 then raise exception 'prumo: limite de aparelhos com aviso' using errcode = 'P0001'; end if;
    end if;
  elsif tg_table_name = 'prumo_reminders' then
    if new.fire_at > now() + interval '16 days' then raise exception 'prumo: lembrete distante demais' using errcode = 'P0001'; end if;
    if tg_op = 'INSERT' then
      select count(*) into n from public.prumo_reminders where user_id = new.user_id and not sent;
      if n >= 40 then raise exception 'prumo: limite de lembretes' using errcode = 'P0001'; end if;
    end if;
  elsif tg_table_name = 'prumo_timers' then
    if new.ends_at > now() + interval '2 days' then raise exception 'prumo: timer distante demais' using errcode = 'P0001'; end if;
  end if;
  return new;
end $$;
revoke all on function public.prumo_guard() from public, anon, authenticated;

create trigger prumo_items_guard before insert or update on public.prumo_items for each row execute function public.prumo_guard();
create trigger prumo_push_subs_guard before insert or update on public.prumo_push_subs for each row execute function public.prumo_guard();
create trigger prumo_reminders_guard before insert or update on public.prumo_reminders for each row execute function public.prumo_guard();
create trigger prumo_timers_guard before insert or update on public.prumo_timers for each row execute function public.prumo_guard();

revoke all on function public.prumo_items_keep_newest() from public, anon, authenticated;
