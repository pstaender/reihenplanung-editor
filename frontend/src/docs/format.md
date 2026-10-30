# Importformat für Unterrichtsreihen

Eine Importdatei ist eine JSON-Datei mit einer oder mehreren Unterrichtsreihen. Sie wird in der Übersicht über **Importieren** geladen. Der **Export** der App erzeugt dasselbe Format, deshalb kann jede exportierte Datei wieder importiert werden.

Die Datei lässt sich von Hand, mit einem Skript oder mit einer KI erstellen. Für eine KI gilt: Die Antwort muss **ausschließlich gültiges JSON** sein, also ohne Erklärtext, ohne Kommentare und ohne Markdown-Codeblock drumherum.

## Aufbau der Datei

```json
{
  "app": "pstaender/reihenplanung",
  "version": 1,
  "series": [ { "…": "eine Reihe" }, { "…": "noch eine Reihe" } ]
}
```

| Feld | Typ | Pflicht | Bedeutung |
| --- | --- | --- | --- |
| `app` | Text | ja | Immer `"pstaender/reihenplanung"`. Kennzeichnet die Datei als Reihenplanung. |
| `version` | Zahl | ja | Version des Formats, derzeit immer `1` |
| `series` | Liste | ja | Die Unterrichtsreihen, siehe unten |

## Eine Reihe

| Feld | Typ | Pflicht | Bedeutung |
| --- | --- | --- | --- |
| `name` | Text | ja | Name der Reihe, z. B. `"Bruchrechnung"` |
| `course` | Text | nein | Kurs bzw. Klasse, z. B. `"6b Mathematik"` |
| `startDate` | Datum `JJJJ-MM-TT` | ja | Erster Unterrichtstag. Bei `unit: "week"` zählt die Kalenderwoche dieses Datums. |
| `unit` | `"week"`, `"day"` oder `"lesson"` | ja | Wonach die Reihe gegliedert ist: Kalenderwochen, Unterrichtstage oder einzelne Unterrichtsstunden |
| `weekdays` | Liste von Zahlen | nein | Wochentage mit Unterricht: `1` = Montag, `2` = Dienstag … `6` = Samstag. Leer oder weggelassen bedeutet Montag bis Freitag. |
| `state` | Text | nein | Bundesland, dessen Ferien und Feiertage angezeigt werden (Kürzel siehe unten). `""` oder weggelassen bedeutet: keine Ferienanzeige. |
| `columns` | Liste | nein | Die Inhaltsspalten, jeder Name nur einmal. Eine Spalte ist entweder nur ihr Name (`"Thema"`) oder ein Objekt, siehe „Spalten ausblenden“. Weggelassen bedeutet: `["Thema", "Lernziele", "Kompetenzerweiterungen", "Notizen"]`. |
| `rows` | Liste | ja | Die Unterrichtseinheiten in zeitlicher Reihenfolge, siehe unten |
| `id` | UUID | nein | Nur nötig, um eine vorhandene Reihe zu überschreiben. Ohne `id` wird eine neue Reihe angelegt. |
| `holidays` | Objekt | nein | Notizen in grauen Ferienzeilen. Schlüssel ist das Datum (bei `"week"` der Montag der Woche), Wert ein Objekt mit `label` und `cells` wie bei einer Zeile. Wird beim Export geschrieben und für neue Planungen nicht gebraucht. |

Die erste Spalte der Tabelle (KW, Tag oder Stunde) erzeugt die App selbst. Sie gehört nicht in `columns`.

## Spalten ausblenden

Soll eine Spalte nicht in der Tabelle oder nicht im Ausdruck erscheinen, wird sie als Objekt statt als Name angegeben:

```json
{ "columns": ["Thema", "Lernziele", { "title": "Notizen", "hiddenInPrint": true }] }
```

| Feld | Typ | Pflicht | Bedeutung |
| --- | --- | --- | --- |
| `title` | Text | ja | Name der Spalte |
| `hidden` | `true` / `false` | nein | `true`: Spalte wird in der Tabelle ausgeblendet und nicht gedruckt. Die Inhalte bleiben erhalten. |
| `hiddenInPrint` | `true` / `false` | nein | `true`: Spalte wird angezeigt, aber nicht gedruckt |

Auch für ausgeblendete Spalten werden die Inhalte in `cells` über den Namen (`title`) angegeben.

## Eine Zeile (Unterrichtseinheit)

| Feld | Typ | Pflicht | Bedeutung |
| --- | --- | --- | --- |
| `cells` | Objekt | ja | Inhalte der Zeile. Schlüssel ist der Spaltenname aus `columns`, Wert ist Text mit einfachem Markdown. Leere Spalten können weggelassen werden. |
| `label` | Text | nein | Kurze Zusatzzeile unter KW, Tag oder Stunde, z. B. `"Doppelstunde"` oder `"Klassenarbeit"` |
| `date` | Datum `JJJJ-MM-TT` | nur bei `"lesson"` | Datum der Stunde |
| `bg` | Farbe `#RRGGBB` | nein | Hintergrundfarbe der Zeile, am besten ein heller Ton wie `#fbeeee` |
| `fg` | Farbe `#RRGGBB` | nein | Textfarbe der Zeile |

