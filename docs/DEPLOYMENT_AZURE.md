# Azure-Deployment

## Ziel

Die App wurde so vorbereitet, dass sie auf Azure App Service als Python-Web-App laufen kann.

## Wichtige Konfiguration

- Python-Laufzeit: 3.10
- Startpunkt: python app.py
- Port: über die Umgebungsvariable PORT
- App-Service-Startdatei: startup.sh und web.config sind vorbereitet

## Deployment-Schritte

1. App Service erstellen oder verwenden
2. Python-Runtime auf 3.10 setzen
3. Startbefehl auf `bash startup.sh` setzen (alternativ direkt `python app.py`)
4. Projekt als ZIP deployen oder über Azure CLI veröffentlichen

### Azure CLI (empfohlen)

```powershell
az webapp config set --resource-group <RG> --name <APP_NAME> --startup-file "bash startup.sh"
az webapp log config --resource-group <RG> --name <APP_NAME> --application-logging filesystem --level information
az webapp restart --resource-group <RG> --name <APP_NAME>
az webapp log tail --resource-group <RG> --name <APP_NAME>
```

Health Check in App Service aktivieren:

```powershell
az webapp update --resource-group <RG> --name <APP_NAME> --set siteConfig.healthCheckPath=/healthz
```

Hinweis: `az webapp config set --generic-configurations` kann unter PowerShell/Windows JSON-Parserfehler ausloesen. `az webapp update --set ...` ist in diesem Projekt der stabile Weg.

Wenn `startup.sh` nicht verwendet werden soll:

```powershell
az webapp config set --resource-group <RG> --name <APP_NAME> --startup-file "python app.py"
```

## Häufige Probleme

- Application Error: oft ein Startproblem der Python-App oder falscher Startup-Command
- 403/Stopped: die Web-App ist nicht gestartet oder der Plan hat ein Problem
- QuotaExceeded: der verwendete App-Service-Plan ist nicht mehr ausreichend oder blockiert

## Praktische Hinweise

- Lokal zuerst mit python app.py testen, bevor der Deploy auf Azure erfolgt.
- Bei Problemen zuerst den Startbefehl und den Port-Mechanismus prüfen.
- Der Server bindet auf `0.0.0.0` und nutzt `PORT` aus der Azure-Umgebung.
- Für Verfügbarkeitsprüfungen steht `GET /healthz` zur Verfügung.
- Die App verwendet keine Datenbank; die persistente JSON-Datei ist der einfache Shared-State.

## Verifizierte Zielkonfiguration (Stand 2026-07-11)

- App Service Runtime: `PYTHON|3.10`
- Startup Command: `python app.py`
- Health Check Path: `/healthz`
- App State: `Running`
- Wenn `QuotaExceeded` auftritt, einen kostenpflichtigen Plan verwenden (z. B. B1) oder Apps auf dem Free-Plan reduzieren.

## PowerShell-Hinweise fuer stabile CLI-Ausfuehrung

- Azure-Kommandos in PowerShell als Einzeiler ausfuehren (keine Zeilenfortsetzung mit Backticks), um Terminal-Artefakte wie `^U` zu vermeiden.
- Wenn `az` nicht gefunden wird, zuerst mit `Get-Command az` oder `where.exe az` pruefen.
