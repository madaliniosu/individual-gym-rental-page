import { createClient } from '@/lib/supabase/server'
import { stripe } from '@/lib/stripe'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { startTime, endTime, totalHours } = await request.json()

  const amountCents = totalHours * Number(process.env.HOURLY_RATE_CENTS)

  // Get profile id
  const { data: profile } = await supabase
    .from('profiles')
    .select('id')
    .eq('auth_user_id', user.id)
    .single()

  if (!profile) {
    return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
  }

  // Create booking in pending_payment state
  const { data: booking, error } = await supabase
    .from('bookings')
    .insert({
      user_id: profile.id,
      start_time: startTime,
      end_time: endTime,
      total_hours: totalHours,
      amount_cents: amountCents,
      status: 'pending_payment',
    })
    .select()
    .single()

  if (error) {
    // The exclusion constraint fires here if slot is taken
    if (error.code === '23P01') {
      return NextResponse.json({ error: 'Slot no longer available' }, { status: 409 })
    }
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Create Stripe Payment Intent
  const paymentIntent = await stripe.paymentIntents.create({
    amount: amountCents,
    currency: 'eur',
    metadata: { bookingId: booking.id },
  })

  // Store payment record
  await supabase.from('payments').insert({
    booking_id: booking.id,
    stripe_payment_intent_id: paymentIntent.id,
    stripe_status: paymentIntent.status,
    amount_cents: amountCents,
    currency: 'eur',
  })

  return NextResponse.json({
    bookingId: booking.id,
    clientSecret: paymentIntent.client_secret,
  })
}