## Wie Zeilen auf den Kalender verteilt werden

- **`"week"`**: Die erste Zeile gehört zur Woche von `startDate`, jede weitere Zeile zur jeweils nächsten Unterrichtswoche. Eine Zeile entspricht also einer Woche.
- **`"day"`**: Jede Zeile ist ein Unterrichtstag. Die Tage ergeben sich aus `startDate` und `weekdays`. Mit `weekdays: [2, 4]` ist die erste Zeile der erste Dienstag oder Donnerstag ab `startDate`, die zweite der nächste usw.
- **`"lesson"`**: Jede Zeile ist eine Unterrichtsstunde mit eigenem `date`. Die Stunden werden automatisch durchnummeriert.

Bei `"week"` und `"day"` fügt die App Ferienwochen und freie Tage des gewählten Bundeslandes **selbst** als graue Zeilen ein und schiebt die folgenden Einheiten dahinter. Für Ferien also **keine** eigenen Zeilen anlegen. Bei `"lesson"` sollten die Daten keine Ferientage sein.

## Markdown in Zellen

Erlaubt ist einfaches Markdown. Ein Zeilenumbruch im Text wird als `\n` geschrieben.

| Schreibweise | Ergebnis |
| --- | --- |
| `**fett**` | **fett** |
| `*kursiv*` | *kursiv* |
| `- Punkt` (am Zeilenanfang) | Aufzählung |
| `1. Schritt` (am Zeilenanfang) | nummerierte Liste |
| `[Text](https://example.org)` | Link |

## Bundesländer

| Kürzel für `state` | Bundesland |
| --- | --- |
| `baden-wuerttemberg` | Baden-Württemberg |
| `bayern` | Bayern |
| `berlin` | Berlin |
| `brandenburg` | Brandenburg |
| `bremen` | Bremen |
| `hamburg` | Hamburg |
| `hessen` | Hessen |
| `mecklenburg-vorpommern` | Mecklenburg-Vorpommern |
| `niedersachsen` | Niedersachsen |
| `nordrhein-westfalen` | Nordrhein-Westfalen |
| `rheinland-pfalz` | Rheinland-Pfalz |
| `saarland` | Saarland |
| `sachsen` | Sachsen |
| `sachsen-anhalt` | Sachsen-Anhalt |
| `schleswig-holstein` | Schleswig-Holstein |
| `thueringen` | Thüringen |

## Checkliste

1. Die Datei ist gültiges JSON: doppelte Anführungszeichen, keine Kommentare, kein Komma nach dem letzten Element.
2. Ganz oben stehen `"app": "pstaender/reihenplanung"` und `"version": 1`.
3. Jede Reihe hat `name`, `startDate`, `unit` und `rows`.
4. Alle Daten haben das Format `JJJJ-MM-TT`, z. B. `2026-09-28`.
5. Die Schlüssel in `cells` entsprechen genau den Spaltennamen aus `columns`.
6. Die Zeilen stehen in zeitlicher Reihenfolge, Ferien bekommen keine eigenen Zeilen.

## Beispiel

Eine Reihe über drei Kalenderwochen mit Ferien aus Nordrhein-Westfalen:

```json
{
  "app": "pstaender/reihenplanung",
  "version": 1,
  "series": [
    {
      "name": "Bruchrechnung",
      "course": "6b Mathematik",
      "startDate": "2026-09-28",
      "unit": "week",
      "state": "nordrhein-westfalen",
      "columns": ["Thema", "Lernziele", "Kompetenzerweiterungen", "Notizen"],
      "rows": [
        {
          "label": "Einstieg",
          "cells": {
            "Thema": "**Was ist ein Bruch?**\n- Pizza-Modell\n- Teil vom Ganzen",
            "Lernziele": "SuS können Brüche als Anteile *darstellen*",
            "Kompetenzerweiterungen": "Darstellen, Kommunizieren",
            "Notizen": "Papierkreise mitbringen"
          }
        },
        {
          "cells": {
            "Thema": "Brüche erweitern und kürzen",
            "Lernziele": "SuS erweitern und kürzen Brüche sicher",
            "Kompetenzerweiterungen": "Operieren"
          }
        },
        {
          "label": "Klassenarbeit",
          "bg": "#fbeeee",
          "cells": {
            "Thema": "**Klassenarbeit Nr. 1**",
            "Notizen": "Rückgabe in der Folgewoche"
          }
        }
      ]
    }
  ]
}
```

Mit `"unit": "lesson"` sähe eine Zeile so aus:

```json
{ "date": "2026-09-29", "label": "Doppelstunde", "cells": { "Thema": "Einführung" } }
```
