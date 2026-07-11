# Projekt-Anweisungen

## Ziel

Die App soll ein einfaches, mobiles Rum- und Zigarren-Tasting für kleine Gruppen ermöglichen. Die Bedienung soll schnell und ohne Installation funktionieren.

## Wichtige Prinzipien

- Die Nutzeroberfläche soll mobilfreundlich und unkompliziert bleiben.
- Die gemeinsame Datenhaltung soll über die API unter /api/state laufen.
- Änderungen an den Datenfeldern müssen immer in Frontend und Backend konsistent sein.
- Der Python-Server soll über app.py gestartet werden, damit Azure/App Service ihn direkt ausführen kann.
- Erweiterte Statistiken sind optional einblendbar und müssen filterbasiert berechnet werden.
- Benutzerdefinierte Rum-Einträge müssen über den gemeinsamen State (`customRums`) synchronisiert werden.

## Wichtige Dateien

- web/app.js: Frontend-Logik, State-Handling, Rendern, API-Sync
- app.py: Backend-Server und JSON-Storage
- data.json: Persistenz für gemeinsame Bewertungen
- web/index.html, web/styles.css: UI und Layout
- web.config, startup.sh, azure.yaml: Azure-Deployment-Hinweise
- legacy/print/: alte Druckfunktion (bewusst getrennt vom Hauptprodukt)

## Hinweise für Änderungen

- Neue Teilnehmer-Felder oder neue Zustände sollten im Default-State und in der API-Unterstützung ergänzt werden.
- Wenn die API erweitert wird, sollte auch die Frontend-Logik die neuen Felder berücksichtigen.
- Bei Deployments oder Startproblemen zuerst den App-Start lokal mit python app.py prüfen.
- Bei Änderungen in `renderStats()` darauf achten, dass Gesamtwerte und gefilterte Werte nicht vermischt werden.

## Azure-Betrieb (verifiziert)

- Runtime in Azure App Service: `PYTHON|3.10`
- Startup Command: `python app.py`
- Health Check Path: `/healthz`
- Bei `QuotaExceeded` ist die App trotz korrektem Code nicht erreichbar; App-Service-Plan pruefen (F1-Limits) oder auf B1 wechseln.

## CLI-Ausführung in PowerShell

- Befehle fuer Azure moeglichst als Einzeiler ausfuehren.
- Kein `--generic-configurations` mit JSON fuer den Health-Check verwenden; stattdessen:

	`az webapp update --resource-group <RG> --name <APP_NAME> --set siteConfig.healthCheckPath=/healthz`

- Fuer ZIP-Deployments auf Linux App Service das Archiv mit `tar -a` bauen (nicht mit `Compress-Archive`), damit Pfade im ZIP Linux-kompatibel sind.
