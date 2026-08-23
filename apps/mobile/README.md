# Atelier Health — patient app

Expo SDK 57 · Expo Router · NativeWind 4 (Tailwind 3) · lucide-react-native.

Talks to the live demo backend (`EXPO_PUBLIC_API_URL`, default
`https://backend-demo-hms.onrender.com`). Free-tier Render sleeps — the first
request after idle can take ~60s; screens show a friendly error meanwhile.

## Run

```bash
bun install
bun start          # Expo Go QR, or press a / i for emulators
```

Demo login: `patient@atelier.local` / `Demo@12345` (password tab), or Phone OTP
tab — with `DEMO_EXPOSE_OTP=true` on the server the code is returned in the API
response and shown inline.

## What's implemented

| Area | Details |
|---|---|
| Auth | Email+password, **phone OTP login**, password reset via OTP code |
| Home | Live-queue banner, next visit card, quick actions (Book / Bills / Ask AI), unread badge |
| Booking | Hospital → doctor → live availability slots → confirm, idempotency key on submit |
| Visits | Upcoming/history, mint queue token, reschedule against live availability, cancel |
| Live queue | SSE realtime stream with automatic **5s polling fallback**, position + ETA, near-turn banner, status stepper incl. skipped |
| Records | Allergies / conditions / medications, released lab results, document upload to S3 |
| Prescriptions | List signed Rx, open PDF, save to device, share |
| Payments | Invoices, line-item detail, invoice PDF, demo checkout (mock capture) |
| Copilot | AI chat over own records + DPDP memory erase |
| Notifications | Inbox w/ read state, push token registration (Expo push), deep links into `/queue/[id]`, Android channels |
| Profile | Avatar upload, emergency contact + insurance, device list w/ revoke, per-category channel preferences |
| Updates | Server-driven `minSupportedVersion` blocking gate |

## Config

Copy `.env.example` → `.env`. Keys are public client values only:

```
EXPO_PUBLIC_API_URL=https://backend-demo-hms.onrender.com
EXPO_PUBLIC_APP_VERSION=1.0.0
```

## Checks

```bash
bunx tsc --noEmit     # typecheck
bunx expo lint        # eslint
bunx expo export -p android   # full bundle smoke test
```

Push notifications require an EAS build (`eas init` then `eas build`) — Expo Go
cannot receive them; registration degrades silently and SMS remains the
fallback channel.
