# Copilot Instructions

This file contains AI-assistant-specific guidance for this repository.

## Priorities

- Preserve mobile-first UX and existing interaction patterns.
- Prefer minimal, focused edits.
- Keep frontend/backend state model changes synchronized.
- Do not introduce breaking API shape changes without updating both layers.

## Project-Specific Rules

- Shared state endpoint is `/api/state`.
- Server entrypoint is `app.py`.
- Advanced stats are filter-scoped by design.
- User-added rum entries are stored in `customRums` and must remain end-to-end integrated.

## Deployment Notes

- Azure target runs Linux App Service.
- Build deployment ZIPs on Windows with `tar -a` to avoid path separator issues.
- Treat `deploy.zip` and `deploy-linux.zip` as local artifacts.
