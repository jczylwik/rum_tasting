# Entwicklungshinweise

## Voraussetzungen

- Python 3.10 oder neuer
- optional: virtuelle Umgebung

## Lokale Ausführung

```powershell
py -m venv venv
.\venv\Scripts\Activate.ps1
python app.py
```

Danach im Browser öffnen:

- http://127.0.0.1:8000/

## Tests

Die App kann lokal über die folgenden URL-Strukturen geprüft werden:

- http://127.0.0.1:8000/ liefert die Hauptseite
- http://127.0.0.1:8000/api/state liefert den aktuellen State als JSON

## Hinweise

- app.py ist der vorgesehene und einzige Server-Einstiegspunkt.
- Das Frontend liegt unter `web/`.
- Wenn die App im Browser lokal nicht synchronisiert, ist meist der API-Endpoint oder die JSON-Speicherung betroffen.
- Für neue Features sollte zuerst geprüft werden, ob der State-Format erweitert werden muss.
- Die alte Print-Funktion bleibt unter `legacy/print/` erhalten und kann mit `python legacy/print/build_rum_tasting.py` gebaut werden.
