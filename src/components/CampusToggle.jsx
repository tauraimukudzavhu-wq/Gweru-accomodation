function CampusToggle({ campuses, selected, onSelect }) {
  return (
    <div className="absolute top-4 left-1/2 z-[1000] flex -translate-x-1/2 gap-2 rounded-full bg-white/90 p-1.5 shadow-lg backdrop-blur">
      {campuses.map((campus) => (
        <button
          key={campus.id}
          type="button"
          onClick={() => onSelect(campus.id)}
          className={`rounded-full px-4 py-1.5 text-sm font-medium whitespace-nowrap transition-colors ${
            selected === campus.id
              ? 'bg-green-600 text-white'
              : 'border border-gray-300 bg-white text-gray-700 hover:bg-gray-50'
          }`}
        >
          {campus.name}
        </button>
      ))}
    </div>
  )
}

export default CampusToggle
