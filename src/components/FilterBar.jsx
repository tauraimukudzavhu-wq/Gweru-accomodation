const GENDER_OPTIONS = [
  { value: 'any', label: 'Any gender' },
  { value: 'boys', label: 'Boys only' },
  { value: 'girls', label: 'Girls only' },
  { value: 'mixed', label: 'Mixed' },
]

function FilterBar({ filters, onChange, count, total }) {
  const set = (field) => (e) => onChange({ ...filters, [field]: e.target.value })
  const active = filters.query.trim() || filters.gender !== 'any' || filters.maxPrice

  return (
    <div className="absolute top-16 left-1/2 z-[1000] w-[min(92vw,38rem)] -translate-x-1/2 rounded-2xl bg-white/95 p-2 shadow-lg backdrop-blur">
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
      </div>
      {active && (
        <p className="mt-1.5 flex items-center gap-2 px-2 text-xs text-gray-600">
          {count} of {total} houses match
          <button
            type="button"
            onClick={() => onChange({ query: '', gender: 'any', maxPrice: '' })}
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
