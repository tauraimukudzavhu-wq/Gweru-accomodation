import { useEffect, useState } from 'react'
import { MapContainer, TileLayer, Marker, Popup, CircleMarker } from 'react-leaflet'
import L from 'leaflet'
import { supabase } from '../lib/supabase.js'
import CampusToggle from '../components/CampusToggle.jsx'
import HouseModal from '../components/HouseModal.jsx'

const GWERU_CENTER = [-19.45, 29.8167]

const CAMPUSES = [
  { id: 'msu', name: 'MSU Main Campus', position: [-19.448, 29.82], color: 'blue' },
  { id: 'telone', name: 'Telone Campus', position: [-19.432, 29.805], color: 'violet' },
]

const PIN_AVAILABLE = '#16a34a'
const PIN_FULL = '#dc2626'

const campusIcon = (color) =>
  new L.Icon({
    iconUrl: `https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-${color}.png`,
    shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41],
  })

function MapPage() {
  const [selectedCampus, setSelectedCampus] = useState(CAMPUSES[0].id)
  const [houses, setHouses] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedHouseId, setSelectedHouseId] = useState(null)

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
        {houses.map((house) => {
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
