# Rum Tasting & Zigarren

Dies ist eine mobile, einfache Tasting-App für Rum und Zigarren. Sie unterstützt Teilnehmer-Eingabe, schnelle Bewertungen mit Sternen, einfache Statistiken und eine gemeinsame Datenhaltung über eine kleine Python-Backend-Schicht.

## Funktionen

- Teilnehmer hinzufügen und auswählen
- Rum- und Zigarren-Katalog mit Infos pro Objekt
- 1–5-Sterne-Bewertungen
- Durchschnitt und Histogramm pro Objekt sowie gesamt
- Gemeinsame Speicherung über die API unter /api/state
- Installierbare Progressive Web App (PWA)
- Azure-App-Service-Deployment vorbereitet

## Projektstruktur

- web/ — Frontend der Web-App (HTML, CSS, JS, PWA-Dateien)
- app.py — Python-HTTP-Server mit API unter /api/state und /healthz
- data.json — persistenter Shared-State im JSON-Format
- legacy/print/ — alte "reines Rum-Tasting Print"-Funktion (getrennt vom Hauptprodukt)
- docs/ — Projekt-, Entwicklungs- und Deployment-Dokumentation
- startup.sh, web.config, azure.yaml — Azure-Deployment-Konfiguration

```text
rum_tasting/
├─ app.py
├─ data.json
├─ requirements.txt
├─ startup.sh
├─ web/
│  ├─ index.html
│  ├─ styles.css
│  ├─ app.js
│  ├─ manifest.webmanifest
│  └─ sw.js
├─ legacy/
│  └─ print/
│     ├─ build_rum_tasting.py
│     ├─ content.md
│     ├─ rum_tasting_template.html
│     ├─ rum_tasting.css
│     ├─ rum_tasting_print.html
│     └─ rum_tasting_print1.html
└─ docs/
   ├─ PROJECT_OVERVIEW.md
   ├─ DEVELOPMENT.md
   └─ DEPLOYMENT_AZURE.md
```

## Lokal starten

1. Terminal im Projektordner öffnen
2. Virtuelle Umgebung anlegen und aktivieren

   ```powershell
   py -m venv venv
   .\venv\Scripts\Activate.ps1
   ```

3. App starten

   ```powershell
   python app.py
   ```

4. Browser öffnen: http://127.0.0.1:8000/

## API

- GET /api/state liefert den gemeinsamen Zustand
- POST /api/state speichert Änderungen als JSON
- GET /healthz liefert einen einfachen Health-Check ("status": "ok")

Die Datenstruktur enthält mindestens:

- participants
- ratings
- activeParticipantId
- activeCategory
- activeItemId

## Hinweise zur Entwicklung

- Die Frontend-Logik sitzt in web/app.js.
- Änderungen am Datenmodell sollten immer konsistent in Frontend und Backend gepflegt werden.
- Der Server lauscht auf PORT, damit er auch auf Azure/App Service funktioniert.

## Legacy-Drucktemplate

Das Projekt enthielt ursprünglich ein Druck-Template für eine statische Rum-Tasting-Übersicht. Diese Funktion bleibt erhalten, liegt aber getrennt unter `legacy/print/`.

Build-Beispiel:

```powershell
python legacy/print/build_rum_tasting.py
```
