param(
  [string]$ResourceGroup = 'rg-rum-tasting',
  [string]$AppName = 'rumtasting-jczyl-20260710',
  [string]$BackupFile = ''
)

$ErrorActionPreference = 'Stop'

$repoRoot = Split-Path -Parent $PSScriptRoot
$backupsDir = Join-Path $repoRoot 'backups'

if ([string]::IsNullOrWhiteSpace($BackupFile)) {
  $latest = Get-ChildItem $backupsDir -File | Sort-Object LastWriteTime -Descending | Select-Object -First 1
  if (-not $latest) {
    throw 'No backup file found in backups directory.'
  }
  $BackupFile = $latest.FullName
}

if (-not (Test-Path $BackupFile)) {
  throw "Backup file not found: $BackupFile"
}

$stageRoot = Join-Path $env:TEMP ("rum-deploy-" + (Get-Date -Format 'yyyyMMdd-HHmmss'))
New-Item -ItemType Directory -Path $stageRoot -Force | Out-Null

try {
  Copy-Item (Join-Path $repoRoot 'app.py') (Join-Path $stageRoot 'app.py') -Force
  Copy-Item (Join-Path $repoRoot 'requirements.txt') (Join-Path $stageRoot 'requirements.txt') -Force
  Copy-Item (Join-Path $repoRoot 'startup.sh') (Join-Path $stageRoot 'startup.sh') -Force
  Copy-Item (Join-Path $repoRoot 'web.config') (Join-Path $stageRoot 'web.config') -Force
  Copy-Item (Join-Path $repoRoot 'azure.yaml') (Join-Path $stageRoot 'azure.yaml') -Force
  Copy-Item (Join-Path $repoRoot 'README.md') (Join-Path $stageRoot 'README.md') -Force
  Copy-Item (Join-Path $repoRoot 'web') (Join-Path $stageRoot 'web') -Recurse -Force
  Copy-Item (Join-Path $repoRoot 'docs') (Join-Path $stageRoot 'docs') -Recurse -Force

  # Normalize backup JSON to UTF-8 without BOM for Python json loader compatibility.
  $backupObj = Get-Content $BackupFile -Raw | ConvertFrom-Json
  $normalizedJson = $backupObj | ConvertTo-Json -Depth 80
  $utf8NoBom = New-Object System.Text.UTF8Encoding($false)
  [System.IO.File]::WriteAllText((Join-Path $stageRoot 'data.json'), $normalizedJson, $utf8NoBom)

  Push-Location $stageRoot
  try {
    tar -a -c -f deploy-linux.zip app.py requirements.txt startup.sh web.config web docs README.md azure.yaml data.json
    Copy-Item -Path deploy-linux.zip -Destination deploy.zip -Force
  }
  finally {
    Pop-Location
  }

  az webapp deploy --resource-group $ResourceGroup --name $AppName --src-path (Join-Path $stageRoot 'deploy.zip') --type zip --restart true | Out-Null

  Write-Output "Deployed $AppName with backup: $BackupFile"
}
finally {
  if (Test-Path $stageRoot) {
    Remove-Item -Path $stageRoot -Recurse -Force
  }
}
