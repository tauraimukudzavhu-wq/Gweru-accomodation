import { useEffect, useMemo, useState } from 'react'
import { MapContainer, TileLayer, Marker, Popup, CircleMarker } from 'react-leaflet'
import L from 'leaflet'
import { supabase } from '../lib/supabase.js'
import { ROOM_TYPES } from '../lib/roomTypes.js'
import CampusToggle from '../components/CampusToggle.jsx'
import FilterBar from '../components/FilterBar.jsx'
import SiteFooter from '../components/SiteFooter.jsx'
import HouseModal from '../components/HouseModal.jsx'

const GWERU_CENTER = [-19.45, 29.8167]

const CAMPUSES = [
  { id: 'msu', name: 'MSU Main Campus', position: [-19.448, 29.82], color: 'blue' },
  { id: 'telone', name: 'Telone Campus', position: [-19.432, 29.805], color: 'violet' },
]

const PIN_AVAILABLE = '#16a34a'
const PIN_FULL = '#dc2626'

// extra words each gender policy should match when students type a search
const GENDER_SYNONYMS = {
  boys: 'boys only accommodation male gents',
  girls: 'girls only accommodation female ladies',
  mixed: 'mixed sex accommodation co-ed coed',
}

const campusIcon = (color) =>
  new L.Icon({
    iconUrl: `https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-${color}.png`,
    shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41],
  })

function matchesFilters(house, { query, gender, maxPrice }) {
  const policy = house.gender_policy ?? 'mixed'
  if (gender !== 'any' && policy !== gender) return false

  if (maxPrice) {
    const prices = ROOM_TYPES.map((t) => house[t.priceField] ?? 0).filter((p) => p > 0)
    if (prices.length > 0 && !prices.some((p) => p <= Number(maxPrice))) return false
  }

  const q = query.trim().toLowerCase()
  if (q) {
    const hay = [
      house.name,
      house.description,
      GENDER_SYNONYMS[policy] ?? policy,
      ...(house.amenities ?? []),
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase()
    // also match with punctuation stripped, so "wifi" finds "Wi-Fi"
    const hayCompact = hay.replace(/[^a-z0-9]/g, '')
    const matches = (token) =>
      hay.includes(token) || hayCompact.includes(token.replace(/[^a-z0-9]/g, ''))
    if (!q.split(/\s+/).every(matches)) return false
  }

  return true
}

function MapPage() {
  const [selectedCampus, setSelectedCampus] = useState(CAMPUSES[0].id)
  const [houses, setHouses] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedHouseId, setSelectedHouseId] = useState(null)
  const [filters, setFilters] = useState({ query: '', gender: 'any', maxPrice: '' })

  useEffect(() => {
    let cancelled = false

    async function fetchHouses() {
      const { data, error } = await supabase.from('houses').select('*')
      if (cancelled) return
      if (error) {
        console.error('Failed to load houses:', error.message)
      } else {
        setHouses(data)
      }
      setLoading(false)
    }

    fetchHouses()

    const channel = supabase
      .channel('houses-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'houses' },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            setHouses((prev) => [...prev, payload.new])
          } else if (payload.eventType === 'UPDATE') {
            setHouses((prev) =>
              prev.map((h) => (h.id === payload.new.id ? { ...h, ...payload.new } : h)),
            )
          } else if (payload.eventType === 'DELETE') {
            setHouses((prev) => prev.filter((h) => h.id !== payload.old.id))
          }
        },
      )
      .subscribe()

    return () => {
      cancelled = true
      supabase.removeChannel(channel)
    }
  }, [])

  const campus = CAMPUSES.find((c) => c.id === selectedCampus)
  const selectedHouse = houses.find((h) => h.id === selectedHouseId)

  const filteredHouses = useMemo(
    () => houses.filter((h) => matchesFilters(h, filters)),
    [houses, filters],
  )

  return (
    <div className="relative h-dvh w-full overflow-hidden">
      <MapContainer
        center={GWERU_CENTER}
        zoom={14}
        className="h-full w-full"
        zoomControl={false}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {CAMPUSES.map((c) => (
          <Marker key={c.id} position={c.position} icon={campusIcon(c.color)}>
            <Popup>{c.name}</Popup>
          </Marker>
        ))}
        {filteredHouses.map((house) => {
          const color = house.is_full ? PIN_FULL : PIN_AVAILABLE
          return (
            <CircleMarker
              key={house.id}
              center={[house.latitude, house.longitude]}
              radius={10}
              pathOptions={{ color, fillColor: color, fillOpacity: 0.8, weight: 2 }}
              eventHandlers={{ click: () => setSelectedHouseId(house.id) }}
            />
          )
        })}
      </MapContainer>

      <CampusToggle
        campuses={CAMPUSES}
        selected={selectedCampus}
        onSelect={setSelectedCampus}
      />

      <FilterBar
        filters={filters}
        onChange={setFilters}
        count={filteredHouses.length}
        total={houses.length}
      />

      <SiteFooter overlay />

      {loading && (
        <div className="absolute inset-0 z-[1100] flex items-center justify-center bg-white/60">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-green-600 border-t-transparent" />
        </div>
      )}

      {selectedHouse && (
        <HouseModal
          key={selectedHouse.id}
          house={selectedHouse}
          campusCoords={{ lat: campus.position[0], lng: campus.position[1] }}
          onClose={() => setSelectedHouseId(null)}
        />
      )}
    </div>
  )
}

export default MapPage
