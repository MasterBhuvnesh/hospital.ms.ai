import { cfg } from '../config.js'

export type SendResult = { ok: boolean; provider: 'twilio' | 'console'; id?: string; error?: string }

async function twilioSend(to: string, from: string, body: string): Promise<SendResult> {
  const url = `https://api.twilio.com/2010-04-01/Accounts/${cfg.twilio.accountSid}/Messages.json`
  const params = new URLSearchParams({ To: to, From: from, Body: body })
  const auth = Buffer.from(`${cfg.twilio.accountSid}:${cfg.twilio.authToken}`).toString('base64')
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${auth}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params.toString(),
    })
    const json: any = await res.json()
    if (!res.ok) return { ok: false, provider: 'twilio', error: json?.message ?? `HTTP ${res.status}` }
    return { ok: true, provider: 'twilio', id: json.sid }
  } catch (e: any) {
    return { ok: false, provider: 'twilio', error: e?.message }
  }
}

export async function sendSms(to: string, body: string): Promise<SendResult> {
  const configured = Boolean(cfg.twilio.accountSid && cfg.twilio.authToken && cfg.twilio.smsFrom)
  if (!configured) {
    console.log(`[SMS:console] to=${to} body="${body}"`)
    return { ok: true, provider: 'console' }
  }
  return twilioSend(to, cfg.twilio.smsFrom, body)
}

export async function sendWhatsApp(to: string, body: string): Promise<SendResult> {
  const configured = Boolean(cfg.twilio.accountSid && cfg.twilio.authToken && cfg.twilio.whatsappFrom)
  if (!configured) {
    console.log(`[WHATSAPP:console] to=${to} body="${body}"`)
    return { ok: true, provider: 'console' }
  }
  const waTo = to.startsWith('whatsapp:') ? to : `whatsapp:${to}`
  const waFrom = cfg.twilio.whatsappFrom.startsWith('whatsapp:')
    ? cfg.twilio.whatsappFrom
    : `whatsapp:${cfg.twilio.whatsappFrom}`
  return twilioSend(waTo, waFrom, body)
}
