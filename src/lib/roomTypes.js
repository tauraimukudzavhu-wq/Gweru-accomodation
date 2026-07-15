export const ROOM_TYPES = [
  {
    id: 'single',
    label: 'Single Room',
    shortLabel: 'Single',
    fee: 8,
    availField: 'single_rooms_available',
    priceField: 'single_room_price',
  },
  {
    id: 'shared2',
    label: 'Shared Room (2 people)',
    shortLabel: 'Shared ×2',
    fee: 4,
    availField: 'shared2_rooms_available',
    priceField: 'shared2_room_price',
  },
  {
    id: 'shared3',
    label: 'Shared Room (3 people)',
    shortLabel: 'Shared ×3',
    fee: 4,
    availField: 'shared3_rooms_available',
    priceField: 'shared3_room_price',
  },
  {
    id: 'shared4',
    label: 'Shared Room (4 people)',
    shortLabel: 'Shared ×4',
    fee: 4,
    availField: 'shared4_rooms_available',
    priceField: 'shared4_room_price',
  },
]

export const roomTypeById = (id) => ROOM_TYPES.find((t) => t.id === id)

export const availableRoomTypes = (house) =>
  ROOM_TYPES.filter((t) => (house[t.availField] ?? 0) > 0)
