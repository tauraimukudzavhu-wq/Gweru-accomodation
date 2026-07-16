-- Mybase migration: house attributes for search/filtering.
-- Run ONCE in Supabase Dashboard -> SQL Editor. Safe to re-run.

-- gender policy: who the house accommodates
alter table public.houses add column if not exists gender_policy text not null default 'mixed';

alter table public.houses drop constraint if exists houses_gender_policy_check;
alter table public.houses add constraint houses_gender_policy_check
  check (gender_policy in ('boys', 'girls', 'mixed'));

-- amenities: free-form tags like WiFi, Solar, Borehole
alter table public.houses add column if not exists amenities text[] not null default '{}';
