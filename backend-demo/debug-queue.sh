#!/usr/bin/env bash
B=http://localhost:8080
TOKEN=$(curl -s -X POST $B/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"identifier":"patient@atelier.local","password":"Demo@12345"}' | sed 's/.*"accessToken":"\([^"]*\)".*/\1/')
echo "TOKEN_LEN=${#TOKEN}"
DOCID=$(curl -s "$B/api/directory/doctors?specialization=cardiology" | grep -o '"id":"[^"]*' | head -1 | cut -d'"' -f4)
echo "DOCID=$DOCID"
RAW=$(curl -s "$B/api/scheduling/queue?doctorId=$DOCID" -H "Authorization: Bearer $TOKEN")
echo "RAW_HEAD=${RAW:0:500}"
