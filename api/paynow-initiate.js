import { createClient } from '@supabase/supabase-js'
import paynowPkg from 'paynow'

// paynow is a CommonJS package; with "type": "module" it must be
// default-imported and destructured.
const { Paynow } = paynowPkg

const ROOM_FEES = { single: 8, shared2: 4, shared3: 4, shared4: 4 }
const PAYMENT_METHODS = ['ecocash', 'onemoney', 'innbucks']

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const {
    house_id,
    room_type,
    amount,
    student_phone,
    student_email,
    payment_method,
  } = req.body ?? {}

  // 1) amount must be exactly the fee for the chosen room type
  const expectedFee = ROOM_FEES[room_type]
  if (!expectedFee) {
    return res.status(400).json({
      error: `Invalid room_type. Must be one of: ${Object.keys(ROOM_FEES).join(', ')}`,
    })
  }
  if (Number(amount) !== expectedFee) {
    return res.status(400).json({
      error: `Invalid amount. A ${room_type} booking costs exactly $${expectedFee}.`,
    })
  }

  // 2) payment method
  if (!PAYMENT_METHODS.includes(payment_method)) {
    return res.status(400).json({
      error: "payment_method must be 'ecocash', 'onemoney' or 'innbucks'",
    })
  }

  if (!house_id || !student_phone?.trim() || !student_email?.trim()) {
    return res.status(400).json({
      error: 'house_id, student_phone and student_email are required',
    })
  }

  // 3) service-role client — server-side only, bypasses RLS
  const supabase = createClient(
    process.env.VITE_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY,
  )

  try {
    const { data: house, error: houseErr } = await supabase
      .from('houses')
      .select('name, is_full')
      .eq('id', house_id)
      .single()
    if (houseErr || !house) {
      return res.status(404).json({ error: 'House not found' })
    }
    if (house.is_full) {
      return res.status(409).json({ error: 'This house is fully booked' })
    }

    // 4) pending booking row
    const { data: booking, error: insertErr } = await supabase
      .from('bookings')
      .insert({
        house_id,
        room_type,
        amount: expectedFee,
        student_phone: student_phone.trim(),
        student_email: student_email.trim(),
        payment_method,
        payment_status: 'pending',
      })
      .select('id')
      .single()
    if (insertErr) {
      console.error('Booking insert failed:', insertErr)
      return res.status(500).json({ error: 'Could not create booking' })
    }

    try {
      // 5) Paynow instance
      const paynow = new Paynow(
        process.env.PAYNOW_INTEGRATION_ID,
        process.env.PAYNOW_INTEGRATION_KEY,
      )
      paynow.resultUrl = process.env.PAYNOW_RESULT_URL
      paynow.returnUrl = process.env.PAYNOW_RETURN_URL

      // 6) payment referencing the booking
      const payment = paynow.createPayment(`booking-${booking.id}`, student_email.trim())
      payment.add(`Room Booking - ${house.name} (${room_type})`, expectedFee)

      // 7) send the mobile-money prompt
      const response = await paynow.sendMobile(
        payment,
        student_phone.trim(),
        payment_method,
      )

      // 8) failure: remove the orphaned pending booking
      if (!response || !response.success) {
        await supabase.from('bookings').delete().eq('id', booking.id)
        console.error('Paynow rejected payment:', response?.error)
        return res.status(500).json({
          error: response?.error ?? 'Payment initiation failed',
        })
      }

      // 9) success: persist the poll URL
      const { error: updateErr } = await supabase
        .from('bookings')
        .update({ paynow_poll_url: response.pollUrl })
        .eq('id', booking.id)
      if (updateErr) {
        console.error('Failed to save poll URL:', updateErr)
        return res.status(500).json({ error: 'Could not save payment reference' })
      }

      // InnBucks has no phone prompt — Paynow returns an authorization code
      // the student enters in the InnBucks app; pass it to the frontend
      return res.status(200).json({
        booking_id: booking.id,
        instructions: response.instructions,
        innbucks: response.isInnbucks ? (response.innbucks_info?.[0] ?? null) : null,
      })
    } catch (paynowErr) {
      // Paynow threw after the booking was created — clean it up
      await supabase
        .from('bookings')
        .delete()
        .eq('id', booking.id)
        .then(null, () => {})
      throw paynowErr
    }
  } catch (err) {
    console.error('paynow-initiate error:', err)
    return res.status(500).json({ error: 'Internal server error' })
  }
}
