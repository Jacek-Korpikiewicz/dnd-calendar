-- Slot type enum
create type time_slot as enum ('morning', 'afternoon', 'evening');

-- Session status enum
create type session_status as enum ('proposed', 'confirmed');

-- Players table (linked to auth.users)
create table players (
  id uuid primary key references auth.users(id) on delete cascade,
  email text unique not null,
  display_name text,
  is_dm boolean default false,
  created_at timestamptz default now()
);

-- Availability table
create table availability (
  id uuid primary key default gen_random_uuid(),
  player_id uuid not null references players(id) on delete cascade,
  date date not null,
  slot time_slot not null,
  created_at timestamptz default now(),
  unique(player_id, date, slot)
);

-- Sessions table
create table sessions (
  id uuid primary key default gen_random_uuid(),
  proposed_by uuid not null references players(id) on delete cascade,
  date date not null,
  slot time_slot not null,
  status session_status default 'proposed',
  created_at timestamptz default now()
);

-- RLS policies
alter table players enable row level security;
alter table availability enable row level security;
alter table sessions enable row level security;

-- Players: anyone authenticated can read, users can update their own row
create policy "Players are viewable by authenticated users"
  on players for select to authenticated using (true);

create policy "Users can update their own player record"
  on players for update to authenticated using (auth.uid() = id);

-- Auto-create player row on signup via trigger
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.players (id, email)
  values (new.id, new.email);
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Availability: anyone authenticated can read, users manage their own
create policy "Availability is viewable by authenticated users"
  on availability for select to authenticated using (true);

create policy "Users can insert their own availability"
  on availability for insert to authenticated
  with check (auth.uid() = player_id);

create policy "Users can delete their own availability"
  on availability for delete to authenticated
  using (auth.uid() = player_id);

-- Sessions: anyone authenticated can read, DM can manage
create policy "Sessions are viewable by authenticated users"
  on sessions for select to authenticated using (true);

create policy "DM can insert sessions"
  on sessions for insert to authenticated
  with check (
    exists (select 1 from players where id = auth.uid() and is_dm = true)
  );

create policy "DM can update sessions"
  on sessions for update to authenticated
  using (
    exists (select 1 from players where id = auth.uid() and is_dm = true)
  );

create policy "DM can delete sessions"
  on sessions for delete to authenticated
  using (
    exists (select 1 from players where id = auth.uid() and is_dm = true)
  );
