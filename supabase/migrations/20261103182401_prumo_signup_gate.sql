-- Cadastro controlado por chaves em prumo_private (sem policy: so o banco le).
--   signup_open = 'true' abre o cadastro; qualquer outro valor fecha (o dono sempre entra).
--   signup_max  = teto de contas, freio contra abuso ate existirem limites por plano.
insert into public.prumo_private (key, value) values ('signup_open', 'false'), ('signup_max', '200')
  on conflict (key) do nothing;

create or replace function public.prumo_signup_gate()
returns trigger language plpgsql security definer set search_path = '' as $$
declare open text; mx int; n int;
begin
  if coalesce(lower(new.email), '') = '<owner_email>' then return new; end if;
  if new.email is null or char_length(new.email) > 254 then raise exception 'Cadastro indisponivel'; end if;
  select value into open from public.prumo_private where key = 'signup_open';
  if coalesce(open, 'false') <> 'true' then raise exception 'Cadastro indisponivel'; end if;
  select coalesce(nullif(value, '')::int, 0) into mx from public.prumo_private where key = 'signup_max';
  select count(*) into n from auth.users;
  if n >= coalesce(mx, 0) then raise exception 'Cadastro indisponivel'; end if;
  return new;
end $$;
revoke all on function public.prumo_signup_gate() from public, anon, authenticated;

drop trigger if exists prumo_lock_signup on auth.users;
create trigger prumo_signup_gate before insert on auth.users for each row execute function public.prumo_signup_gate();
drop function if exists public.prumo_lock_signup();
