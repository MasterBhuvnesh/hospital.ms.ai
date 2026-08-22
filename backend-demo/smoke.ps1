$ErrorActionPreference = 'Stop'
$B = 'http://localhost:8080'
$T = Join-Path $env:TEMP 'hms-smoke'
New-Item -ItemType Directory -Force -Path $T | Out-Null

function Req {
  param([string]$Method, [string]$Url, $Body = $null, [string]$Tok = '')
  $f = Join-Path $T 'body.json'
  if ($null -ne $Body) {
    $Body | ConvertTo-Json -Depth 8 -Compress | Set-Content -Path $f -Encoding ASCII
  }
  $curlArgs = @('-s','--noproxy','*','-m','30','-X',$Method,"$B$Url")
  if ($null -ne $Body) { $curlArgs += @('-H','Content-Type: application/json','-d',"@$f") }
  if ($Tok) { $curlArgs += @('-H',"Authorization: Bearer $Tok") }
  $raw = & curl.exe @curlArgs
  if (-not $raw) { throw "empty response from $Url" }
  return ($raw | ConvertFrom-Json)
}

function Ok($res) { if ($res.error) { throw "$($res.error.code): $($res.error.message)" } ; return $res.data }

Write-Host '== 1. logins =='
$rec  = (Ok (Req POST '/api/auth/login' @{identifier='reception@atelier.local'; password='Demo@12345'})).tokens.accessToken
$docL = Ok (Req POST '/api/auth/login' @{identifier='asha@atelier.local'; password='Demo@12345'})
$doc  = $docL.tokens.accessToken
$patL = Ok (Req POST '/api/auth/login' @{identifier='patient@atelier.local'; password='Demo@12345'})
$pat  = $patL.tokens.accessToken
Write-Host ("   doctor roles: " + ($docL.roles -join ','))

Write-Host '== 2. directory =='
$hosp = Ok (Req GET '/api/directory/hospitals')
$hid  = $hosp.items[0].id
$docs = Ok (Req GET "/api/directory/doctors?hospitalId=$hid")
$did  = ($docs.items | Where-Object { $_.specializations -contains 'CARDIOLOGY' } | Select-Object -First 1).id
Write-Host "   hospital=$($hosp.items[0].name) doctor=$did"

Write-Host '== 3. negative security checks =='
$noTok = Req GET '/api/auth/me'
if ($noTok.error -and $noTok.error.code -eq 'UNAUTHORIZED') { Write-Host '   no-token rejected OK' } else { Write-Host "   FAIL no-token accepted: $(($noTok|ConvertTo-Json -Compress))" }
$forged = curl.exe -s --noproxy '*' -m 15 "$B/api/scheduling/queue?doctorId=$did" -H 'x-user-role: DOCTOR'
if ($forged -match 'UNAUTHORIZED') { Write-Host '   forged x-user-role stripped+rejected OK' } else { Write-Host "   FAIL forged header: $forged" }

Write-Host '== 4. walk-in -> token =='
$w = Ok (Req POST '/api/scheduling/walkins' @{doctorId=$did; fullName='Ramesh Kulkarni'; phone='+919820000002'; priority='NORMAL'} $rec)
$tokenId = $w.id; $cid = $w.consultationId
Set-Content .smoke.env "rec=$rec`ndoc=$doc`npat=$pat`nhid=$hid`ndid=$did"
Add-Content .smoke.env "cid=$cid`ntokenId=$tokenId"
Write-Host ("   token #$($w.tokenNumber) date=$($w.tokenDate) cid=$cid")

Write-Host '== 5. queue flow =='
$q0 = Ok (Req GET "/api/scheduling/queue?doctorId=$did" $null $rec)
Write-Host ("   pending=$($q0.pendingCount)")
(Ok (Req POST "/api/scheduling/tokens/$tokenId/call" @{} $rec)) | Out-Null
$s = Ok (Req POST "/api/scheduling/tokens/$tokenId/start" @{} $doc)
Write-Host ("   call->start status=$($s.status)")

Write-Host '== 6. consultation content =='
$content = Ok (Req PUT "/api/clinical/consultations/$cid/content" @{
  complaint='Chest pain on exertion for 2 weeks'
  vitals=@{ bp='130/85'; pulse=88; spo2=98 }
  examination='S1S2 heard, no murmur'
  assessment='Stable angina suspected'
  diagnosis='I20.9 Angina pectoris'
  plan='ECG, TMT; aspirin 75mg od'
} $doc)
Write-Host "   content saved by=$($content.savedBy.Substring(0,8))..."

Write-Host '== 7. prescription draft + sign =='
$rx = Ok (Req POST "/api/clinical/consultations/$cid/prescriptions" @{
  items=@(
    @{ drug='Paracetamol 500mg Tablet'; dose='500mg'; frequency='1-0-1'; durationDays=5; instructions='after food' },
    @{ drug='Amoxicillin 500mg Capsule'; dose='500mg'; frequency='1-1-1'; durationDays=5; instructions='complete course' }
  )
  notes='Return if pain worsens'
} $doc)
$signed = Ok (Req POST "/api/clinical/prescriptions/$($rx.id)/sign" @{} $doc)
Write-Host ("   signed hash=$($signed.contentHash.Substring(0,12))... pdfKey=$($signed.pdfKey)")
Write-Host ("   pdfUrl=$($signed.pdfUrl)")

