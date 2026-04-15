import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

export async function sendBookingConfirmation({
  to, name, startTime, endTime, totalHours, amountCents, nukiCode
}: {
  to: string
  name: string
  startTime: string
  endTime: string
  totalHours: number
  amountCents: number
  nukiCode: string
}) {
  const start = new Date(startTime).toLocaleString('es-ES', { timeZone: 'Europe/Madrid' })
  const end   = new Date(endTime).toLocaleString('es-ES', { timeZone: 'Europe/Madrid' })

  await resend.emails.send({
    from: process.env.RESEND_FROM_EMAIL!,
    to,
    subject: 'Booking confirmed — your entrance code',
    html: `
      <h2>Booking confirmed</h2>
      <p>Hi ${name}, your booking is confirmed.</p>
      <p><strong>Date:</strong> ${start} – ${end}</p>
      <p><strong>Duration:</strong> ${totalHours}h</p>
      <p><strong>Amount paid:</strong> €${(amountCents / 100).toFixed(2)}</p>
      <h3>Your entrance code: ${nukiCode}</h3>
      <p>This code is valid only during your booked time.</p>
    `,
  })
}

export async function sendCancellationConfirmation({
  to, name, startTime, refundAmountCents
}: {
  to: string
  name: string
  startTime: string
  refundAmountCents: number
}) {
  const start = new Date(startTime).toLocaleString('es-ES', { timeZone: 'Europe/Madrid' })

  await resend.emails.send({
    from: process.env.RESEND_FROM_EMAIL!,
    to,
    subject: 'Booking cancelled — refund issued',
    html: `
      <h2>Booking cancelled</h2>
      <p>Hi ${name}, your booking for ${start} has been cancelled.</p>
      <p>A full refund of €${(refundAmountCents / 100).toFixed(2)} has been issued and will appear in 5–10 business days.</p>
    `,
  })
}