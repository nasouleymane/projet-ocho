-- Comptes utilisateurs (phase 3) - photos de progression synchronisees.
-- Seules les metadonnees vivent en table ; les octets de l'image vont dans
-- le bucket Storage prive `progress-photos`, objets ranges sous
-- `{user_id}/{filename}` pour que les policies Storage scopent par dossier.

create table if not exists progress_photos (
  id uuid primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  date date not null,
  storage_path text not null,
  created_at timestamptz not null default now()
);

create index if not exists progress_photos_user_date_idx on progress_photos (user_id, date);

alter table progress_photos enable row level security;

drop policy if exists "Select own progress photos" on progress_photos;
create policy "Select own progress photos"
  on progress_photos for select
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists "Insert own progress photos" on progress_photos;
create policy "Insert own progress photos"
  on progress_photos for insert
  to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "Delete own progress photos" on progress_photos;
create policy "Delete own progress photos"
  on progress_photos for delete
  to authenticated
  using (auth.uid() = user_id);

insert into storage.buckets (id, name, public)
values ('progress-photos', 'progress-photos', false)
on conflict (id) do nothing;

-- Objets ranges sous `{user_id}/{filename}` : storage.foldername(name) renvoie
-- les segments du chemin, [1] est donc le user_id proprietaire du dossier.
drop policy if exists "Select own progress photo objects" on storage.objects;
create policy "Select own progress photo objects"
  on storage.objects for select
  to authenticated
  using (bucket_id = 'progress-photos' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "Insert own progress photo objects" on storage.objects;
create policy "Insert own progress photo objects"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'progress-photos' and (storage.foldername(name))[1] = auth.uid()::text);

-- Requise pour upload(..., { upsert: true }) : un re-upload sur un chemin
-- existant passe par une mise a jour cote serveur Storage, pas seulement un insert.
drop policy if exists "Update own progress photo objects" on storage.objects;
create policy "Update own progress photo objects"
  on storage.objects for update
  to authenticated
  using (bucket_id = 'progress-photos' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "Delete own progress photo objects" on storage.objects;
create policy "Delete own progress photo objects"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'progress-photos' and (storage.foldername(name))[1] = auth.uid()::text);
