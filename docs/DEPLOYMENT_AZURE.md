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
4. Deploy the project as ZIP or publish through Azure CLI.

### Azure CLI (recommended)

```powershell
az webapp config set --resource-group <RG> --name <APP_NAME> --startup-file "bash startup.sh"
az webapp log config --resource-group <RG> --name <APP_NAME> --application-logging filesystem --level information
az webapp restart --resource-group <RG> --name <APP_NAME>
az webapp log tail --resource-group <RG> --name <APP_NAME>
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

## Practical Notes

- Test locally with `python app.py` before deploying to Azure.
- If issues occur, first verify startup command and port handling.
- The server binds to `0.0.0.0` and reads `PORT` from the Azure environment.
- `GET /healthz` is available for availability checks.
- The app does not use a database; persistent JSON storage provides shared state.

## Verified Target Configuration (as of 2026-07-11)

- App Service Runtime: `PYTHON|3.10`
- Startup Command: `python app.py`
- Health Check Path: `/healthz`
- App State: `Running`
- If `QuotaExceeded` appears, use a paid plan (for example B1) or reduce apps on the Free plan.

## PowerShell Notes for Stable CLI Execution

- Run Azure commands in PowerShell as single-line commands (no backtick line continuations) to avoid terminal artifacts like `^U`.
- If `az` is not found, check with `Get-Command az` or `where.exe az` first.
