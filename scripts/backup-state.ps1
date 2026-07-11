$ErrorActionPreference = 'Stop'

$projectRoot = Split-Path -Parent $PSScriptRoot
$backupDir = Join-Path $projectRoot 'backups'
$apiUrl = 'https://rumtasting-jczyl-20260710.azurewebsites.net/api/state'

New-Item -ItemType Directory -Path $backupDir -Force | Out-Null

$timestamp = Get-Date -Format 'yyyyMMdd-HHmmss'
$targetFile = Join-Path $backupDir ("state-$timestamp.json")

$state = Invoke-RestMethod -Uri $apiUrl -Method Get
$state | ConvertTo-Json -Depth 30 | Set-Content -Path $targetFile -Encoding UTF8

Write-Output "Backup written: $targetFile"