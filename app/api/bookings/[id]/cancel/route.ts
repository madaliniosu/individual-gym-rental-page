// import { createClient } from '@/lib/supabase/server'
// import { supabaseAdmin } from '@/lib/supabase/admin'
// import { stripe } from '@/lib/stripe'
// import { sendCancellationConfirmation } from '@/lib/resend'
// import { NextResponse } from 'next/server'

// export async function POST(
//   request: Request,
//   { params }: { params: { id: string } }
// ) {
//   const supabase = await createClient()
//   const { data: { user } } = await supabase.auth.getUser()

//   if (!user) {
//     return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
//   }

//   const { data: canCancel } = await supabase
//     .rpc('can_cancel', { booking_uuid: params.id })

//   if (!canCancel) {
//     return NextResponse.json(
//       { error: 'Cancellation window has passed' },
//       { status: 400 }
//     )
//   }

//   const { data: payment } = await supabaseAdmin
//     .from('payments')
//     .select('stripe_payment_intent_id, amount_cents')
//     .eq('booking_id', params.id)
//     .single()

//   if (!payment) {
//     return NextResponse.json({ error: 'Payment not found' }, { status: 404 })
//   }

//   const refund = await stripe.refunds.create({
//     payment_intent: payment.stripe_payment_intent_id,
//   })

//   await supabaseAdmin
//     .from('bookings')
//     .update({
//       status: 'cancelled',
//       cancelled_at: new Date().toISOString(),
//       nuki_code: null,
//     })
//     .eq('id', params.id)

//   await supabaseAdmin
//     .from('payments')
//     .update({
//       refunded_at: new Date().toISOString(),
//       refund_amount_cents: payment.amount_cents,
//       stripe_refund_id: refund.id,
//     })
//     .eq('booking_id', params.id)

//   const { data: booking } = await supabaseAdmin
//     .from('bookings')
//     .select('*, profiles(full_name, auth_user_id)')
//     .eq('id', params.id)
//     .single()

//   if (!booking) {
//     return NextResponse.json({ error: 'Booking not found' }, { status: 404 })
//   }

//   const { data: authData } = await supabaseAdmin.auth.admin.getUserById(
//     booking.profiles.auth_user_id
//   )

//   if (!authData.user?.email) {
//     console.error('No email found for user', booking.profiles.auth_user_id)
//     return NextResponse.json({ error: 'User email not found' }, { status: 500 })
//   }

//   await sendCancellationConfirmation({
//     to: authData.user.email,
//     name: booking.profiles.full_name,
//     startTime: booking.start_time,
//     refundAmountCents: payment.amount_cents,
//   })

//   return NextResponse.json({ success: true })
// }