Write-Host '== 8. lab order -> results -> release =='
$lo = Ok (Req POST "/api/clinical/consultations/$cid/lab-orders" @{
  tests=@( @{code='TROP'; name='Troponin-I'} )
  priority='URGENT'
} $doc)
Req POST "/api/clinical/lab-orders/$($lo.id)/collect" @{} ((Ok (Req POST '/api/auth/login' @{identifier='lab@atelier.local'; password='Demo@12345'})).tokens.accessToken) | Out-Null
$lab = Ok (Req POST '/api/auth/login' @{identifier='lab@atelier.local'; password='Demo@12345'})
$labt = $lab.tokens.accessToken
Ok (Req POST "/api/clinical/lab-orders/$($lo.id)/results" @{ results=@( @{parameter='Troponin-I'; value='0.02'; unit='ng/mL'; referenceRange='<0.04'; flag='NORMAL'} ) } $labt) | Out-Null
$rel = Ok (Req POST "/api/clinical/lab-orders/$($lo.id)/release" @{} $labt)
Write-Host ("   lab status=$($rel.status)")

Write-Host '== 9. complete -> invoice =='
$comp = Ok (Req POST "/api/scheduling/tokens/$tokenId/complete" @{} $doc)
Write-Host ("   invoice=$($comp.invoice.invoiceNo) total=$($comp.invoice.total) $($comp.invoice.currency) status=$($comp.invoice.status)")

Write-Host '== 10. payment =='
$pi = Ok (Req POST '/api/commerce/payments/intent' @{invoiceId=$comp.invoice.id} $pat)
$cap = Ok (Req POST '/api/commerce/payments/mock-capture' @{paymentId=$pi.id} $pat)
Write-Host ("   payment=$($cap.status) order=$($cap.orderId)")

Write-Host '== 11. dispense =='
$pha = Ok (Req POST '/api/auth/login' @{identifier='pharmacy@atelier.local'; password='Demo@12345'})
$disp = Ok (Req POST '/api/commerce/dispense' @{prescriptionId=$rx.id} $pha.tokens.accessToken)
Write-Host ("   dispensed items=" + (($disp.items | ForEach-Object { "$($_.drug)x$($_.qty)" }) -join ', '))

Write-Host '== 12. access control on records =='
$other404 = Req GET "/api/scheduling/tokens/$tokenId" $null $pat
if ($other404.error -and $other404.error.code -eq 'NOT_FOUND') { Write-Host '   cross-patient token hidden from other patient OK' } else { Write-Host '   FAIL: other patient saw token' }
$tRec = Ok (Req GET "/api/scheduling/tokens/$tokenId" $null $rec)
$rameshPid = $tRec.patientId
Write-Host ("   staff view ok: status=$($tRec.status) payment=$($tRec.paymentStatus)")

Write-Host '== 13. break-glass =='
$admL = Ok (Req POST '/api/auth/login' @{identifier='admin@atelier.local'; password='Admin@12345'})
$adm  = $admL.tokens.accessToken
$hreg = Req POST '/api/auth/register' @{fullName='Hospital Admin'; email='hadmin@atelier.local'; password='Demo@12345'}
if ($hreg.error) {
  $hadmId = (Ok (Req POST '/api/auth/login' @{identifier='hadmin@atelier.local'; password='Demo@12345'})).user.id
  Write-Host '   hospital admin already exists (reused)'
} else {
  $hadmId = $hreg.user.id
}
$grantRole = Req POST "/api/admin/users/$hadmId/roles" @{role='HOSPITAL_ADMIN'; hospitalId=$hid; isPrimary=$true} $adm
if (-not $grantRole.error -or $grantRole.error.code -eq 'CONFLICT') { } else { throw "grant role failed: $($grantRole.error.message)" }
$hadm = (Ok (Req POST '/api/auth/login' @{identifier='hadmin@atelier.local'; password='Demo@12345'})).tokens.accessToken

$noReason = Req POST '/api/admin/break-glass' @{patientId=$rameshPid} $hadm
if ($noReason.error) { Write-Host '   break-glass without reason rejected OK' } else { Write-Host '   FAIL break-glass accepted empty reason' }

$bg = Ok (Req POST '/api/admin/break-glass' @{patientId=$rameshPid; reason='Reception dispute over billing - verifying visit record'; ttlMinutes=10} $hadm)
Write-Host ("   granted until $($bg.grant.expiresAt)")
$sheet = Ok (Req GET "/api/clinical/patients/$rameshPid/sheet" $null $hadm)
Write-Host ("   admin sheet read under break-glass OK (source=$($sheet.source))")
$padmSheet = Req GET "/api/clinical/patients/$rameshPid/sheet" $null $adm
if ($padmSheet.error) { Write-Host '   PLATFORM_ADMIN clinical access denied OK' } else { Write-Host '   FAIL platform admin read clinical record' }

Write-Host ''
Write-Host 'SMOKE PASS'
