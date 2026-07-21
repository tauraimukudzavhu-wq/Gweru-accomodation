-- FIX for: "update or delete on table houses violates foreign key
--          constraint bookings_house_id_fkey on table bookings"
--
-- Deleting a house was blocked because its bookings still referenced it.
-- Per the owner's choice, deleting a house should also delete that house's
-- bookings. This recreates the FK with ON DELETE CASCADE.
--
-- Run ONCE in Supabase Dashboard -> SQL Editor. Safe to re-run.

alter table public.bookings drop constraint if exists bookings_house_id_fkey;

alter table public.bookings
  add constraint bookings_house_id_fkey
  foreign key (house_id) references public.houses (id)
  on delete cascade;
