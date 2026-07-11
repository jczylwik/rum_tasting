# Projektüberblick

## Zweck

Die App wurde als einfache gemeinsame Tasting-Plattform entwickelt. Mehrere Teilnehmer können an einem Gerät oder mehreren Geräten ihre Namen eintragen und Bewertungen für verschiedene Rum- und Zigarren-Objekte abgeben.

## Architektur

- Frontend: HTML, CSS und JavaScript in einer einzelnen, responsiven Web-App
- Backend: einfacher Python-HTTP-Server mit GET/POST-Endpunkten
- State: JSON-Datei im Projektordner, die von mehreren Clients geteilt wird
- Optional: Progressive Web App mit Manifest und Service Worker

## Datenmodell

Der gemeinsame Zustand enthält:

- participants: Liste der Teilnehmer
- ratings: Bewertungen je Teilnehmer und Objekt
- activeParticipantId: aktuell ausgewählter Teilnehmer
- activeCategory: aktuelle Kategorie (Rum oder Zigarren)
- activeItemId: aktuell ausgewähltes Objekt

## Wichtige Komponenten

- web/app.js: verwaltet Katalog, State, Ratings, Rendern und Synchronisation
- app.py: stellt den State über /api/state bereit und serviert statische Dateien
- data.json: Dateibasiertes Persistenzmodell für die gemeinsame Nutzung
- legacy/print/: separater Bereich fuer die alte reine Rum-Tasting-Print-Funktion

## Besonderheiten

- Die App ist bewusst leichtgewichtig gehalten und benötigt keine komplexe Datenbank.
- Die Synchronisation ist simpel und basiert auf JSON-Requests statt auf einer echten Backend-Datenbank.
- Für Azure wurde ein Python-Entry-Point und eine einfache App-Service-Konfiguration vorbereitet.
