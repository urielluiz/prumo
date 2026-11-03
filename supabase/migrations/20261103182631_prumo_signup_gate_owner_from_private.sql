-- O e-mail do dono fica em prumo_private.owner_email (fora do codigo e do repositorio publico).
-- (O valor foi inserido direto no banco, fora de migracao.)
create or replace function public.prumo_signup_gate()
returns trigger language plpgsql security definer set search_path = '' as $$
declare open text; mx int; n int; owner text;
begin
  select value into owner from public.prumo_private where key = 'owner_email';
  if owner is not null and coalesce(lower(new.email), '') = lower(owner) then return new; end if;
  if new.email is null or char_length(new.email) > 254 then raise exception 'Cadastro indisponivel'; end if;
  select value into open from public.prumo_private where key = 'signup_open';
  if coalesce(open, 'false') <> 'true' then raise exception 'Cadastro indisponivel'; end if;
  select coalesce(nullif(value, '')::int, 0) into mx from public.prumo_private where key = 'signup_max';
  select count(*) into n from auth.users;
  if n >= coalesce(mx, 0) then raise exception 'Cadastro indisponivel'; end if;
  return new;
end $$;
revoke all on function public.prumo_signup_gate() from public, anon, authenticated;
