-- FIX for: record "new" has no field "shared_rooms_available"
--
-- The on_rooms_updated trigger on public.houses calls
-- check_house_availability(), which still referenced the old
-- shared_rooms_available column (renamed to shared2_rooms_available by the
-- room-sizes migration). This broke every UPDATE on houses.
--
-- This corrected version keeps the original behaviour (auto-mark a house
-- full when every room type reaches 0) across all four room sizes. It
-- deliberately does NOT auto-clear is_full, so the admin "Mark Full"
-- button is never overridden by an edit.

create or replace function public.check_house_availability()
returns trigger
language plpgsql
as $function$
begin
  if coalesce(new.single_rooms_available, 0) = 0
     and coalesce(new.shared2_rooms_available, 0) = 0
     and coalesce(new.shared3_rooms_available, 0) = 0
     and coalesce(new.shared4_rooms_available, 0) = 0 then
    new.is_full := true;
  end if;
  return new;
end;
$function$;
