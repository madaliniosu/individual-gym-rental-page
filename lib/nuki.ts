export async function createNukiCode(startTime: string, endTime: string) {
  const response = await fetch(
    `https://api.nuki.io/smartlock/${process.env.NUKI_SMARTLOCK_ID}/auth`,
    {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${process.env.NUKI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: `Booking ${new Date(startTime).toISOString()}`,
        type: 13,                      // type 13 = time-limited keypad code
        allowedFromDate: startTime,
        allowedUntilDate: endTime,
      }),
    }
  )

  const data = await response.json()
  return {
    code: data.code.toString(),
    lockActionId: data.id.toString(),
  }
}

export async function revokeNukiCode(lockActionId: string) {
  await fetch(
    `https://api.nuki.io/smartlock/${process.env.NUKI_SMARTLOCK_ID}/auth/${lockActionId}`,
    {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${process.env.NUKI_API_KEY}` },
    }
  )
}