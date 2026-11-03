alter table public.prumo_items drop constraint prumo_items_kind_check;
alter table public.prumo_items add constraint prumo_items_kind_check check (kind = any (array['task','cap','ctx','retro','blk','log','rec']));

alter table public.prumo_reminders add column kind text not null default 'day';
alter table public.prumo_reminders add column url text;
alter table public.prumo_reminders drop constraint prumo_reminders_pkey;
alter table public.prumo_reminders add primary key (user_id, day, kind);

create or replace function public.prumo_lock_signup() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if coalesce(lower(new.email), '') <> '<owner_email>' then
    raise exception 'Cadastro fechado';
  end if;
  return new;
end $$;
revoke execute on function public.prumo_lock_signup() from public, anon, authenticated;
create trigger prumo_lock_signup before insert on auth.users for each row execute function public.prumo_lock_signup();
