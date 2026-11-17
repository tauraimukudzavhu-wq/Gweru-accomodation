import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase.js'
import { ROOM_TYPES } from '../lib/roomTypes.js'

const PHOTO_BUCKET = 'house-photos'

const EMPTY_FORM = {
  name: '',
  description: '',
  latitude: '',
  longitude: '',
  whatsapp_number: '',
  gender_policy: 'mixed',
  amenitiesText: '',
  is_verified: false,
  next_semester_open: false,
  next_semester_rooms: 0,
  ...Object.fromEntries(
    ROOM_TYPES.flatMap((t) => [
      [t.availField, 0],
      [t.priceField, 0],
    ]),
  ),
}

const STATUS_STYLES = {
  pending: 'bg-yellow-100 text-yellow-800',
  paid: 'bg-green-100 text-green-800',
  failed: 'bg-red-100 text-red-800',
  cancelled: 'bg-red-100 text-red-800',
}

function LoginForm() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState(null)
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError(null)
    setSubmitting(true)
    const { error: err } = await supabase.auth.signInWithPassword({ email, password })
    setSubmitting(false)
    if (err) setError(err.message)
  }

  return (
    <div className="flex min-h-dvh items-center justify-center bg-gray-100 p-4">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-lg"
      >
        <h1 className="text-xl font-bold text-gray-900">Mybase Admin</h1>
        <p className="mt-1 text-sm text-gray-500">Sign in to manage listings</p>

        <label className="mt-5 block">
          <span className="text-sm font-medium text-gray-700">Email</span>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-green-600 focus:outline-none"
          />
        </label>

        <label className="mt-3 block">
          <span className="text-sm font-medium text-gray-700">Password</span>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-green-600 focus:outline-none"
          />
        </label>

        {error && (
          <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={submitting}
          className="mt-5 w-full rounded-full bg-green-600 px-4 py-3 font-semibold text-white hover:bg-green-700 disabled:bg-gray-300"
        >
          {submitting ? 'Logging in...' : 'Log In'}
        </button>
      </form>
    </div>
  )
}

function HouseForm({ house, onSaved, onCancel }) {
  const [form, setForm] = useState(() => {
    if (!house) return EMPTY_FORM
    const initial = {
      name: house.name ?? '',
      description: house.description ?? '',
      latitude: house.latitude ?? '',
      longitude: house.longitude ?? '',
      whatsapp_number: house.whatsapp_number ?? '',
      gender_policy: house.gender_policy ?? 'mixed',
      amenitiesText: (house.amenities ?? []).join(', '),
      is_verified: house.is_verified ?? false,
      next_semester_open: house.next_semester_open ?? false,
      next_semester_rooms: house.next_semester_rooms ?? 0,
    }
    for (const t of ROOM_TYPES) {
      initial[t.availField] = house[t.availField] ?? 0
      initial[t.priceField] = house[t.priceField] ?? 0
    }
    return initial
  })
  const [photos, setPhotos] = useState(house?.photos ?? [])
  const [newFiles, setNewFiles] = useState([])
  const [error, setError] = useState(null)
  const [saving, setSaving] = useState(false)

  const set = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }))

  const addFiles = (e) => {
    setNewFiles((prev) => [...prev, ...e.target.files])
    e.target.value = ''
  }

  const uploadPhotos = async () => {
    const urls = []
    for (const file of newFiles) {
      const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_')
      const path = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}-${safeName}`
      const { error: upErr } = await supabase.storage
        .from(PHOTO_BUCKET)
        .upload(path, file)
      if (upErr) throw new Error(`Photo upload failed (${file.name}): ${upErr.message}`)
      urls.push(supabase.storage.from(PHOTO_BUCKET).getPublicUrl(path).data.publicUrl)
    }
    return urls
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError(null)
    setSaving(true)
    try {
      const uploadedUrls = await uploadPhotos()
      const row = {
        name: form.name.trim(),
        description: form.description.trim() || null,
        latitude: Number(form.latitude),
        longitude: Number(form.longitude),
        whatsapp_number: form.whatsapp_number.trim() || null,
        gender_policy: form.gender_policy,
        is_verified: form.is_verified,
        next_semester_open: form.next_semester_open,
        next_semester_rooms: Number(form.next_semester_rooms) || 0,
        amenities: form.amenitiesText
          .split(',')
          .map((a) => a.trim())
          .filter(Boolean),
        photos: [...photos, ...uploadedUrls],
      }
      for (const t of ROOM_TYPES) {
        row[t.availField] = Number(form[t.availField])
        row[t.priceField] = Number(form[t.priceField])
      }
      const query = house
        ? supabase.from('houses').update(row).eq('id', house.id)
        : supabase.from('houses').insert(row)
      const { error: err } = await query
      if (err) throw new Error(err.message)
      onSaved()
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  const inputCls =
    'mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-green-600 focus:outline-none'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <form
        onSubmit={handleSubmit}
        className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl"
      >
        <h2 className="text-lg font-bold text-gray-900">
          {house ? 'Edit House' : 'Add New House'}
        </h2>

        <label className="mt-4 block">
          <span className="text-sm font-medium text-gray-700">Name</span>
          <input value={form.name} onChange={set('name')} required className={inputCls} />
        </label>

        <label className="mt-3 block">
          <span className="text-sm font-medium text-gray-700">Description</span>
          <textarea
            value={form.description}
            onChange={set('description')}
            rows={2}
            className={inputCls}
          />
        </label>

        <div className="mt-3 flex gap-3">
          <label className="flex-1">
            <span className="text-sm font-medium text-gray-700">Latitude</span>
            <input
              type="number"
              step="any"
              value={form.latitude}
              onChange={set('latitude')}
              required
              className={inputCls}
            />
          </label>
          <label className="flex-1">
            <span className="text-sm font-medium text-gray-700">Longitude</span>
            <input
              type="number"
              step="any"
              value={form.longitude}
              onChange={set('longitude')}
              required
              className={inputCls}
            />
          </label>
        </div>

        {ROOM_TYPES.map((t) => (
          <div key={t.id} className="mt-3 flex gap-3">
            <label className="flex-1">
              <span className="text-sm font-medium text-gray-700">{t.label} — rooms</span>
              <input
                type="number"
                min="0"
                value={form[t.availField]}
                onChange={set(t.availField)}
                className={inputCls}
              />
            </label>
            <label className="flex-1">
              <span className="text-sm font-medium text-gray-700">Price ($/month)</span>
              <input
                type="number"
                min="0"
                step="any"
                value={form[t.priceField]}
                onChange={set(t.priceField)}
                className={inputCls}
              />
            </label>
          </div>
        ))}

        <label className="mt-3 block">
          <span className="text-sm font-medium text-gray-700">WhatsApp number</span>
          <input
            value={form.whatsapp_number}
            onChange={set('whatsapp_number')}
            placeholder="263771234567"
            className={inputCls}
          />
        </label>

        <div className="mt-3 flex gap-3">
          <label className="flex-1">
            <span className="text-sm font-medium text-gray-700">Who can stay</span>
            <select
              value={form.gender_policy}
              onChange={set('gender_policy')}
              className={inputCls}
            >
              <option value="mixed">Mixed (boys &amp; girls)</option>
              <option value="boys">Boys only</option>
              <option value="girls">Girls only</option>
            </select>
          </label>
          <label className="flex-1">
            <span className="text-sm font-medium text-gray-700">
              Amenities (comma-separated)
            </span>
            <input
              value={form.amenitiesText}
              onChange={set('amenitiesText')}
              placeholder="WiFi, Solar, Borehole"
              className={inputCls}
            />
          </label>
        </div>

        <label className="mt-3 flex items-start gap-2 rounded-lg border border-sky-200 bg-sky-50 p-3">
          <input
            type="checkbox"
            checked={form.is_verified}
            onChange={(e) => setForm((f) => ({ ...f, is_verified: e.target.checked }))}
            className="mt-0.5 accent-sky-600"
          />
          <span className="text-sm text-gray-700">
            <span className="font-medium text-sky-800">Verified</span>: I have checked
            this house in person and the photos match it.
          </span>
        </label>

        <div className="mt-3 rounded-lg border border-blue-200 bg-blue-50 p-3">
          <label className="flex items-start gap-2">
            <input
              type="checkbox"
              checked={form.next_semester_open}
              onChange={(e) =>
                setForm((f) => ({ ...f, next_semester_open: e.target.checked }))
              }
              className="mt-0.5 accent-blue-600"
            />
            <span className="text-sm text-gray-700">
              <span className="font-medium text-blue-800">Open for next semester</span>:
              students can reserve rooms here for the next semester (shown while the
              booking season is switched on).
            </span>
          </label>
          {form.next_semester_open && (
            <label className="mt-2 block">
              <span className="text-sm font-medium text-gray-700">
                Rooms open for next semester
              </span>
              <input
                type="number"
                min="0"
                value={form.next_semester_rooms}
                onChange={set('next_semester_rooms')}
                className={inputCls}
              />
              <span className="mt-1 block text-xs text-gray-500">
                Counts down by one with each paid reservation. Room prices are the
                same as above.
              </span>
            </label>
          )}
        </div>

        <div className="mt-3">
          <span className="text-sm font-medium text-gray-700">Photos</span>

          {photos.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-2">
              {photos.map((url) => (
                <div key={url} className="relative">
                  <img
                    src={url}
                    alt="House photo"
                    className="h-16 w-16 rounded-lg object-cover"
                  />
                  <button
                    type="button"
                    aria-label="Remove photo"
                    onClick={() => setPhotos((p) => p.filter((u) => u !== url))}
                    className="absolute -top-1.5 -right-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-red-600 text-xs text-white"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          )}

          {newFiles.length > 0 && (
            <ul className="mt-2 space-y-1 text-sm text-gray-600">
              {newFiles.map((file, i) => (
                <li key={`${file.name}-${i}`} className="flex items-center gap-2">
                  <span className="truncate">{file.name}</span>
                  <button
                    type="button"
                    onClick={() => setNewFiles((f) => f.filter((_, j) => j !== i))}
                    className="text-red-600 hover:underline"
                  >
                    remove
                  </button>
                </li>
              ))}
            </ul>
          )}

          <label className="mt-2 flex cursor-pointer items-center justify-center rounded-lg border-2 border-dashed border-gray-300 px-4 py-3 text-sm text-gray-600 hover:border-green-600 hover:text-green-700">
            + Add photos from your device
            <input
              type="file"
              accept="image/*"
              multiple
              onChange={addFiles}
              className="hidden"
            />
          </label>
        </div>

        {error && (
          <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
        )}

        <div className="mt-5 flex gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 rounded-full border border-gray-300 px-4 py-2.5 font-semibold text-gray-700 hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving}
            className="flex-1 rounded-full bg-green-600 px-4 py-2.5 font-semibold text-white hover:bg-green-700 disabled:bg-gray-300"
          >
            {saving ? 'Saving...' : 'Save'}
          </button>
        </div>
      </form>
    </div>
  )
}

function SeasonSettings() {
  const [form, setForm] = useState(null)
  const [saved, setSaved] = useState(null)
  const [message, setMessage] = useState(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    let cancelled = false
    supabase
      .from('site_settings')
      .select('next_season_open, next_season_label, next_season_move_in')
      .eq('id', 1)
      .maybeSingle()
      .then(({ data, error }) => {
        if (cancelled) return
        if (error) {
          setMessage({ type: 'error', text: `Could not load the season: ${error.message}` })
          return
        }
        const initial = {
          open: data?.next_season_open ?? false,
          label: data?.next_season_label ?? '',
          moveIn: data?.next_season_move_in ?? '',
        }
        setForm(initial)
        setSaved(initial)
      })
    return () => {
      cancelled = true
    }
  }, [])

  if (!form) {
    return message ? (
      <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{message.text}</p>
    ) : null
  }

  const save = async (e) => {
    e.preventDefault()
    setMessage(null)
    if (form.open && !form.label.trim()) {
      setMessage({ type: 'error', text: 'Enter the semester name before switching it on.' })
      return
    }
    setSaving(true)
    const { data, error } = await supabase
      .from('site_settings')
      .update({
        next_season_open: form.open,
        next_season_label: form.label.trim() || null,
        next_season_move_in: form.moveIn || null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', 1)
      .select('id')
    setSaving(false)
    if (error || !data?.length) {
      setMessage({ type: 'error', text: error?.message ?? 'Save failed: settings row missing.' })
      return
    }
    setSaved(form)
    setMessage({
      type: 'ok',
      text: form.open
        ? 'Saved. Students now see the next-semester banner.'
        : 'Saved. Next-semester bookings are switched off.',
    })
  }

  const dirty = JSON.stringify(form) !== JSON.stringify(saved)
  const inputCls =
    'mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 focus:border-blue-600 focus:outline-none'

  return (
    <form
      onSubmit={save}
      className={`rounded-xl border p-4 ${
        saved.open ? 'border-blue-300 bg-blue-50' : 'border-gray-200 bg-white'
      }`}
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className="font-bold text-gray-900">📅 Next Semester Bookings</h3>
          <p className="text-sm text-gray-600">
            {saved.open
              ? `ON: students see "Now booking for ${saved.label}".`
              : 'OFF: switch on when the semester ends.'}
          </p>
        </div>
        <label className="flex cursor-pointer items-center gap-2 text-sm font-medium text-gray-800">
          <input
            type="checkbox"
            checked={form.open}
            onChange={(e) => setForm((f) => ({ ...f, open: e.target.checked }))}
            className="h-4 w-4 accent-blue-600"
          />
          Taking bookings for next semester
        </label>
      </div>

      <div className="mt-3 flex flex-wrap gap-3">
        <label className="min-w-[12rem] flex-1">
          <span className="text-sm font-medium text-gray-700">Semester name</span>
          <input
            value={form.label}
            onChange={(e) => setForm((f) => ({ ...f, label: e.target.value }))}
            placeholder="Semester 1, 2027"
            maxLength={40}
            className={inputCls}
          />
        </label>
        <label className="min-w-[10rem] flex-1">
          <span className="text-sm font-medium text-gray-700">
            Move-in date <span className="font-normal text-gray-500">(optional)</span>
          </span>
          <input
            type="date"
            value={form.moveIn}
            onChange={(e) => setForm((f) => ({ ...f, moveIn: e.target.value }))}
            className={inputCls}
          />
          <span className="mt-1 block text-xs text-gray-500">
            Leave blank until the university announces it. Students will see
            &quot;Move in at the start of the semester&quot;.
          </span>
        </label>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-3">
        <button
          type="submit"
          disabled={saving || !dirty}
          className="rounded-full bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:bg-gray-300"
        >
          {saving ? 'Saving...' : 'Save'}
        </button>
        {message && (
          <p
            className={`text-sm ${message.type === 'error' ? 'text-red-700' : 'text-green-700'}`}
          >
            {message.text}
          </p>
        )}
      </div>
      <p className="mt-2 text-xs text-gray-500">
        Then tick &quot;Open for next semester&quot; on each house that is taking
        reservations (Edit → under &quot;Verified&quot;).
      </p>
    </form>
  )
}

function HousesTab() {
  const [houses, setHouses] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [formHouse, setFormHouse] = useState(null) // null = closed, 'new' = add, object = edit

  const load = useCallback(async () => {
    const { data, error: err } = await supabase
      .from('houses')
      .select('*')
      .order('name')
    if (err) setError(err.message)
    else setHouses(data)
    setLoading(false)
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const toggleFull = async (house) => {
    const { error: err } = await supabase
      .from('houses')
      .update({ is_full: !house.is_full })
      .eq('id', house.id)
    if (err) setError(err.message)
    else load()
  }

  const remove = async (house) => {
    if (!window.confirm(`Delete "${house.name}"? This cannot be undone.`)) return
    const { error: err } = await supabase.from('houses').delete().eq('id', house.id)
    if (err) setError(err.message)
    else load()
  }

  if (loading) return <p className="p-6 text-gray-500">Loading houses...</p>

  const sharedTypes = ROOM_TYPES.filter((t) => t.id !== 'single')

  return (
    <div className="p-4 sm:p-6">
      <div className="mb-5">
        <SeasonSettings />
      </div>

      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-gray-900">Houses</h2>
        <button
          type="button"
          onClick={() => setFormHouse('new')}
          className="rounded-full bg-green-600 px-4 py-2 text-sm font-semibold text-white hover:bg-green-700"
        >
          Add New House
        </button>
      </div>

      {error && (
        <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
      )}

      <div className="mt-4 overflow-x-auto rounded-xl border border-gray-200 bg-white">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-gray-200 bg-gray-50 text-gray-600">
            <tr>
              <th className="px-4 py-3 font-medium">Name</th>
              <th className="px-4 py-3 font-medium">Single Rooms</th>
              <th className="px-4 py-3 font-medium">Shared Rooms</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {houses.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-gray-500">
                  No houses yet. Add your first one.
                </td>
              </tr>
            )}
            {houses.map((house) => (
              <tr key={house.id} className="border-b border-gray-100 last:border-0">
                <td className="px-4 py-3 font-medium text-gray-900">
                  {house.name}
                  {house.is_verified && (
                    <span className="ml-2 rounded-full bg-sky-100 px-2 py-0.5 text-xs font-semibold text-sky-800">
                      ✓ Verified
                    </span>
                  )}
                </td>
                <td className="px-4 py-3 text-gray-700">
                  {house.single_rooms_available ?? 0} · ${house.single_room_price ?? 0}/mo
                </td>
                <td className="px-4 py-3 text-gray-700">
                  {sharedTypes.map((t) => (
                    <span key={t.id} className="mr-3 whitespace-nowrap">
                      ×{t.id.slice(-1)}: {house[t.availField] ?? 0} · $
                      {house[t.priceField] ?? 0}
                    </span>
                  ))}
                </td>
                <td className="px-4 py-3">
                  <span
                    className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                      house.is_full
                        ? 'bg-red-100 text-red-800'
                        : 'bg-green-100 text-green-800'
                    }`}
                  >
                    {house.is_full ? 'Full' : 'Available'}
                  </span>
                  {house.next_semester_open && (
                    <span className="mt-1 block w-fit rounded-full bg-blue-100 px-2.5 py-1 text-xs font-medium whitespace-nowrap text-blue-800">
                      Next sem: {house.next_semester_rooms ?? 0} rooms
                    </span>
                  )}
                </td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => toggleFull(house)}
                      className="rounded-full border border-gray-300 px-3 py-1 text-xs font-medium text-gray-700 hover:bg-gray-50"
                    >
                      {house.is_full ? 'Mark Available' : 'Mark Full'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setFormHouse(house)}
                      className="rounded-full border border-gray-300 px-3 py-1 text-xs font-medium text-gray-700 hover:bg-gray-50"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => remove(house)}
                      className="rounded-full border border-red-200 px-3 py-1 text-xs font-medium text-red-600 hover:bg-red-50"
                    >
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {formHouse && (
        <HouseForm
          house={formHouse === 'new' ? null : formHouse}
          onSaved={() => {
            setFormHouse(null)
            load()
          }}
          onCancel={() => setFormHouse(null)}
        />
      )}
    </div>
  )
}

