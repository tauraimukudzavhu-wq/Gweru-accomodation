import { useEffect, useState } from 'react'
import { ROOM_TYPES, availableRoomTypes, roomTypeById } from '../lib/roomTypes.js'

const PAYMENT_METHODS = [
  { id: 'ecocash', label: 'EcoCash' },
  { id: 'onemoney', label: 'OneMoney' },
  { id: 'innbucks', label: 'InnBucks' },
]

function generateReceiptCode() {
  const now = new Date()
  const date = [
    now.getFullYear(),
    String(now.getMonth() + 1).padStart(2, '0'),
    String(now.getDate()).padStart(2, '0'),
  ].join('')
  const rand = Array.from({ length: 6 }, () =>
    '0123456789ABCDEF'.charAt(Math.floor(Math.random() * 16)),
  ).join('')
  return `MSU-${date}-${rand}`
}

function RoomTile({ title, fee, price, selected, onSelect }) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={`rounded-xl border-2 p-4 text-left transition-colors ${
        selected
          ? 'border-green-600 bg-green-50'
          : 'border-gray-200 bg-white hover:border-gray-300'
      }`}
    >
      <p className="font-semibold text-gray-900">
        {title} — ${fee} booking fee
      </p>
      <p className="mt-1 text-sm text-gray-600">${price}/month</p>
    </button>
  )
}

