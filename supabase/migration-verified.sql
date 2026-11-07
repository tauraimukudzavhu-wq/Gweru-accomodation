-- Mybase migration: "Verified" badge for houses checked in person.
-- Run ONCE in Supabase Dashboard -> SQL Editor. Safe to re-run.

alter table public.houses add column if not exists is_verified boolean not null default false;

-- The four houses listed so far were personally checked by the owner and
-- their photos match the real houses. New houses start unverified and are
-- marked verified from the admin dashboard after an in-person check.
update public.houses
set is_verified = true
where id in (
  '822c597c-8319-43f8-9552-9a2605b5db28', -- Infinite House
  'de925224-ffe3-4510-a6f7-5562744e2706', -- Redfox house
  '125d91b6-0385-4dd5-b402-45183f67acb3', -- Smart House
  'fce9a265-bc45-49d6-9556-1451f684b320'  -- Tekum
);
