# Development Notes

## Requirements

- Python 3.10 or newer
- Optional: virtual environment

## Run Locally

```powershell
py -m venv venv
.\venv\Scripts\Activate.ps1
python app.py
```

Then open in your browser:

- http://127.0.0.1:8000/

## Local Checks

You can verify the app locally using these URLs:

- http://127.0.0.1:8000/ serves the main page
- http://127.0.0.1:8000/api/state returns the current shared state as JSON

## Notes

- app.py is the intended and only backend entry point.
- The frontend is located under `web/`.
- If local browser synchronization fails, the API endpoint or JSON persistence is usually the issue.
- For new features, first check whether the state format must be extended.
- The old print feature remains under `legacy/print/` and can be built with `python legacy/print/build_rum_tasting.py`.

## Frontend State Notes

- Real-time sync uses `GET /api/events` (SSE) with polling fallback.
- Shared state fields include `participants`, `ratings`, `ratingEvents`, and `comments`.
- Per-device UX preferences are stored in localStorage, for example:
	- participant selection marker
	- advanced statistics visibility toggle
- The advanced stats section is intentionally filter-aware (single item/category/all). When touching `renderStats()`, keep filtered and overall calculations separate.
