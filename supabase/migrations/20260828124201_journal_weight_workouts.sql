-- Comptes utilisateurs (phase 2) - journal alimentaire, poids et seances
-- synchronises par compte. Meme pattern RLS que profiles/user_settings :
-- id genere client (uuid, Crypto.randomUUID()) plutot que gen_random_uuid()
-- cote serveur, car l'app assigne deja un id de facon synchrone et l'utilise
-- immediatement (ex. addEntry() du journal renvoie le streak resultant dans
-- le meme appel, jamais apres un aller-retour reseau).

create table if not exists journal_entries (
  id uuid primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  date date not null,
  meal_type text not null check (meal_type in ('petit-dejeuner', 'dejeuner', 'diner', 'collation')),
  name text not null,
  quantity_label text not null,
  kcal numeric not null,
  protein_g numeric not null,
  carbs_g numeric not null,
  fat_g numeric not null,
  created_at timestamptz not null default now()
);

create index if not exists journal_entries_user_date_idx on journal_entries (user_id, date);

alter table journal_entries enable row level security;

drop policy if exists "Select own journal entries" on journal_entries;
create policy "Select own journal entries"
  on journal_entries for select
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists "Insert own journal entries" on journal_entries;
create policy "Insert own journal entries"
  on journal_entries for insert
  to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "Delete own journal entries" on journal_entries;
create policy "Delete own journal entries"
  on journal_entries for delete
  to authenticated
  using (auth.uid() = user_id);

create table if not exists favorite_foods (
  id uuid primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  quantity_label text not null,
  kcal numeric not null,
  protein_g numeric not null,
  carbs_g numeric not null,
  fat_g numeric not null,
  created_at timestamptz not null default now()
);

alter table favorite_foods enable row level security;

drop policy if exists "Select own favorite foods" on favorite_foods;
create policy "Select own favorite foods"
  on favorite_foods for select
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists "Insert own favorite foods" on favorite_foods;
create policy "Insert own favorite foods"
  on favorite_foods for insert
  to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "Delete own favorite foods" on favorite_foods;
create policy "Delete own favorite foods"
  on favorite_foods for delete
  to authenticated
  using (auth.uid() = user_id);

create table if not exists weight_entries (
  id uuid primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  date date not null,
  weight_kg numeric not null,
  created_at timestamptz not null default now()
);

create index if not exists weight_entries_user_date_idx on weight_entries (user_id, date);

alter table weight_entries enable row level security;

drop policy if exists "Select own weight entries" on weight_entries;
create policy "Select own weight entries"
  on weight_entries for select
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists "Insert own weight entries" on weight_entries;
create policy "Insert own weight entries"
  on weight_entries for insert
  to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "Delete own weight entries" on weight_entries;
create policy "Delete own weight entries"
  on weight_entries for delete
  to authenticated
  using (auth.uid() = user_id);

-- exercises en jsonb plutot qu'une table enfant : toujours ecrit/lu comme un
-- bloc unique avec sa seance parente (add-workout.tsx), rien ne filtre un
-- exercice independamment de sa seance aujourd'hui.
create table if not exists workouts (
  id uuid primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  date date not null,
  type text not null check (type in ('musculation', 'cardio', 'hiit', 'football', 'basketball', 'natation', 'autre')),
  duration_min integer not null,
  kcal_burned numeric not null,
  exercises jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists workouts_user_date_idx on workouts (user_id, date);

alter table workouts enable row level security;

drop policy if exists "Select own workouts" on workouts;
create policy "Select own workouts"
  on workouts for select
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists "Insert own workouts" on workouts;
create policy "Insert own workouts"
  on workouts for insert
  to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "Delete own workouts" on workouts;
create policy "Delete own workouts"
  on workouts for delete
  to authenticated
  using (auth.uid() = user_id);
