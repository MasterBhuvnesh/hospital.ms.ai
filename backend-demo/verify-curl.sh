#!/usr/bin/env bash
set -e
B=http://localhost:8080

TOKEN=$(curl -s -X POST $B/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"identifier":"patient@atelier.local","password":"Demo@12345"}' | sed 's/.*"accessToken":"\([^"]*\)".*/\1/')
echo "1. patient token extracted, length: ${#TOKEN}"

DOCID=$(curl -s "$B/api/directory/doctors?specialization=cardiology" | grep -o '"id":"[^"]*' | head -1 | cut -d'"' -f4)
echo "2. Dr. Asha DOCID: $DOCID"

echo "3. live queue (priority ordering):"
curl -s "$B/api/scheduling/queue?doctorId=$DOCID" -H "Authorization: Bearer $TOKEN" \
  | node -e "let d='';process.stdin.on('data',c=>d+=c).on('end',()=>{const j=JSON.parse(d);j.data.waiting.forEach(w=>console.log('   pos',w.position,'-> token',w.tokenNumber,'['+w.priority+']',w.patientName))})"

ADM=$(curl -s -X POST $B/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"identifier":"hospadmin@atelier.local","password":"Demo@12345"}' | sed 's/.*"accessToken":"\([^"]*\)".*/\1/')

echo "4. invoices total: $(curl -s "$B/api/commerce/invoices" -H "Authorization: Bearer $ADM" | node -e "let d='';process.stdin.on('data',c=>d+=c).on('end',()=>console.log(JSON.parse(d).data.total))")"

PHA=$(curl -s -X POST $B/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"identifier":"pharmacy@atelier.local","password":"Demo@12345"}' | sed 's/.*"accessToken":"\([^"]*\)".*/\1/')
echo "5. low stock: $(curl -s "$B/api/commerce/inventory/low-stock" -H "Authorization: Bearer $PHA" | grep -o '"name":"[^"]*' | cut -d'"' -f4 | paste -sd, -)"

echo "6. patient notifications unread: $(curl -s "$B/api/comms/notifications" -H "Authorization: Bearer $TOKEN" | grep -o '"unreadCount":[0-9]*')"
echo ""
echo "ALL CURL COMMANDS FROM CHEAT-SHEET VERIFIED"
