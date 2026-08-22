$ErrorActionPreference = 'Stop'
$B = 'http://localhost:8080'
$T = Join-Path $env:TEMP 'hms-smoke'
New-Item -ItemType Directory -Force -Path $T | Out-Null

function Req {
  param([string]$Method, [string]$Url, $Body = $null, [string]$Tok = '', [int]$Timeout = 30)
  $f = Join-Path $T 'body.json'
  if ($null -ne $Body) { $Body | ConvertTo-Json -Depth 8 -Compress | Set-Content -Path $f -Encoding ASCII }
  $curlArgs = @('-s','--noproxy','*','-m',"$Timeout",'-X',$Method,"$B$Url")
  if ($null -ne $Body) { $curlArgs += @('-H','Content-Type: application/json','-d',"@$f") }
  if ($Tok) { $curlArgs += @('-H',"Authorization: Bearer $Tok") }
  $raw = & curl.exe @curlArgs
  if (-not $raw) { throw "empty response from $Url" }
  return ($raw | ConvertFrom-Json)
}
function Ok($res) { if ($res.error) { throw "$($res.error.code): $($res.error.message)" } ; return $res.data }

Write-Host '== A1. ai status =='
$st = Ok (Req GET '/api/ai/status')
Write-Host ("   llm=$($st.llm) model=$($st.model)")
Write-Host ("   memory available=$($st.memory.available) provider=$($st.memory.provider)")

Write-Host '== A2. patient grants consent to cardiologist =='
$pat = (Ok (Req POST '/api/auth/login' @{identifier='patient@atelier.local'; password='Demo@12345'})).tokens.accessToken
$hosp = (Ok (Req GET '/api/directory/hospitals')).items[0]
$docs = (Ok (Req GET "/api/directory/doctors?hospitalId=$($hosp.id)")).items
$asha = ($docs | Where-Object { $_.specializations -contains 'CARDIOLOGY' } | Select-Object -First 1)
$meP = Ok (Req GET '/api/clinical/patients/me' $null $pat)
$consent = Ok (Req POST '/api/clinical/consents' @{grantToUserId=$asha.userId; scope=@('RECORDS','LABS','PRESCRIPTIONS')} $pat)
Write-Host ("   consent granted to Dr $($asha.fullName)")

Write-Host '== A3. AI patient-sheet agent =='
$doc = (Ok (Req POST '/api/auth/login' @{identifier='asha@atelier.local'; password='Demo@12345'})).tokens.accessToken
$sw = [Diagnostics.Stopwatch]::StartNew()
$sheet = Ok (Req POST "/api/ai/patients/$($meP.id)/sheet-draft" @{} $doc 180)
$sw.Stop()
$d = $sheet.draft
Write-Host ("   draft in $([int]$sw.Elapsed.TotalSeconds)s")
Write-Host ("   summary: " + ($d.summary -join ' ').Substring(0, [Math]::Min(160, (($d.summary -join ' ').Length))))
if ($d.alerts) { Write-Host ("   alerts: " + ($d.alerts -join ' | ')) }

Write-Host '== A4. scribe draft =='
$doc = (Ok (Req POST '/api/auth/login' @{identifier='asha@atelier.local'; password='Demo@12345'})).tokens.accessToken
$envMap = @{}
Get-Content .smoke.env | ForEach-Object { $kv = $_ -split '=',2; if ($kv.Count -eq 2) { $envMap[$kv[0]] = $kv[1] } }
$cnsId = $envMap['cid']
if (-not $cnsId) { throw 'no cid in .smoke.env - run smoke.ps1 first' }
$scribe = Ok (Req POST "/api/ai/consultations/$cnsId/scribe" @{transcript='Patient reports chest tightness climbing stairs, relieved by rest, no radiation. BP 130/85, pulse 88 regular. ECG today shows nonspecific ST changes.'} $doc 180)
Write-Host ("   assessment: " + ($scribe.draft.assessment | Out-String).Trim().Substring(0, [Math]::Min(140, (($scribe.draft.assessment | Out-String).Trim().Length))))

Write-Host '== A5. copilot chat (non-streaming) =='
$sw.Restart()
$chat = Ok (Req POST '/api/ai/chat' @{message='I have mild fever since yesterday. What should I do before seeing a doctor?'} $pat 180)
$sw.Stop()
Write-Host ("   replied in $([int]$sw.Elapsed.TotalSeconds)s finish=$($chat.finishReason)")
Write-Host ("   content head: " + $chat.content.Substring(0, [Math]::Min(200, $chat.content.Length)))

Write-Host '== A6. memory add -> search -> delete =='
$mAdd = Ok (Req POST '/api/ai/memory' @{kind='PREFERENCE'; content='Prefers morning appointments at City Care Hospital and prefers SMS reminders over email'} $pat 60)
Write-Host ("   saved embedded=$($mAdd.embedded) dims=$($mAdd.dimensions)")
$mSearch = Ok (Req POST '/api/ai/memory/search' @{query='how does the patient like appointment reminders?'; k=3} $pat 60)
Write-Host ("   search mode=$($mSearch.mode) hits=$($mSearch.results.Count) top-score=$(if($mSearch.results[0].score){$mSearch.results[0].score}else{'n/a'})")
$mDel = Ok (Req DELETE '/api/ai/memory' $null $pat 30)
Write-Host ("   dpdp erasure deleted=$($mDel.deleted)")

Write-Host ''
Write-Host 'AI SMOKE PASS'
