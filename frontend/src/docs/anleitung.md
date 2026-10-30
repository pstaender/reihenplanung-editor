# Kurzanleitung

## Reihe anlegen

Über **Neue Reihe** legst du Name, Kurs, Startdatum und Einheit fest. Die Einheit bestimmt die erste Spalte der Tabelle:

- **Kalenderwochen**: eine Zeile pro Woche, fortlaufend ab dem Startdatum
- **Tage**: eine Zeile pro Unterrichtstag, z. B. nur Dienstag und Donnerstag
- **Unterrichtsstunden**: eine Zeile pro Stunde, jede mit eigenem Datum

## Ferien und Feiertage

Wählst du ein Bundesland, erscheinen Ferienwochen bzw. freie Tage als graue Zeilen in der Tabelle (Daten von mehr-schulferien.de). Die Unterrichtseinheiten rücken automatisch dahinter. Graue Zeilen lassen sich beschriften, aber nicht verschieben, duplizieren oder löschen.

## Tabelle bearbeiten

- Zelle anklicken (oder per Tab ansteuern) und tippen. Beim Verlassen wird gespeichert, **Esc** verwirft die Änderung.
- Das Stift-Symbol öffnet die ganze Zeile, dort lassen sich auch Hintergrund- und Textfarbe setzen.
- Mit den Pfeilen verschiebst du Zeilen, daneben kannst du sie duplizieren oder löschen.
- Über **Spalten** benennst du Spalten um, fügst neue hinzu, sortierst oder löschst sie. Die erste Spalte ist fest.

In Zellen ist einfaches Markdown möglich: `**fett**`, `*kursiv*`, Listen mit `- ` am Zeilenanfang und Links `[Text](https://…)`.

## Drucken

**Drucken** erzeugt die Tabelle im Querformat, ohne Schaltflächen.

## Sichern und Synchronisieren

Alle Daten liegen nur in diesem Browser. Über **Exportieren** in der Übersicht erhältst du eine JSON-Sicherung, die du mit **Importieren** wiederherstellen kannst. Das Format ist unter *Formatspezifikation* beschrieben, damit lassen sich Planungen auch von einer KI erstellen.

Optional gleicht die Seite *Synchronisation* (Wolken-Symbol oben rechts) die Daten mit einem eigenen Server ab.
