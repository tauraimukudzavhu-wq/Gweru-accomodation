-- Mybase migration: "Next Semester Bookings" mode.
-- Run ONCE in Supabase Dashboard -> SQL Editor. Safe to re-run.

-- 1) One-row settings table holding the booking season the admin switches on
--    at the end of a semester (e.g. "Semester 1, 2027", move in 2027-02-01).
create table if not exists public.site_settings (
  id integer primary key default 1 check (id = 1),
  next_season_open boolean not null default false,
  next_season_label text,
  next_season_move_in date,
  updated_at timestamptz not null default now()
);

insert into public.site_settings (id) values (1) on conflict (id) do nothing;

alter table public.site_settings enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'site_settings'
      and policyname = 'Anyone can read site settings'
  ) then
    create policy "Anyone can read site settings"
      on public.site_settings for select to anon, authenticated
      using (true);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'site_settings'
      and policyname = 'Admins can update site settings'
  ) then
    create policy "Admins can update site settings"
      on public.site_settings for update to authenticated
      using (true) with check (true);
  end if;
end $$;

-- 2) Houses: whether a house takes bookings for next semester, and how many
--    rooms it has open for that semester (counts down as students book).
alter table public.houses add column if not exists next_semester_open boolean not null default false;
alter table public.houses add column if not exists next_semester_rooms integer not null default 0;

-- 3) Bookings: which semester a booking is for. NULL = the current semester.
alter table public.bookings add column if not exists semester text;
