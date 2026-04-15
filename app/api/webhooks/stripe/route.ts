import { supabaseAdmin } from '@/lib/supabase/admin'
import { stripe } from '@/lib/stripe'
import { sendBookingConfirmation } from '@/lib/resend'
import { createNukiCode } from '@/lib/nuki'
import { NextResponse } from 'next/server'
import { headers } from 'next/headers'

export async function POST(request: Request) {
  const body = await request.text()
  const headersList = await headers()
  const signature = headersList.get('stripe-signature')

  if (!signature) {
    return NextResponse.json({ error: 'No signature' }, { status: 400 })
  }

  let event
  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    )
  } catch {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  if (event.type === 'payment_intent.succeeded') {
    const paymentIntent = event.data.object
    const bookingId = paymentIntent.metadata.bookingId

    const { data: booking } = await supabaseAdmin
      .from('bookings')
      .select('*, profiles(full_name, auth_user_id)')
      .eq('id', bookingId)
      .single()

    if (!booking) {
      return NextResponse.json({ error: 'Booking not found' }, { status: 404 })
    }

    const { code, lockActionId } = await createNukiCode(
      booking.start_time,
      booking.end_time
    )

    await supabaseAdmin
      .from('bookings')
      .update({
        status: 'confirmed',
        nuki_code: code,
        nuki_lock_action_id: lockActionId,
      })
      .eq('id', bookingId)

    await supabaseAdmin
      .from('payments')
      .update({ stripe_status: 'succeeded' })
      .eq('stripe_payment_intent_id', paymentIntent.id)

    const { data: authData } = await supabaseAdmin.auth.admin.getUserById(
      booking.profiles.auth_user_id
    )

    if (!authData.user?.email) {
      console.error('No email found for user', booking.profiles.auth_user_id)
      return NextResponse.json({ error: 'User email not found' }, { status: 500 })
    }

    await sendBookingConfirmation({
      to: authData.user.email,
      name: booking.profiles.full_name,
      startTime: booking.start_time,
      endTime: booking.end_time,
      totalHours: booking.total_hours,
      amountCents: booking.amount_cents,
      nukiCode: code,
    })
  }

  return NextResponse.json({ received: true })
}

export const config = { api: { bodyParser: false } }