function BookingsTab() {
  const [bookings, setBookings] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    async function load() {
      const { data, error: err } = await supabase
        .from('bookings')
        .select('*, houses(name)')
        .order('created_at', { ascending: false })
      if (err) setError(err.message)
      else setBookings(data)
      setLoading(false)
    }
    load()
  }, [])

  if (loading) return <p className="p-6 text-gray-500">Loading bookings...</p>
  if (error)
    return (
      <p className="m-6 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
    )

  return (
    <div className="p-4 sm:p-6">
      <h2 className="text-lg font-bold text-gray-900">Bookings</h2>
      <div className="mt-4 overflow-x-auto rounded-xl border border-gray-200 bg-white">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-gray-200 bg-gray-50 text-gray-600">
            <tr>
              <th className="px-4 py-3 font-medium">Phone</th>
              <th className="px-4 py-3 font-medium">Email</th>
              <th className="px-4 py-3 font-medium">House</th>
              <th className="px-4 py-3 font-medium">Room Type</th>
              <th className="px-4 py-3 font-medium">Semester</th>
              <th className="px-4 py-3 font-medium">Amount</th>
              <th className="px-4 py-3 font-medium">Payment Method</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Receipt Code</th>
              <th className="px-4 py-3 font-medium">Date</th>
            </tr>
          </thead>
          <tbody>
            {bookings.length === 0 && (
              <tr>
                <td colSpan={10} className="px-4 py-6 text-center text-gray-500">
                  No bookings yet.
                </td>
              </tr>
            )}
            {bookings.map((b) => (
              <tr key={b.id} className="border-b border-gray-100 last:border-0">
                <td className="px-4 py-3 text-gray-900">{b.student_phone}</td>
                <td className="px-4 py-3 text-gray-700">{b.student_email}</td>
                <td className="px-4 py-3 text-gray-700">{b.houses?.name ?? '—'}</td>
                <td className="px-4 py-3 text-gray-700 capitalize">{b.room_type}</td>
                <td className="px-4 py-3 whitespace-nowrap">
                  {b.semester ? (
                    <span className="rounded-full bg-blue-100 px-2.5 py-1 text-xs font-medium text-blue-800">
                      {b.semester}
                    </span>
                  ) : (
                    <span className="text-gray-500">Current</span>
                  )}
                </td>
                <td className="px-4 py-3 text-gray-700">${b.amount}</td>
                <td className="px-4 py-3 text-gray-700 capitalize">
                  {b.payment_method ?? '—'}
                </td>
                <td className="px-4 py-3">
                  <span
                    className={`rounded-full px-2.5 py-1 text-xs font-medium capitalize ${
                      STATUS_STYLES[b.payment_status] ?? 'bg-gray-100 text-gray-700'
                    }`}
                  >
                    {b.payment_status}
                  </span>
                </td>
                <td className="px-4 py-3 font-mono text-xs text-gray-900">
                  {b.receipt_code ?? '—'}
                </td>
                <td className="px-4 py-3 text-gray-700">
                  {b.created_at ? new Date(b.created_at).toLocaleDateString() : '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function AdminPage() {
  const [session, setSession] = useState(null)
  const [authChecked, setAuthChecked] = useState(false)
  const [tab, setTab] = useState('houses')

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      setAuthChecked(true)
    })
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession)
    })
    return () => subscription.unsubscribe()
  }, [])

  if (!authChecked) {
    return (
      <div className="flex min-h-dvh items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-green-600 border-t-transparent" />
      </div>
    )
  }

  if (!session) return <LoginForm />

  return (
    <div className="min-h-dvh bg-gray-100">
      <header className="flex items-center justify-between bg-white px-4 py-3 shadow-sm sm:px-6">
        <h1 className="text-lg font-bold text-gray-900">Mybase Admin</h1>
        <button
          type="button"
          onClick={() => supabase.auth.signOut()}
          className="rounded-full border border-gray-300 px-4 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          Log Out
        </button>
      </header>

      <nav className="flex gap-1 border-b border-gray-200 bg-white px-4 sm:px-6">
        {[
          { id: 'houses', label: 'Houses' },
          { id: 'bookings', label: 'Bookings' },
        ].map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`border-b-2 px-4 py-3 text-sm font-medium ${
              tab === t.id
                ? 'border-green-600 text-green-700'
                : 'border-transparent text-gray-500 hover:text-gray-800'
            }`}
          >
            {t.label}
          </button>
        ))}
      </nav>

      {tab === 'houses' ? <HousesTab /> : <BookingsTab />}
    </div>
  )
}

export default AdminPage
