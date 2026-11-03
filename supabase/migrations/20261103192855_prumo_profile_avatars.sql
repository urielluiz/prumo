-- Perfil: nome e referencia da foto sincronizam como item 'prof' (id 'me').
alter table public.prumo_items drop constraint prumo_items_kind_check;
alter table public.prumo_items add constraint prumo_items_kind_check
  check (kind = any (array['task','cap','ctx','retro','blk','log','rec','prof']));

-- Fotos: bucket privado. O app reduz para 256 px e regrava (sem metadados) antes de enviar.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('avatars', 'avatars', false, 262144, array['image/jpeg', 'image/webp'])
on conflict (id) do update set public = false, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

-- Cada conta so enxerga e grava <seu id>/avatar.jpg ou <seu id>/avatar.webp.
create policy "avatars_own_select" on storage.objects for select to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "avatars_own_insert" on storage.objects for insert to authenticated
  with check (bucket_id = 'avatars' and name ~ ('^' || (select auth.uid())::text || '/avatar\.(jpg|webp)$'));
create policy "avatars_own_update" on storage.objects for update to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text)
  with check (bucket_id = 'avatars' and name ~ ('^' || (select auth.uid())::text || '/avatar\.(jpg|webp)$'));
create policy "avatars_own_delete" on storage.objects for delete to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);
