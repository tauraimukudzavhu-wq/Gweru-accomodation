import { useState } from 'react'
import BookingModal from './BookingModal.jsx'
import { availableRoomTypes } from '../lib/roomTypes.js'

function haversineKm(lat1, lon1, lat2, lon2) {
  const R = 6371
  const toRad = (deg) => (deg * Math.PI) / 180
  const dLat = toRad(lat2 - lat1)
  const dLon = toRad(lon2 - lon1)
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(a))
}

const GENDER_BADGES = {
  boys: { label: 'Boys only', cls: 'bg-blue-100 text-blue-800' },
  girls: { label: 'Girls only', cls: 'bg-pink-100 text-pink-800' },
  mixed: { label: 'Mixed', cls: 'bg-purple-100 text-purple-800' },
}

function RoomCard({ title, available, price }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 text-center">
      <p className="text-sm font-semibold text-gray-900">{title}</p>
      <p className="mt-1 text-sm text-gray-600">{available} rooms</p>
      <p className="mt-1 text-lg font-bold text-green-700">
        ${price}
        <span className="text-sm font-normal text-gray-500">/month</span>
      </p>
    </div>
  )
}

function HouseModal({ house, campusCoords, onClose }) {
  const [photoIndex, setPhotoIndex] = useState(0)
  const [showBooking, setShowBooking] = useState(false)
  const [lightbox, setLightbox] = useState(false)

  const photos = house.photos ?? []
  const distanceKm = haversineKm(
    house.latitude,
    house.longitude,
    campusCoords.lat,
    campusCoords.lng,
  )

  const askAvailability = () => {
    if (typeof window.openHouseChat === 'function') {
      window.openHouseChat(house.name)
    } else {
      console.warn('openHouseChat is not available yet')
    }
  }

  return (
    <>
      <div
        className="fixed inset-0 z-[1150] bg-black/40"
        onClick={onClose}
        aria-hidden="true"
      />

      <div
        role="dialog"
        aria-label={house.name}
        className="fixed inset-x-0 bottom-0 z-[1200] mx-auto flex max-h-[85vh] w-full max-w-lg animate-[slide-up_0.3s_ease-out] flex-col rounded-t-2xl bg-white shadow-2xl"
      >
        <div className="relative shrink-0 pt-3 pb-1">
          <div className="mx-auto h-1.5 w-12 rounded-full bg-gray-300" />
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="absolute top-2 right-3 flex h-8 w-8 items-center justify-center rounded-full bg-gray-100 text-gray-600 hover:bg-gray-200"
          >
            ✕
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-4">
          <div className="relative mt-2 h-48 overflow-hidden rounded-xl bg-gray-100">
            {photos.length > 0 ? (
              <>
                <img
                  src={photos[photoIndex]}
                  alt={`${house.name} photo ${photoIndex + 1} of ${photos.length}`}
                  onClick={() => setLightbox(true)}
                  className="h-full w-full cursor-zoom-in object-cover"
                />
                <div className="pointer-events-none absolute bottom-2 left-2 rounded-full bg-black/60 px-2 py-0.5 text-xs text-white">
                  Tap photo to enlarge
                </div>
                {photos.length > 1 && (
                  <>
                    <button
                      type="button"
                      aria-label="Previous photo"
                      onClick={() =>
                        setPhotoIndex((i) => (i - 1 + photos.length) % photos.length)
                      }
                      className="absolute top-1/2 left-2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-white/80 text-gray-800 shadow hover:bg-white"
                    >
                      ‹
                    </button>
                    <button
                      type="button"
                      aria-label="Next photo"
                      onClick={() => setPhotoIndex((i) => (i + 1) % photos.length)}
                      className="absolute top-1/2 right-2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-white/80 text-gray-800 shadow hover:bg-white"
                    >
                      ›
                    </button>
                    <div className="absolute right-2 bottom-2 rounded-full bg-black/60 px-2 py-0.5 text-xs text-white">
                      {photoIndex + 1} / {photos.length}
                    </div>
                  </>
                )}
              </>
            ) : (
              <div className="flex h-full items-center justify-center text-sm text-gray-500">
                No photos available
              </div>
            )}
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-2">
            <h2 className="text-2xl font-bold text-gray-900">{house.name}</h2>
            <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-medium text-green-800">
              {distanceKm.toFixed(1)} km from campus
            </span>
            <span
              className={`rounded-full px-3 py-1 text-xs font-medium ${
                GENDER_BADGES[house.gender_policy ?? 'mixed']?.cls ??
                'bg-gray-100 text-gray-700'
              }`}
            >
              {GENDER_BADGES[house.gender_policy ?? 'mixed']?.label ?? 'Mixed'}
            </span>
          </div>

          {house.description && (
            <p className="mt-2 text-sm text-gray-600">{house.description}</p>
          )}

          {(house.amenities ?? []).length > 0 && (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {house.amenities.map((amenity) => (
                <span
                  key={amenity}
                  className="rounded-full bg-gray-100 px-2.5 py-0.5 text-xs text-gray-700"
                >
                  {amenity}
                </span>
              ))}
            </div>
          )}

          {house.is_full ? (
            <div className="mt-4 rounded-xl bg-red-600 px-4 py-3 text-center font-semibold text-white">
              No Rooms Available
            </div>
          ) : availableRoomTypes(house).length > 0 ? (
            <div className="mt-4 grid grid-cols-2 gap-3">
              {availableRoomTypes(house).map((t) => (
                <RoomCard
                  key={t.id}
                  title={t.label}
                  available={house[t.availField]}
                  price={house[t.priceField]}
                />
              ))}
            </div>
          ) : (
            <p className="mt-4 rounded-xl bg-gray-50 px-4 py-3 text-center text-sm text-gray-600">
              Ask about current room availability using the chat below.
            </p>
          )}
        </div>

        <div className="shrink-0 border-t border-gray-200 bg-white p-3">
          <div className="flex gap-3">
            <button
              type="button"
              onClick={askAvailability}
              className="flex-1 rounded-full border border-green-600 px-4 py-3 font-semibold text-green-700 hover:bg-green-50"
            >
              Ask Availability
            </button>
            {!house.is_full && (
              <button
                type="button"
                onClick={() => setShowBooking(true)}
                className="flex-1 rounded-full bg-green-600 px-4 py-3 font-semibold text-white hover:bg-green-700"
              >
                Book Room
              </button>
            )}
          </div>
        </div>
      </div>

      {lightbox && photos.length > 0 && (
        <div
          className="fixed inset-0 z-[1250] flex items-center justify-center bg-black/90"
          onClick={() => setLightbox(false)}
        >
          <button
            type="button"
            onClick={() => setLightbox(false)}
            aria-label="Close photo"
            className="absolute top-4 right-4 flex h-10 w-10 items-center justify-center rounded-full bg-white/15 text-2xl text-white hover:bg-white/25"
          >
            ✕
          </button>

          <img
            src={photos[photoIndex]}
            alt={`${house.name} photo ${photoIndex + 1} of ${photos.length}`}
            onClick={(e) => e.stopPropagation()}
            className="max-h-[90vh] max-w-[92vw] object-contain"
          />

          {photos.length > 1 && (
            <>
              <button
                type="button"
                aria-label="Previous photo"
                onClick={(e) => {
                  e.stopPropagation()
                  setPhotoIndex((i) => (i - 1 + photos.length) % photos.length)
                }}
                className="absolute top-1/2 left-3 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/15 text-2xl text-white hover:bg-white/25"
              >
                ‹
              </button>
              <button
                type="button"
                aria-label="Next photo"
                onClick={(e) => {
                  e.stopPropagation()
                  setPhotoIndex((i) => (i + 1) % photos.length)
                }}
                className="absolute top-1/2 right-3 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/15 text-2xl text-white hover:bg-white/25"
              >
                ›
              </button>
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 rounded-full bg-white/15 px-3 py-1 text-sm text-white">
                {photoIndex + 1} / {photos.length}
              </div>
            </>
          )}
        </div>
      )}

      {showBooking && (
        <BookingModal house={house} onClose={() => setShowBooking(false)} />
      )}
    </>
  )
}

export default HouseModal
