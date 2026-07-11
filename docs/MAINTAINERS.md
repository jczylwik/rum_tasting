# Maintainer Guide

## Purpose

This document captures practical project rules for humans maintaining this repository.

## Product Scope

- Mobile-first rum and cigar tasting app for small groups.
- Shared live state for participants, ratings, comments, and custom rum entries.
- Focus on fast interaction and simple operations.

## Core Technical Rules

- Keep frontend and backend state schema in sync.
- State must flow through the API at `/api/state`.
- New shared fields must be handled in both `web/app.js` and `app.py`.
- Advanced statistics must always respect the active filter scope.
- Custom rum entries must stay integrated in navigation, filters, ratings, comments, and stats.

## Runtime and Deployment Baseline

- Azure runtime target: `PYTHON|3.10`
- Startup command: `python app.py`
- Health endpoint: `/healthz`
- For Windows-built deployment archives, use `tar -a` for Linux-compatible ZIP paths.

## Operational Notes

- Validate local startup before deploy with `python app.py`.
- If static assets 404 on Azure while API works, rebuild ZIP with `tar -a` and redeploy.
- Keep deployment artifacts out of git.
- Use the docs folder as the source of truth for development and deployment procedures.

## Reference Docs

- `docs/PROJECT_OVERVIEW.md`
- `docs/DEVELOPMENT.md`
- `docs/DEPLOYMENT_AZURE.md`
