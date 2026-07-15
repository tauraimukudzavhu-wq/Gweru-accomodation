import { createClient } from '@supabase/supabase-js'
import paynowPkg from 'paynow'

const { Paynow } = paynowPkg

const AVAIL_FIELDS = {
  single: 'single_rooms_available',
  shared2: 'shared2_rooms_available',
  shared3: 'shared3_rooms_available',
  shared4: 'shared4_rooms_available',
}

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

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return res.status(405).json({ error: 'Method not allowed' })
  }

  // 1) Paynow posts application/x-www-form-urlencoded; Vercel usually parses
  // it into an object, but handle a raw string body too. Field order is
  // preserved either way, which matters because the hash covers the values
  // in the order they were sent.
  let fields = req.body ?? {}
  if (typeof fields === 'string') {
    fields = Object.fromEntries(new URLSearchParams(fields))
  }

  // 2) verify the hash before trusting anything in the payload
  const paynow = new Paynow(
    process.env.PAYNOW_INTEGRATION_ID,
    process.env.PAYNOW_INTEGRATION_KEY,
  )
  if (!paynow.verifyHash(fields)) {
    console.error('paynow-result: invalid hash — possible spoofed request')
    return res.status(400).json({ error: 'Invalid hash' })
  }

  try {
    // 3) merchant reference is booking-{booking_id}
    const reference = String(fields.reference ?? '')
    if (!reference.startsWith('booking-')) {
      console.error(`paynow-result: unexpected reference "${reference}"`)
      return res.status(200).send('OK')
    }
    const bookingId = reference.slice('booking-'.length)

    const supabase = createClient(
      process.env.VITE_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_KEY,
    )
    const status = String(fields.status ?? '').toLowerCase()

    // 4) settle the booking
    if (status === 'paid') {
      const { data: booking } = await supabase
        .from('bookings')
        .select('house_id, room_type')
        .eq('id', bookingId)
        .single()
      if (!booking) {
        console.error(`paynow-result: booking not found: ${bookingId}`)
        return res.status(200).send('OK')
      }

      // transition guard: the poll endpoint may have settled this already —
      // only the request that flips the status decrements the room count
      const { data: transitioned } = await supabase
        .from('bookings')
        .update({
          payment_status: 'paid',
          paynow_reference: fields.paynowreference ?? null,
        })
        .eq('id', bookingId)
        .neq('payment_status', 'paid')
        .select('receipt_code')

      if (transitioned && transitioned.length > 0) {
        if (!transitioned[0].receipt_code) {
          await supabase
            .from('bookings')
            .update({ receipt_code: generateReceiptCode() })
            .eq('id', bookingId)
            .is('receipt_code', null)
        }

        const field = AVAIL_FIELDS[booking.room_type]
        if (field) {
          const { data: house } = await supabase
            .from('houses')
            .select(field)
            .eq('id', booking.house_id)
            .single()
          if (house && house[field] > 0) {
            const { error: decErr } = await supabase
              .from('houses')
              .update({ [field]: house[field] - 1 })
              .eq('id', booking.house_id)
            if (decErr) console.error('Room decrement failed:', decErr.message)
          }
        }
      }
    } else if (status === 'cancelled' || status === 'failed') {
      await supabase
        .from('bookings')
        .update({ payment_status: 'failed' })
        .eq('id', bookingId)
        .eq('payment_status', 'pending')
    }

    // 5) always 200 so Paynow stops retrying
    return res.status(200).send('OK')
  } catch (err) {
    console.error('paynow-result error:', err)
    return res.status(200).send('OK')
  }
}
