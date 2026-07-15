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
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET')
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { booking_id } = req.query ?? {}
  if (!booking_id) {
    return res.status(400).json({ error: 'booking_id is required' })
  }

  const supabase = createClient(
    process.env.VITE_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY,
  )

  try {
    // 1) load the booking and its poll URL
    const { data: booking, error: bookingErr } = await supabase
      .from('bookings')
      .select('*')
      .eq('id', booking_id)
      .single()
    if (bookingErr || !booking) throw new Error(`Booking not found: ${booking_id}`)

    // fast paths: a previous poll already settled this booking
    if (booking.payment_status === 'paid') {
      return res.status(200).json({ status: 'paid', receipt_code: booking.receipt_code })
    }
    if (booking.payment_status === 'failed') {
      return res.status(200).json({ status: 'failed' })
    }
    if (!booking.paynow_poll_url) throw new Error('Booking has no poll URL')

    // 2-3) ask Paynow for the transaction status
    const paynow = new Paynow(
      process.env.PAYNOW_INTEGRATION_ID,
      process.env.PAYNOW_INTEGRATION_KEY,
    )
    const status = await paynow.pollTransaction(booking.paynow_poll_url)

    // paynow v2 returns an InitResponse with a plain lowercased .status
    // string — .paid() only exists on StatusResponse, so support both
    const statusText = String(status?.status ?? '').toLowerCase()
    const isPaid =
      typeof status?.paid === 'function'
        ? status.paid()
        : ['paid', 'awaiting delivery', 'delivered'].includes(statusText)

    // 4) settle according to the status
    if (isPaid) {
      // flip to paid only if not already paid, so concurrent polls can't
      // decrement the room count twice
      const { data: transitioned } = await supabase
        .from('bookings')
        .update({ payment_status: 'paid' })
        .eq('id', booking_id)
        .neq('payment_status', 'paid')
        .select('receipt_code')

      let receiptCode
      if (transitioned && transitioned.length > 0) {
        // receipt_code may have been set by a database trigger during the
        // update; otherwise generate one here
        receiptCode = transitioned[0].receipt_code
        if (!receiptCode) {
          receiptCode = generateReceiptCode()
          await supabase
            .from('bookings')
            .update({ receipt_code: receiptCode })
            .eq('id', booking_id)
            .is('receipt_code', null)
        }

        // decrement the booked room type's availability on the house
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
            if (decErr) {
              // the payment is already settled — log loudly but don't fail
              console.error('Room decrement failed:', decErr.message)
            }
          }
        }
      }

      // read back in case a concurrent poll or trigger set the code first
      const { data: settled } = await supabase
        .from('bookings')
        .select('receipt_code')
        .eq('id', booking_id)
        .single()
      return res.status(200).json({
        status: 'paid',
        receipt_code: settled?.receipt_code ?? receiptCode,
      })
    }

    if (statusText === 'cancelled' || statusText === 'failed') {
      await supabase
        .from('bookings')
        .update({ payment_status: 'failed' })
        .eq('id', booking_id)
      return res.status(200).json({ status: 'failed' })
    }

    return res.status(200).json({ status: 'pending' })
  } catch (err) {
    // 5) never crash the frontend's poll loop — report pending and let it retry
    console.error('paynow-poll error:', err)
    return res.status(200).json({ status: 'pending' })
  }
}
