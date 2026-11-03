create table public.prumo_items (
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  kind text not null check (kind in ('task','cap','ctx','retro','blk','log')),
  id text not null check (char_length(id) between 1 and 64),
  data jsonb not null default '{}'::jsonb check (pg_column_size(data) < 65536),
  deleted boolean not null default false,
  updated_at bigint not null,
  primary key (user_id, kind, id)
);

comment on table public.prumo_items is 'Prumo: um item por linha (tarefa, capacidade, contextos, retrospectiva, trava do dia, log de foco). Ultima edicao vence.';

alter table public.prumo_items enable row level security;

revoke all on public.prumo_items from anon;
grant select, insert, update, delete on public.prumo_items to authenticated;

create policy "prumo_items_select_own" on public.prumo_items
  for select to authenticated using ((select auth.uid()) = user_id);
create policy "prumo_items_insert_own" on public.prumo_items
  for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "prumo_items_update_own" on public.prumo_items
  for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "prumo_items_delete_own" on public.prumo_items
  for delete to authenticated using ((select auth.uid()) = user_id);

-- Ultima edicao vence: uma escrita mais antiga que a ja gravada e ignorada.
create function public.prumo_items_keep_newest()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.updated_at < old.updated_at then
    return null;
  end if;
  return new;
end;
$$;

create trigger prumo_items_keep_newest
  before update on public.prumo_items
  for each row execute function public.prumo_items_keep_newest();

alter publication supabase_realtime add table public.prumo_items;
