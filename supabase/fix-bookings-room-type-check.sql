-- FIX for: new row for relation "bookings" violates check constraint
--          "bookings_room_type_check"
--
-- The original constraint only allows the old room_type values (e.g.
-- 'single', 'shared'), but the app now books 'single', 'shared2',
-- 'shared3' and 'shared4'. Without this fix, every shared-room booking
-- fails at the payment-initiation step.
--
-- Run in the Supabase Dashboard -> SQL Editor. Safe to re-run.

alter table public.bookings drop constraint if exists bookings_room_type_check;

alter table public.bookings add constraint bookings_room_type_check
  check (room_type in ('single', 'shared2', 'shared3', 'shared4'));
