# Azure-Deployment

## Goal

The app is prepared to run on Azure App Service as a Python web app.

## Key Configuration

- Python runtime: 3.10
- Entry point: python app.py
- Port: provided through the PORT environment variable
- App Service startup files: startup.sh and web.config are included

## Deployment Steps

1. Create or reuse an App Service.
2. Set the Python runtime to 3.10.
3. Set startup command to `bash startup.sh` (or directly `python app.py`).
4. Build and deploy a Linux-compatible ZIP package.

### Build ZIP on Windows for Linux App Service (critical)

Do not rely on `Compress-Archive` for the deployment artifact in this project. It can produce archive paths like `web\\index.html`, which may lead to static-file 404s on Linux App Service.

Use:

```powershell
tar -a -c -f deploy-linux.zip app.py requirements.txt startup.sh web.config web docs README.md azure.yaml
Copy-Item -Path deploy-linux.zip -Destination deploy.zip -Force
```

Then deploy `deploy.zip`.

### Azure CLI (recommended)

```powershell
az webapp config set --resource-group <RG> --name <APP_NAME> --startup-file "bash startup.sh"
az webapp log config --resource-group <RG> --name <APP_NAME> --application-logging filesystem --level information
az webapp restart --resource-group <RG> --name <APP_NAME>
az webapp log tail --resource-group <RG> --name <APP_NAME>
az webapp deploy --resource-group <RG> --name <APP_NAME> --src-path .\deploy.zip --type zip --restart true
```

Enable Health Check in App Service:

```powershell
az webapp update --resource-group <RG> --name <APP_NAME> --set siteConfig.healthCheckPath=/healthz
```

Note: `az webapp config set --generic-configurations` can trigger JSON parsing errors under PowerShell/Windows. In this project, `az webapp update --set ...` is the stable option.

If `startup.sh` is not used:

```powershell
az webapp config set --resource-group <RG> --name <APP_NAME> --startup-file "python app.py"
```

## Common Issues

- Application Error: usually a Python startup issue or an incorrect startup command
- 403/Stopped: the web app is not started or the plan has a problem
- QuotaExceeded: the App Service plan is out of capacity or blocked by plan limits
- API works but `/`, `/styles.css`, `/app.js` return 404: likely invalid ZIP structure (Windows separators in archive paths)

## Practical Notes

- Test locally with `python app.py` before deploying to Azure.
- If issues occur, first verify startup command and port handling.
- The server binds to `0.0.0.0` and reads `PORT` from the Azure environment.
- `GET /healthz` is available for availability checks.
- The app does not use a database; persistent JSON storage provides shared state.
- If clients show stale UI after deployment, bump script version in `web/index.html` and reload once.

## Azure-Hosted Backups (no local scheduler)

The app can create a backup snapshot on every state update and upload it directly to Azure Blob Storage.

### Required app settings

- `BACKUP_CONTAINER_SAS_URL_B64` (recommended): base64-encoded container SAS URL with write permission
- `BACKUP_CONTAINER_SAS_URL` (legacy fallback): plain container SAS URL
- `BACKUP_PREFIX` (optional): filename prefix, default `state`
- `BACKUP_MIN_INTERVAL_SECONDS` (optional): minimum seconds between snapshots, default `300`

PowerShell-safe way to configure base64 setting:

```powershell
$sasUrl = "https://<account>.blob.core.windows.net/<container>?<sas-token>"
$b64 = [Convert]::ToBase64String([Text.Encoding]::UTF8.GetBytes($sasUrl))
az webapp config appsettings set --resource-group <RG> --name <APP_NAME> --settings "BACKUP_CONTAINER_SAS_URL_B64=$b64" "BACKUP_PREFIX=state"
```

State updates are coalesced and written at most once per interval (`BACKUP_MIN_INTERVAL_SECONDS`) as a timestamped blob like:

- `state-YYYYMMDD-HHMMSS.json`

### Why this is recommended on Free plan

- No local machine scheduler required.
- Backups are external to the app filesystem.
- Data snapshots survive app restarts, plan moves, and redeploys.

## Deploy With Backup State (recommended for post-event archive restores)

If you want a deployment to always start with a known saved state, deploy with a backup file as `data.json`:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\deploy-with-backup.ps1
```

By default this uses the newest file from `backups/`.

Use a specific file:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\deploy-with-backup.ps1 -BackupFile .\backups\state-YYYYMMDD-HHMMSS.json
```

This path avoids manual post-deploy restore calls.

## Verified Target Configuration (as of 2026-07-11)

- App Service Runtime: `PYTHON|3.10`
- Startup Command: `python app.py`
- Health Check Path: `/healthz`
- App State: `Running`
- If `QuotaExceeded` appears, use a paid plan (for example B1) or reduce apps on the Free plan.

## PowerShell Notes for Stable CLI Execution

- Run Azure commands in PowerShell as single-line commands (no backtick line continuations) to avoid terminal artifacts like `^U`.
- If `az` is not found, check with `Get-Command az` or `where.exe az` first.
