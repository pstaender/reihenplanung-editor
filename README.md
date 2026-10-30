# Reihenplanung

Unterrichtsreihen im Browser planen – nach Kalenderwochen, Unterrichtstagen oder einzelnen Stunden,
mit Ferien/Feiertagen der Bundesländer, Markdown in den Zellen und Druckansicht im Querformat.
Daten bleiben lokal im Browser (IndexedDB) und können optional mit einem eigenen Server synchronisiert werden.

## Schnellstart

```sh
./dev.sh   # startet API (http://localhost:8080) und Frontend (http://localhost:5173), beenden mit Strg+C
```

Oder nur das Frontend: `cd frontend && npm install && npm run dev`.

Alle Reihen lassen sich in der Übersicht (und auf der Sync-Seite) als JSON-Datei exportieren und wieder importieren.

## Sync-Server (optional)

```sh
cd api && composer install
bin/console user:create ich@example.org
bin/console token:create ich@example.org --name=laptop   # Token kopieren
composer serve                                           # oder public/ per Apache/nginx ausliefern
```

In der App oben rechts auf den Sync-Status klicken, Server-URL (z. B. `http://localhost:8080`) und Token eintragen.

Für den Produktivbetrieb `frontend/dist` (nach `npm run build`) statisch ausliefern und `api/public` als
Document-Root der API verwenden; `api/data` darf nicht öffentlich erreichbar sein.
