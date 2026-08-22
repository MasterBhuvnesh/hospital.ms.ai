# curl cheat-sheet — backend-demo (run in Git Bash / WSL)

Base URL and helper:

```bash
B=http://localhost:8080

# grab a token for any seeded account
TOKEN=$(curl -s -X POST $B/api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"identifier":"patient@atelier.local","password":"Demo@12345"}' | sed 's/.*"accessToken":"\([^"]*\)".*/\1/')
```

Seeded logins (all password `Demo@12345`, platform admin `Admin@12345`):
`admin@atelier.local` · `asha@atelier.local` · `rahul@atelier.local` · `kavita@atelier.local` · `neha@atelier.local` · `imran@atelier.local` · `reception@atelier.local` · `pharmacy@atelier.local` · `lab@atelier.local` · `hospadmin@atelier.local` · `nurse@atelier.local` · `mumbai.reception@atelier.local` · `arjun@atelier.local` · `meera@atelier.local` · `patient@atelier.local`

## Explore the seed data

```bash
curl -s $B/health/ready                                        # which integrations are live
curl -s $B/api/directory/hospitals                             # 2 hospitals
curl -s "$B/api/directory/doctors"                             # 8 doctors w/ fees
curl -s "$B/api/directory/search?q=derma"                      # fuzzy search
```

## Live queue (the flagship)

```bash
# find Dr. Asha Rao's id
DOCID=$(curl -s "$B/api/directory/doctors?specialization=cardiology" | grep -o '"id":"[^"]*' | head -1 | cut -d'"' -f4)
curl -s "$B/api/scheduling/queue?doctorId=$DOCID" -H "Authorization: Bearer $TOKEN"
# EMERGENCY sorts ahead of SENIOR_CITIZEN ahead of NORMAL regardless of token number
```

Drive it (login as receptionist first):

```bash
RECEP=$( ... login reception@atelier.local ...)
DOCTOK=$( ... login asha@atelier.local ... )
TOKID=<paste tokenId from queue>
curl -X POST $B/api/scheduling/tokens/$TOKID/call   -H "Authorization: Bearer $RECEP"
curl -X POST $B/api/scheduling/tokens/$TOKID/start  -H "Authorization: Bearer $DOCTOK"
curl -X POST $B/api/scheduling/tokens/$TOKID/complete -H "Authorization: Bearer $DOCTOK"   # -> invoice!
```

## History & records

```bash
curl -s "$B/api/commerce/invoices" -H "Authorization: Bearer <hospadmin token>"      # ~34 invoices
curl -s "$B/api/admin/audit?action=phi&limit=20" -H "Authorization: Bearer <hospadmin token>"
curl -s "$B/api/admin/events" -H "Authorization: Bearer <admin token>"               # event bus replay
curl -s "$B/api/comms/notifications" -H "Authorization: Bearer <patient token>"      # patient inbox
```

## Pharmacy & stock

```bash
PHA=$( ... login pharmacy@atelier.local ... )
curl -s "$B/api/commerce/pharmacy/catalog"                     # 14 items w/ qtyOnHand
curl -s "$B/api/commerce/inventory/low-stock" -H "Authorization: Bearer $PHA"   # Ibuprofen, Vit D3...
```

## AI

```bash
curl -s $B/api/ai/status
curl -s -X POST $B/api/ai/chat -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{"message":"I have mild fever, what should I do?"}'        # ~15-60s (thinking model)
curl -s -X DELETE $B/api/ai/memory -H "Authorization: Bearer $TOKEN"   # DPDP erasure
```

Tip: pipe any response through `| python -m json.tool` (or `| node -e ...`) for pretty printing.

Note: the seeded "live queue" is dated to the day you ran `pnpm seed:rich`. If the clock rolls past midnight (Asia/Kolkata), today's queue will be empty — wipe `data/*.json`, re-run `pnpm seed:rich`, and restart the server to refresh it. Historical visits/invoices are unaffected.
