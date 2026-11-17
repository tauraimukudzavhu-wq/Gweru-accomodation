import { useState } from 'react'
import { formatMoveIn } from '../lib/season.js'

const GENDER_OPTIONS = [
  { value: 'any', label: 'Any gender' },
  { value: 'boys', label: 'Boys only' },
  { value: 'girls', label: 'Girls only' },
  { value: 'mixed', label: 'Mixed' },
]

const DISMISS_KEY = 'mybase-season-banner-dismissed'

function readDismissed() {
  try {
    return sessionStorage.getItem(DISMISS_KEY)
  } catch {
    return null
  }
}

function SeasonBanner({ season, onShowHouses }) {
  // dismissal lasts for this visit only, and only for this season's label
  const [dismissed, setDismissed] = useState(() => readDismissed() === season.label)
  if (dismissed) return null

  const dismiss = () => {
    setDismissed(true)
    try {
      sessionStorage.setItem(DISMISS_KEY, season.label)
    } catch {
      // storage blocked: the banner just stays hidden until reload
    }
  }

  const moveIn = formatMoveIn(season.moveIn)

  return (
    <div className="mb-2 flex items-center gap-2 rounded-xl bg-blue-600 px-3 py-2 text-white">
      <span aria-hidden="true" className="text-lg">
        📅
      </span>
      <div className="min-w-0 flex-1 text-sm leading-snug">
        <p className="font-semibold">Now booking for {season.label}</p>
        <p className="text-xs text-blue-100">
          Secure your room before it&apos;s taken{moveIn ? ` · Move in ${moveIn}` : ''}
        </p>
      </div>
      <button
        type="button"
        onClick={onShowHouses}
        className="shrink-0 rounded-full bg-white px-3 py-1 text-xs font-semibold text-blue-700 hover:bg-blue-50"
      >
        Show houses
      </button>
      <button
        type="button"
        onClick={dismiss}
        aria-label="Hide announcement"
        className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-blue-100 hover:bg-blue-500 hover:text-white"
      >
        ✕
      </button>
    </div>
  )
}

function FilterBar({ filters, onChange, onClear, count, total, season }) {
  const set = (field) => (e) => onChange({ ...filters, [field]: e.target.value })
  const active =
    filters.query.trim() || filters.gender !== 'any' || filters.maxPrice || filters.nextSemester

  return (
    <div className="absolute top-16 left-1/2 z-[1000] w-[min(92vw,38rem)] -translate-x-1/2 rounded-2xl bg-white/95 p-2 shadow-lg backdrop-blur">
      {season && (
        <SeasonBanner
          key={season.label}
          season={season}
          onShowHouses={() => onChange({ ...filters, nextSemester: true })}
        />
      )}
      <div className="flex flex-wrap gap-2">
        <input
          type="search"
          value={filters.query}
          onChange={set('query')}
          placeholder="Search: WiFi, solar, boys only, house name..."
          aria-label="Search houses"
          className="min-w-[10rem] flex-1 rounded-full border border-gray-300 px-4 py-1.5 text-sm focus:border-green-600 focus:outline-none"
        />
        <select
          value={filters.gender}
          onChange={set('gender')}
          aria-label="Gender policy"
          className="rounded-full border border-gray-300 bg-white px-3 py-1.5 text-sm focus:border-green-600 focus:outline-none"
        >
          {GENDER_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
        <input
          type="number"
          min="0"
          value={filters.maxPrice}
          onChange={set('maxPrice')}
          placeholder="Max $/mo"
          aria-label="Maximum price per month"
          className="w-24 rounded-full border border-gray-300 px-3 py-1.5 text-sm focus:border-green-600 focus:outline-none"
        />
        {season && (
          <button
            type="button"
            aria-pressed={filters.nextSemester}
            onClick={() => onChange({ ...filters, nextSemester: !filters.nextSemester })}
            className={`rounded-full border px-3 py-1.5 text-sm font-medium whitespace-nowrap ${
              filters.nextSemester
                ? 'border-blue-600 bg-blue-600 text-white'
                : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50'
            }`}
          >
            📅 Next semester
          </button>
        )}
      </div>
      {active && (
        <p className="mt-1.5 flex items-center gap-2 px-2 text-xs text-gray-600">
          {count} of {total} houses match
          <button
            type="button"
            onClick={onClear}
            className="font-medium text-green-700 hover:underline"
          >
            Clear filters
          </button>
        </p>
      )}
    </div>
  )
}

export default FilterBar
