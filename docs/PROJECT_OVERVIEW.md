# Project Overview

## Purpose

The app was built as a lightweight shared tasting platform. Multiple participants can enter their names on one or more devices and submit ratings for different rum and cigar items.

## Architecture

- Frontend: HTML, CSS, and JavaScript in a single responsive web app
- Backend: simple Python HTTP server with GET and POST endpoints
- State: JSON file in the project directory shared by multiple clients
- Optional: Progressive Web App support via manifest and service worker

## Data Model

The shared state includes:

- participants: list of participants
- ratings: ratings per participant and item
- activeParticipantId: currently selected participant
- activeCategory: current category (rum or cigars)
- activeItemId: currently selected item

## Key Components

- web/app.js: manages catalog data, app state, ratings, rendering, and synchronization
- app.py: exposes shared state at /api/state and serves static files
- data.json: file-based persistence model for shared usage
- legacy/print/: separate area for the old pure rum tasting print feature

## Notable Characteristics

- The app is intentionally lightweight and does not require a complex database.
- Synchronization is intentionally simple and uses JSON requests instead of a full database backend.
- A Python entry point and straightforward App Service configuration are prepared for Azure deployment.
