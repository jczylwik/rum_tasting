# Rum Tasting & Cigars

This is a simple, mobile-friendly tasting app for rum and cigars. It supports participant input, quick star ratings, lightweight statistics, and shared state through a small Python backend layer.

## Features

- Add and select participants
- Rum and cigar catalog with item details
- 1 to 5 star ratings
- Average score and histogram per item and overall
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

## Development Notes

- Frontend logic is in web/app.js.
- Any data model changes should stay consistent across frontend and backend.
- The server listens on PORT so it works on Azure App Service.
- For small groups and a single app instance, file-based storage with SSE is sufficient.
- A dedicated database becomes useful when you need stronger concurrency guarantees, history/audit data, or horizontal scaling across multiple app instances.

## Legacy Print Template

The project originally included a print template for a static rum tasting overview. This feature is still available and separated under legacy/print/.

Build example:

```powershell
python legacy/print/build_rum_tasting.py
```
