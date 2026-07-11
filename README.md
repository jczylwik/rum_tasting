# Rum Tasting & Cigars

This is a mobile-friendly live tasting app for rum and cigars. It supports participant onboarding, real-time shared ratings/comments across devices, and lightweight analytics with an optional advanced statistics panel.

## Features

- Add and select participants
- Rum and cigar catalog with item details
- 1 to 5 star ratings
- Live comments with heart reactions per item
- Average score and histogram per item and overall
- Filter-aware analytics (overall, all rum, all cigars, or single item)
- Optional advanced analytics panel (toggle on/off): standard deviation, variance, median, 95% CI + nerd visualization
- Shared persistence via the API at /api/state
- Live updates across multiple devices (server-sent events with polling fallback)
- Installable Progressive Web App (PWA)
- Azure App Service deployment prepared

## Project Structure

- web/ - Web frontend (HTML, CSS, JS, PWA files)
- app.py - Python HTTP server with API endpoints at /api/state and /healthz
- data.json - Persistent shared state in JSON format
- legacy/print/ - Legacy "pure rum tasting print" feature (separated from the main product)
- docs/ - Project, development, and deployment documentation
- startup.sh, web.config, azure.yaml - Azure deployment configuration

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

## Run Locally

1. Open a terminal in the project folder.
2. Create and activate a virtual environment.

   ```powershell
   py -m venv venv
   .\venv\Scripts\Activate.ps1
   ```

3. Start the app.

   ```powershell
   python app.py
   ```

4. Open in browser: http://127.0.0.1:8000/

## API

- GET /api/state returns the shared state.
- POST /api/state saves updates as JSON.
- GET /healthz returns a basic health check ("status": "ok").
- GET /api/events streams state-change events for real-time UI refresh.

The data structure includes at least:

- participants
- ratings
- activeParticipantId
- activeCategory
- activeItemId
- ratingEvents
- comments

## Development Notes

- Frontend logic is in web/app.js.
- Any data model changes should stay consistent across frontend and backend.
- The server listens on PORT so it works on Azure App Service.
- For small groups and a single app instance, file-based storage with SSE is sufficient.
- A dedicated database becomes useful when you need stronger concurrency guarantees, history/audit data, or horizontal scaling across multiple app instances.

## Azure Packaging Note (Important)

When deploying ZIPs from Windows to Linux App Service, avoid Windows-style ZIP path separators from `Compress-Archive` (`web\\...`).

Use `tar` to create the ZIP, then deploy:

```powershell
tar -a -c -f deploy-linux.zip app.py requirements.txt startup.sh web.config web docs README.md azure.yaml
Copy-Item -Path deploy-linux.zip -Destination deploy.zip -Force
az webapp deploy --resource-group <RG> --name <APP_NAME> --src-path .\deploy.zip --type zip --restart true
```

This ensures Linux-friendly `/` paths inside the archive and prevents static-file 404 issues.

## Legacy Print Template

The project originally included a print template for a static rum tasting overview. This feature is still available and separated under legacy/print/.

Build example:

```powershell
python legacy/print/build_rum_tasting.py
```
