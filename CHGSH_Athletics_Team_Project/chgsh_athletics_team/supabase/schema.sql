-- CHGSH Athletics Team database schema
-- Run this in Supabase SQL Editor on a new project.
create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  role text not null default 'athlete' check (role in ('coach','athlete')),
  approved boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.athletes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid unique references public.profiles(id) on delete set null,
  name text not null,
  events text[] default '{}',
  created_at timestamptz not null default now()
);

create table if not exists public.training_sessions (
  id uuid primary key default gen_random_uuid(),
  training_date date not null,
  title text not null,
  focus text,
  notes text,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now()
);

create table if not exists public.training_records (
  id uuid primary key default gen_random_uuid(),
  training_date date not null,
  athlete_id uuid not null references public.athletes(id) on delete cascade,
  event text not null,
  content text not null,
  sets text,
  reps text,
  result text,
  rest text,
  intensity text,
  attendance text not null default '出席',
  feedback text,
  is_public boolean not null default false,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now()
);

create table if not exists public.performance_results (
  id uuid primary key default gen_random_uuid(),
  athlete_id uuid not null references public.athletes(id) on delete cascade,
  event text not null,
  result text not null,
  result_date date not null,
  meet_name text,
  notes text,
  is_public boolean not null default true,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now()
);

create table if not exists public.attendance (
  id uuid primary key default gen_random_uuid(),
  athlete_id uuid not null references public.athletes(id) on delete cascade,
  attendance_date date not null,
  status text not null check (status in ('出席','缺席','公假','傷病調整','自主訓練')),
  note text,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now()
);

-- Sensitive rehabilitation data is coach-only. Keep only necessary, consented data.
create table if not exists public.rehabilitation_records (
  id uuid primary key default gen_random_uuid(),
  athlete_id uuid not null references public.athletes(id) on delete cascade,
  record_date date not null,
  permitted_activity text,
  completed_activity text,
  clinician_clearance_note text,
  private_note text,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now()
);

create or replace function public.is_approved_coach()
returns boolean language sql stable security definer set search_path = public
as $$ select exists(select 1 from public.profiles where id = auth.uid() and role='coach' and approved=true); $$;

create or replace function public.my_athlete_ids()
returns setof uuid language sql stable security definer set search_path = public
as $$ select id from public.athletes where user_id = auth.uid(); $$;

alter table public.profiles enable row level security;
alter table public.athletes enable row level security;
alter table public.training_sessions enable row level security;
alter table public.training_records enable row level security;
alter table public.performance_results enable row level security;
alter table public.attendance enable row level security;
alter table public.rehabilitation_records enable row level security;

create policy "profiles self or coach read" on public.profiles for select to authenticated
using (id=auth.uid() or public.is_approved_coach());
create policy "profiles self insert pending athlete" on public.profiles for insert to authenticated
with check (id=auth.uid() and role='athlete' and approved=false);
create policy "profiles self update display only" on public.profiles for update to authenticated
using (id=auth.uid()) with check (id=auth.uid() and role='athlete' and approved=false);

create policy "athletes coach self or public result name" on public.athletes for select to authenticated
using (
  public.is_approved_coach()
  or user_id=auth.uid()
  or exists (select 1 from public.training_records tr where tr.athlete_id=athletes.id and tr.is_public=true)
  or exists (select 1 from public.performance_results pr where pr.athlete_id=athletes.id and pr.is_public=true)
);
create policy "athletes coach insert" on public.athletes for insert to authenticated
with check (public.is_approved_coach());
create policy "athletes coach update" on public.athletes for update to authenticated
using (public.is_approved_coach()) with check (public.is_approved_coach());
create policy "athletes coach delete" on public.athletes for delete to authenticated
using (public.is_approved_coach());

create policy "sessions authenticated read" on public.training_sessions for select to authenticated
using (true);
create policy "sessions coach manage" on public.training_sessions for all to authenticated
using (public.is_approved_coach()) with check (public.is_approved_coach());

create policy "records coach or own or public" on public.training_records for select to authenticated
using (public.is_approved_coach() or athlete_id in (select public.my_athlete_ids()) or is_public=true);
create policy "records coach insert" on public.training_records for insert to authenticated
with check (public.is_approved_coach());
create policy "records coach update" on public.training_records for update to authenticated
using (public.is_approved_coach()) with check (public.is_approved_coach());
create policy "records coach delete" on public.training_records for delete to authenticated
using (public.is_approved_coach());

create policy "results own public or coach read" on public.performance_results for select to authenticated
using (public.is_approved_coach() or athlete_id in (select public.my_athlete_ids()) or is_public=true);
create policy "results coach insert" on public.performance_results for insert to authenticated
with check (public.is_approved_coach());
create policy "results coach update" on public.performance_results for update to authenticated
using (public.is_approved_coach()) with check (public.is_approved_coach());
create policy "results coach delete" on public.performance_results for delete to authenticated
using (public.is_approved_coach());

create policy "attendance coach or own read" on public.attendance for select to authenticated
using (public.is_approved_coach() or athlete_id in (select public.my_athlete_ids()));
create policy "attendance coach manage" on public.attendance for all to authenticated
using (public.is_approved_coach()) with check (public.is_approved_coach());

create policy "rehab coach only" on public.rehabilitation_records for all to authenticated
using (public.is_approved_coach()) with check (public.is_approved_coach());

-- New signups are always pending athletes. Never trust client-provided role metadata.
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public
as $$
begin
  insert into public.profiles(id, display_name, role, approved)
  values (new.id, coalesce(new.raw_user_meta_data->>'display_name',''), 'athlete', false);
  return new;
end;
$$;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
for each row execute procedure public.handle_new_user();

-- After creating your own account, promote ONLY your verified coach account manually:
-- update public.profiles set role='coach', approved=true where id='YOUR_AUTH_USER_UUID';
-- Create the initial athlete roster as coach:
-- insert into public.athletes(name, events) values
-- ('京', array['100公尺','200公尺']), ('溱', array['依醫療許可安排']),
-- ('綺', array['400公尺','200公尺']), ('妍', array['400公尺跨欄','400公尺']),
-- ('宣', array['400公尺跨欄']), ('彤', array['跳遠','4×400接力']),
-- ('妘', array['跳遠']), ('安', array['鐵餅']), ('謝', array['鉛球']);
