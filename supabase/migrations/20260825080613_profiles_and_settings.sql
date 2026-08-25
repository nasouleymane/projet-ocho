-- Comptes utilisateurs (phase 1) - profil et reglages synchronises par compte.
-- Une ligne par utilisateur pour chaque table (user_id = cle primaire), miroir
-- des stores locales Profile (src/lib/nutrition.ts) et Settings
-- (src/store/settings.tsx). RLS scopee au proprietaire (auth.uid() = user_id),
-- a la difference de la lecture publique de ciqual_foods.

create table if not exists profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  sex text not null check (sex in ('homme', 'femme')),
  age integer not null,
  height_cm numeric not null,
  weight_kg numeric not null,
  target_weight_kg numeric not null,
  activity text not null check (activity in ('sedentaire', 'leger', 'modere', 'actif', 'tres_actif')),
  goal text not null check (goal in ('seche', 'maintien', 'prise')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table profiles enable row level security;

drop policy if exists "Select own profile" on profiles;
create policy "Select own profile"
  on profiles for select
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists "Insert own profile" on profiles;
create policy "Insert own profile"
  on profiles for insert
  to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "Update own profile" on profiles;
create policy "Update own profile"
  on profiles for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Delete own profile" on profiles;
create policy "Delete own profile"
  on profiles for delete
  to authenticated
  using (auth.uid() = user_id);

create table if not exists user_settings (
  user_id uuid primary key references auth.users(id) on delete cascade,
  theme_mode text not null default 'system' check (theme_mode in ('light', 'dark', 'system')),
  units text not null default 'metric' check (units in ('metric', 'imperial')),
  notifications jsonb not null default '{"hydration":false,"meals":false,"workout":false,"weeklyWeighIn":false,"goalReached":false}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table user_settings enable row level security;

drop policy if exists "Select own settings" on user_settings;
create policy "Select own settings"
  on user_settings for select
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists "Insert own settings" on user_settings;
create policy "Insert own settings"
  on user_settings for insert
  to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "Update own settings" on user_settings;
create policy "Update own settings"
  on user_settings for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Delete own settings" on user_settings;
create policy "Delete own settings"
  on user_settings for delete
  to authenticated
  using (auth.uid() = user_id);
