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
                <td className="px-4 py-3 font-medium text-gray-900">{house.name}</td>
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
                <td colSpan={9} className="px-4 py-6 text-center text-gray-500">
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
