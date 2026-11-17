import { supabase } from './supabase.js'
import { ROOM_TYPES } from './roomTypes.js'

// Loads the next-semester booking season. Returns null when it is switched
// off or can't be read, so the app simply behaves as before.
export async function fetchSeason() {
  const { data, error } = await supabase
    .from('site_settings')
    .select('next_season_open, next_season_label, next_season_move_in')
    .eq('id', 1)
    .maybeSingle()
  if (error) {
    console.warn('Could not load booking season:', error.message)
    return null
  }
  if (!data?.next_season_open || !data.next_season_label?.trim()) return null
  return {
    label: data.next_season_label.trim(),
    moveIn: data.next_season_move_in,
  }
}

// "2027-02-01" -> "1 Feb 2027"
export function formatMoveIn(date) {
  if (!date) return null
  const d = new Date(`${date}T00:00:00`)
  if (Number.isNaN(d.getTime())) return null
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

export const isNextSemesterOpen = (house, season) =>
  Boolean(season) && Boolean(house.next_semester_open) && (house.next_semester_rooms ?? 0) > 0

// Room types a house offers at all (has a price), used for next-semester
// bookings where per-type counts aren't tracked.
export const offeredRoomTypes = (house) => {
  const offered = ROOM_TYPES.filter((t) => (house[t.priceField] ?? 0) > 0)
  return offered.length > 0 ? offered : ROOM_TYPES
}
