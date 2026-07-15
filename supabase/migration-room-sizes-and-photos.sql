-- Mybase migration: shared room sizes, booking payment method, photo uploads.
-- Run this ONCE in the Supabase Dashboard -> SQL Editor. It is safe to
-- re-run (every step checks whether it has already been applied).

-- 1) Shared room sizes: rename the existing shared columns to the
--    2-person variant, then add 3- and 4-person variants.
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'houses'
      and column_name = 'shared_rooms_available'
  ) then
    alter table public.houses rename column shared_rooms_available to shared2_rooms_available;
    alter table public.houses rename column shared_room_price to shared2_room_price;
  end if;
end $$;

alter table public.houses add column if not exists shared3_rooms_available integer not null default 0;
alter table public.houses add column if not exists shared3_room_price double precision not null default 0;
alter table public.houses add column if not exists shared4_rooms_available integer not null default 0;
alter table public.houses add column if not exists shared4_room_price double precision not null default 0;

-- 2) Bookings: record which mobile-money service paid (ecocash / onemoney).
alter table public.bookings add column if not exists payment_method text;

-- 3) Storage policies so logged-in admins can manage photos in the
--    'house-photos' bucket (the bucket itself already exists and is
--    public for reads).
do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage' and tablename = 'objects'
      and policyname = 'Authenticated can upload house photos'
  ) then
    create policy "Authenticated can upload house photos"
      on storage.objects for insert to authenticated
      with check (bucket_id = 'house-photos');
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage' and tablename = 'objects'
      and policyname = 'Authenticated can update house photos'
  ) then
    create policy "Authenticated can update house photos"
      on storage.objects for update to authenticated
      using (bucket_id = 'house-photos');
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage' and tablename = 'objects'
      and policyname = 'Authenticated can delete house photos'
  ) then
    create policy "Authenticated can delete house photos"
      on storage.objects for delete to authenticated
      using (bucket_id = 'house-photos');
  end if;
end $$;
