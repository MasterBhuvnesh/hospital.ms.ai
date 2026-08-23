/**
 * Direct Twilio probe: sends one SMS and one WhatsApp message to a number.
 *   node scripts/twilio-probe.mjs +918390545534 "Hello from Atelier Health"
 */
import fs from 'node:fs'
import path from 'node:path'

const envFile = fs.readFileSync(path.resolve(process.cwd(), '.env'), 'utf8')
const env = Object.fromEntries(
  envFile
    .split(/\r?\n/)
    .filter((l) => l.includes('=') && !l.trim().startsWith('#'))
    .map((l) => [l.slice(0, l.indexOf('=')).trim(), l.slice(l.indexOf('=') + 1).trim()]),
)

const SID = env.TWILIO_ACCOUNT_SID
const TOKEN = env.TWILIO_AUTH_TOKEN
const SMS_FROM = env.TWILIO_SMS_FROM
const WA_FROM = env.TWILIO_WHATSAPP_FROM
const TO = process.argv[2]
const BODY = process.argv[3] ?? 'Atelier Health test message'

if (!SID || !TOKEN || !TO) {
  console.error('Missing TWILIO_ACCOUNT_SID / TWILIO_AUTH_TOKEN / destination argument')
  process.exit(1)
}

async function send(from, to) {
  const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${SID}/Messages.json`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${Buffer.from(`${SID}:${TOKEN}`).toString('base64')}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({ From: from, To: to, Body: BODY }).toString(),
  })
  const json = await res.json()
  return { http: res.status, json }
}

console.log(`SMS      -> ${TO}   (from ${SMS_FROM})`)
const sms = await send(SMS_FROM, TO)
console.log(`  HTTP ${sms.http}`)
if (sms.json.sid) console.log(`  sid=${sms.json.sid} status=${sms.json.status} errorCode=${sms.json.error_code ?? 'none'}`)
else console.log(`  ERROR ${sms.json.code}: ${sms.json.message}`)

console.log(`WhatsApp -> whatsapp:${TO}   (from ${WA_FROM})`)
const wa = await send(WA_FROM.startsWith('whatsapp:') ? WA_FROM : `whatsapp:${WA_FROM}`, `whatsapp:${TO}`)
console.log(`  HTTP ${wa.http}`)
if (wa.json.sid) console.log(`  sid=${wa.json.sid} status=${wa.json.status} errorCode=${wa.json.error_code ?? 'none'}`)
else console.log(`  ERROR ${wa.json.code}: ${wa.json.message}`)
