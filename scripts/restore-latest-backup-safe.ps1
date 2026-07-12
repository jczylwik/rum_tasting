$ErrorActionPreference = 'Stop'

$url = 'https://rumtasting-jczyl-20260710.azurewebsites.net/api/state'
$latest = Get-ChildItem 'D:\CodingProjects\rum_tasting\backups' -File | Sort-Object LastWriteTime -Descending | Select-Object -First 1
if (-not $latest) {
  throw 'No backup file found.'
}

$obj = Get-Content $latest.FullName -Raw | ConvertFrom-Json

function Post-StatePart($payload) {
  $bodyJson = $payload | ConvertTo-Json -Depth 80
  $bodyBytes = [System.Text.Encoding]::UTF8.GetBytes($bodyJson)
  Invoke-RestMethod -Uri $url -Method Post -ContentType 'application/json; charset=utf-8' -Body $bodyBytes | Out-Null
}

# Reset to clean baseline first.
Post-StatePart @{
  participants = @()
  ratings = @{}
  activeParticipantId = $null
  activeCategory = 'rum'
  activeItemId = $null
  ratingEvents = @()
  comments = @()
  customRums = @()
}

$goodParticipants = @()
foreach ($p in @($obj.participants)) {
  $candidate = @($goodParticipants + $p)
  try {
    Post-StatePart @{ participants = $candidate }
    $goodParticipants = $candidate
    Write-Output "P OK: $($p.id)"
  }
  catch {
    Write-Output "P FAIL: $($p.id)"
  }
}

$goodIds = @($goodParticipants | ForEach-Object { $_.id })

# Ratings only for accepted participants.
$ratings = @{}
foreach ($participantId in $goodIds) {
  if ($obj.ratings.PSObject.Properties.Name -contains $participantId) {
    $ratings[$participantId] = $obj.ratings.$participantId
  }
}
try {
  Post-StatePart @{ ratings = $ratings }
  Write-Output 'RATINGS OK'
}
catch {
  Write-Output 'RATINGS FAIL'
}

$goodEvents = @()
foreach ($ev in @($obj.ratingEvents)) {
  if ($goodIds -notcontains $ev.participantId) {
    continue
  }
  $candidate = @($goodEvents + $ev)
  try {
    Post-StatePart @{ ratingEvents = $candidate }
    $goodEvents = $candidate
  }
  catch {
    Write-Output "EVENT FAIL: $($ev.id)"
  }
}

$goodComments = @()
foreach ($c in @($obj.comments)) {
  if ($goodIds -notcontains $c.participantId) {
    continue
  }
  $candidate = @($goodComments + $c)
  try {
    Post-StatePart @{ comments = $candidate }
    $goodComments = $candidate
  }
  catch {
    Write-Output "COMMENT FAIL: $($c.id)"
  }
}

# Custom rums tend to work as-is.
try {
  Post-StatePart @{ customRums = @($obj.customRums) }
  Write-Output 'CUSTOM RUMS OK'
}
catch {
  Write-Output 'CUSTOM RUMS FAIL'
}

# Restore active pointers if valid.
$activeParticipantId = $obj.activeParticipantId
if ($activeParticipantId -and ($goodIds -notcontains $activeParticipantId)) {
  $activeParticipantId = $null
}
Post-StatePart @{
  activeParticipantId = $activeParticipantId
  activeCategory = 'rum'
  activeItemId = $obj.activeItemId
}

$state = Invoke-RestMethod -Uri $url -Method Get
[PSCustomObject]@{
  backupFile = $latest.FullName
  participants = ($state.participants | Measure-Object).Count
  ratingsParticipants = ($state.ratings.PSObject.Properties | Measure-Object).Count
  ratingEvents = ($state.ratingEvents | Measure-Object).Count
  comments = ($state.comments | Measure-Object).Count
  customRums = ($state.customRums | Measure-Object).Count
} | Format-List
