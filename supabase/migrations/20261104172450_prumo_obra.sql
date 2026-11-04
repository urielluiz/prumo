-- Obra (gamificacao fase 1): item 'day' por data (dia fechado, Sapo de amanha), preferencias em 'cap/g',
-- lembrete 'close' (fechar o dia) que abre o app em ./?fechar=1.
alter table public.prumo_items drop constraint prumo_items_kind_check;
alter table public.prumo_items add constraint prumo_items_kind_check
  check (kind = any (array['task','cap','ctx','retro','blk','log','rec','prof','day']));
alter table public.prumo_reminders drop constraint prumo_reminders_kind_check;
alter table public.prumo_reminders add constraint prumo_reminders_kind_check check (kind in ('day', 'wrap', 'close'));
alter table public.prumo_reminders drop constraint prumo_reminders_url_check;
alter table public.prumo_reminders add constraint prumo_reminders_url_check
  check (url is null or url in ('./', './?retro=1', './?fechar=1'));

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
    if new.kind = 'prof' and not new.deleted then
      if new.id <> 'me' or char_length(coalesce(new.data->>'name', '')) > 60
         or (new.data ? 'avk' and new.data->>'avk' !~ ('^' || new.user_id::text || '/avatar\.(jpg|webp)$')) then
        raise exception 'prumo: perfil invalido' using errcode = 'P0001';
      end if;
    end if;
    if new.kind = 'day' and (new.id !~ '^\d{4}-\d{2}-\d{2}$' or pg_column_size(new.data) > 1024) then
      raise exception 'prumo: dia invalido' using errcode = 'P0001';
    end if;
    if new.kind = 'cap' and (new.id not in ('cap', 'g') or pg_column_size(new.data) > 1024) then
      raise exception 'prumo: preferencia invalida' using errcode = 'P0001';
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
