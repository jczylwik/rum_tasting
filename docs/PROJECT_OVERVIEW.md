# Project Overview

## Purpose

The app is a lightweight shared tasting platform. Multiple participants can join from one or more devices and submit ratings/comments for rum and cigar items in real time.

## Architecture

- Frontend: HTML, CSS, and JavaScript in a single responsive web app
- Backend: simple Python HTTP server with state API, SSE events, and static file serving
- State: JSON file in the project directory shared by multiple clients
- Optional: Progressive Web App support via manifest and service worker

## Data Model

The shared state includes:

- participants: list of participants
- ratings: ratings per participant and item
- activeParticipantId: currently selected participant
- activeCategory: current category (rum or cigars)
- activeItemId: currently selected item
- ratingEvents: recent rating activity for timeline views
- comments: item-bound comments with heart reactions

## Key Components

- web/app.js: manages catalog data, app state, ratings, rendering, and synchronization
- app.py: exposes shared state at /api/state and serves static files
- data.json: file-based persistence model for shared usage
- legacy/print/: separate area for the old pure rum tasting print feature

## Notable Characteristics

- The app is intentionally lightweight and does not require a complex database.
- Synchronization uses SSE notifications plus polling fallback and JSON state persistence.
- Statistics support both basic metrics and an optional advanced "nerd" panel with filter-based calculations.
- A Python entry point and straightforward App Service configuration are prepared for Azure deployment.