function BookingModal({ house, onClose }) {
  const [screen, setScreen] = useState('select')
  const [roomType, setRoomType] = useState(null)
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [paymentMethod, setPaymentMethod] = useState(null)
  const [bookingId, setBookingId] = useState(null)
  const [receiptCode, setReceiptCode] = useState('')
  const [agreedToTerms, setAgreedToTerms] = useState(false)
  const [innbucks, setInnbucks] = useState(null)
  const [failReason, setFailReason] = useState(null)

  const methodLabel =
    PAYMENT_METHODS.find((m) => m.id === paymentMethod)?.label ?? 'EcoCash'
  const canPay =
    roomType && phone.trim() && email.trim() && paymentMethod && agreedToTerms

  const openTypes = availableRoomTypes(house)
  const roomOptions = openTypes.length > 0 ? openTypes : ROOM_TYPES
  const selectedType = roomTypeById(roomType)

  const confirmAndPay = async () => {
    setScreen('loading')
    try {
      const res = await fetch('/api/paynow-initiate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          house_id: house.id,
          room_type: roomType,
          amount: selectedType.fee,
          student_phone: phone.trim(),
          student_email: email.trim(),
          payment_method: paymentMethod,
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        // surface Paynow's specific reason (e.g. invalid phone) so the
        // student can fix it, instead of the generic failure message
        setFailReason(data.error || null)
        setScreen('failed')
        return
      }
      if (data.receipt_code) setReceiptCode(data.receipt_code)
      if (data.innbucks) setInnbucks(data.innbucks)
      setBookingId(data.booking_id)
    } catch (err) {
      console.error('Payment initiation failed:', err)
      setFailReason(null)
      setScreen('failed')
    }
  }

  useEffect(() => {
    if (screen !== 'loading' || !bookingId) return

    let active = true
    const check = async () => {
      try {
        const res = await fetch(
          `/api/paynow-poll?booking_id=${encodeURIComponent(bookingId)}`,
        )
        if (!res.ok) return
        const data = await res.json()
        if (!active) return
        const status = String(data.status ?? '').toLowerCase()
        if (status === 'paid') {
          setReceiptCode((code) => code || data.receipt_code || generateReceiptCode())
          setScreen('success')
        } else if (status === 'failed' || status === 'cancelled') {
          setScreen('failed')
        }
      } catch {
        // network hiccup — keep polling
      }
    }

    check()
    const intervalId = setInterval(check, 5000)
    return () => {
      active = false
      clearInterval(intervalId)
    }
  }, [screen, bookingId])

  const tryAgain = () => {
    setBookingId(null)
    setReceiptCode('')
    setInnbucks(null)
    setFailReason(null)
    setScreen('select')
  }

  return (
    <div className="fixed inset-0 z-[1300] flex items-center justify-center bg-black/50 p-4">
      <div className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl">
        {screen === 'select' && (
          <>
            <h2 className="text-xl font-bold text-gray-900">
              Book a Room at {house.name}
            </h2>

            <div className="mt-4 grid grid-cols-2 gap-3">
              {roomOptions.map((t) => (
                <RoomTile
                  key={t.id}
                  title={t.label}
                  fee={t.fee}
                  price={house[t.priceField] ?? 0}
                  selected={roomType === t.id}
                  onSelect={() => setRoomType(t.id)}
                />
              ))}
            </div>

            <label className="mt-4 block">
              <span className="text-sm font-medium text-gray-700">
                EcoCash or OneMoney Number
              </span>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+263 77 123 4567"
                className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-green-600 focus:outline-none"
              />
            </label>

            <label className="mt-3 block">
              <span className="text-sm font-medium text-gray-700">
                Your Email Address
              </span>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-green-600 focus:outline-none"
              />
            </label>

            <fieldset className="mt-3">
              <legend className="text-sm font-medium text-gray-700">
                Payment Method
              </legend>
              <div className="mt-1 flex gap-4">
                {PAYMENT_METHODS.map((m) => (
                  <label key={m.id} className="flex items-center gap-2">
                    <input
                      type="radio"
                      name="payment_method"
                      value={m.id}
                      checked={paymentMethod === m.id}
                      onChange={() => setPaymentMethod(m.id)}
                      className="accent-green-600"
                    />
                    <span className="text-sm text-gray-800">{m.label}</span>
                  </label>
                ))}
              </div>
            </fieldset>

            <label className="mt-4 flex items-start gap-2 text-sm text-gray-700">
              <input
                type="checkbox"
                checked={agreedToTerms}
                onChange={(e) => setAgreedToTerms(e.target.checked)}
                className="mt-0.5 accent-green-600"
              />
              <span>
                I agree to the{' '}
                <a
                  href="/terms"
                  target="_blank"
                  rel="noreferrer"
                  className="font-medium text-green-700 underline"
                >
                  Terms of Service
                </a>{' '}
                and understand that all bookings are strictly non-refundable.
              </span>
            </label>

            <div className="mt-5 flex gap-3">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 rounded-full border border-gray-300 px-4 py-3 font-semibold text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={!canPay}
                onClick={confirmAndPay}
                className="flex-1 rounded-full bg-green-600 px-4 py-3 font-semibold text-white hover:bg-green-700 disabled:cursor-not-allowed disabled:bg-gray-300"
              >
                Confirm &amp; Pay
              </button>
            </div>
          </>
        )}

        {screen === 'loading' &&
          (paymentMethod === 'innbucks' && innbucks?.authorizationcode ? (
            <div className="flex flex-col items-center py-8 text-center">
              <p className="font-semibold text-gray-900">
                Open your InnBucks app and enter this code:
              </p>
              <div className="mt-4 rounded-lg bg-gray-100 px-6 py-3 font-mono text-3xl font-bold tracking-widest text-gray-900">
                {innbucks.authorizationcode}
              </div>
              {innbucks.expires_at && (
                <p className="mt-2 text-xs text-gray-500">
                  Code expires: {innbucks.expires_at}
                </p>
              )}
              {innbucks.deep_link_url && (
                <a
                  href={innbucks.deep_link_url}
                  className="mt-4 rounded-full border border-green-600 px-5 py-2 text-sm font-semibold text-green-700 hover:bg-green-50"
                >
                  Open InnBucks app
                </a>
              )}
              <div className="mt-5 flex items-center gap-2 text-sm text-gray-600">
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-green-600 border-t-transparent" />
                Waiting for payment confirmation...
              </div>
              <p className="mt-4 text-sm font-medium text-red-600">
                Do not close this screen
              </p>
            </div>
          ) : (
            <div className="flex flex-col items-center py-8 text-center">
              <div className="h-12 w-12 animate-spin rounded-full border-4 border-green-600 border-t-transparent" />
              <p className="mt-5 font-semibold text-gray-900">
                Sending payment request to your phone...
              </p>
              <p className="mt-2 text-sm text-gray-600">
                Check your {methodLabel} for a payment prompt
              </p>
              <p className="mt-4 text-sm font-medium text-red-600">
                Do not close this screen
              </p>
            </div>
          ))}

        {screen === 'success' && (
          <div className="flex flex-col items-center py-6 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-green-100 text-4xl text-green-600">
              ✓
            </div>
            <h2 className="mt-4 text-xl font-bold text-gray-900">
              Booking Confirmed!
            </h2>
            <div className="mt-4 rounded-lg bg-gray-100 px-4 py-2 font-mono text-lg tracking-wider text-gray-900">
              {receiptCode}
            </div>
            <dl className="mt-4 w-full space-y-1 text-sm text-gray-700">
              <div className="flex justify-between">
                <dt className="text-gray-500">House</dt>
                <dd className="font-medium">{house.name}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gray-500">Room type</dt>
                <dd className="font-medium">{selectedType?.label ?? roomType}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gray-500">Amount paid</dt>
                <dd className="font-medium">${selectedType?.fee}</dd>
              </div>
            </dl>
            <p className="mt-4 text-sm text-gray-600">
              Save this receipt and show it to your landlord on arrival
            </p>
            <button
              type="button"
              onClick={onClose}
              className="mt-5 w-full rounded-full bg-green-600 px-4 py-3 font-semibold text-white hover:bg-green-700"
            >
              Done
            </button>
          </div>
        )}

        {screen === 'failed' && (
          <div className="flex flex-col items-center py-6 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-red-100 text-4xl text-red-600">
              ✕
            </div>
            <h2 className="mt-4 text-xl font-bold text-gray-900">
              Payment was not completed
            </h2>
            <p className="mt-2 text-sm text-gray-600">
              {failReason
                ? `${failReason}. No money was taken.`
                : 'Your transaction was cancelled or failed. No money was taken.'}
            </p>
            <div className="mt-5 flex w-full gap-3">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 rounded-full border border-gray-300 px-4 py-3 font-semibold text-gray-700 hover:bg-gray-50"
              >
                Close
              </button>
              <button
                type="button"
                onClick={tryAgain}
                className="flex-1 rounded-full bg-green-600 px-4 py-3 font-semibold text-white hover:bg-green-700"
              >
                Try Again
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default BookingModal
