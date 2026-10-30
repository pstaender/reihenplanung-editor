# Reihenplanung

Browser-App zur Planung von Unterrichtsreihen. Offline-first: alle Daten liegen in IndexedDB,
optional Sync auf einen minimalen PHP-Server. Sprache der UI und Kommentare: **Deutsch**.

## Struktur

- `frontend/` – React 19 + TypeScript + Vite
  - `src/types.ts` – Datenmodell (`Series`, `Row`, `Column`, `HolidayEntry`)
  - `src/store.ts` – In-Memory-Store (`useSyncExternalStore`) + Persistenz in IndexedDB (`src/db.ts`, Lib `idb`).
    Jede lokale Änderung setzt `updatedAt` und `_dirty`. Selektoren für `useStore` müssen stabile Werte liefern
    (keine neuen Arrays/Objekte – sonst Endlosschleife); abgeleitete Listen per `useMemo`.
  - `src/sync.ts` – Sync-Client (`POST /sync`), Auto-Sync (entprellt nach Änderung, Fokus, online, alle 60 s)
  - `src/schedule.ts` – berechnet die angezeigten Zeilen (`buildSchedule`), siehe „Zeitplan-Logik“
  - `src/holidays.ts` – Ferien/Feiertage von mehr-schulferien.de (pro Bundesland+Jahr in IndexedDB gecacht, 14 Tage)
  - `src/markdown.ts` – `marked` + `DOMPurify`
  - `src/icons.ts` – Keyline-Icons via `unplugin-icons` (`~icons/keyline-icons/<name>`), neue Icons hier ergänzen
  - `src/components/` – UI; `SeriesView.tsx` ist die Planungstabelle, `BackupButtons.tsx` JSON-Export/-Import
    (in der Übersicht und auf der Sync-Seite; Import überschreibt Reihen mit gleicher ID)
  - `src/styles.css` – ergänzt minimaxcss (per CDN in `index.html`), modernes CSS (Nesting, `light-dark()`, `color-mix()`, `field-sizing`)
- `api/` – PHP ≥ 8.2, ohne Abhängigkeiten (Composer nur für Autoload)
  - `public/index.php` – Einstieg; `src/Http/Api.php` – Routing
  - `bin/console` – CLI für Benutzer & Tokens (`src/Cli/Console.php`)
  - `data/` – Speicher (nicht versioniert): `users.json` (Benutzer + Token-Hashes),
    `series/<user-id>/<series-uuid>.json` (eine Datei pro Reihe), `series/<user-id>/_meta.json` (Revisionszähler)

## Zeitplan-Logik

- Einheit `week`/`day`: fortlaufende Ansicht. Inhaltszeilen (`series.rows`) werden der Reihe nach auf
  Kalenderplätze ab `startDate` verteilt. Ferien/Feiertage werden als eigene graue Zeilen dazwischen eingefügt
  (KW: nur wenn Mo–Fr komplett frei, sonst nur Hinweis). Inhalte von Ferienzeilen liegen in
  `series.holidays[<datum>]`. Ferienzeilen kann man bearbeiten, aber nicht verschieben/duplizieren/löschen.
- Einheit `lesson`: jede Zeile hat ein eigenes `date`; Ferientage werden nur grau markiert.
  Beim Verschieben bleiben die Termine an ihrer Position, nur die Inhalte wandern.
- `weekdays` (ISO 1–7): Unterrichtstage bei `day`, Datumsvorschlag für neue Stunden bei `lesson`; leer = Mo–Fr.

## Sync-Protokoll

`POST /sync` mit `Authorization: Bearer <token>` und `{ since: <revision>, series: [<geänderte Reihen>] }`.
Der Server übernimmt jede Reihe, deren `updatedAt` ≥ dem gespeicherten ist (last-write-wins), vergibt eine
monoton steigende `_rev` und antwortet mit `{ revision, series: [alle Reihen mit _rev > since] }`.
Löschen = Tombstone (`deleted: true`). Weitere Endpunkte: `GET /me`, `GET /series`, `GET /series/{id}`.

## Befehle

```sh
./dev.sh             # API (localhost:8080) + Frontend (localhost:5173) zusammen starten; API_PORT/FRONTEND_PORT überschreibbar

# Frontend
cd frontend && npm install
npm run dev          # Dev-Server
npm run typecheck
npm run build        # → frontend/dist (statisch, relative Pfade)

# API
cd api && composer install
composer serve       # php -S localhost:8080
composer lint
bin/console help
bin/console user:create lehrer@example.org
bin/console token:create lehrer@example.org --name=laptop
bin/console token:list [email]
bin/console token:delete <token-id>
bin/console user:delete lehrer@example.org
```

Umgebungsvariablen der API: `REIHENPLANUNG_DATA_DIR` (Standard `api/data`), `REIHENPLANUNG_CORS_ORIGIN` (Standard `*`).

## Konventionen

- Keine zusätzlichen UI-Frameworks; Stil nüchtern, wenig Farbe, Icons nur aus `keyline-icons`.
- Druck: Tabelle im Querformat (`body.landscape` + `@page landscape-page`); UI-Elemente mit `dont-print` ausblenden.
- Datumswerte immer als `YYYY-MM-DD`-Strings (Helfer in `src/dates.ts`), keine UTC-Konvertierung.
- PHP: `declare(strict_types=1)`, `final`/`readonly` Klassen, IDs vor Dateizugriff als UUID validieren.
