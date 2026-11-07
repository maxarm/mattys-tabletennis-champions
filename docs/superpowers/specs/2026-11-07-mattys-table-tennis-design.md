# Matty’s Table Tennis Championships — Design

Stand: 07.11.2026. Zur Freigabe; noch kein Implementierungsauftrag.

## Zweck und abgestimmter Umfang

Eine deutschsprachige, installierbare Browser-App begleitet zwei Menschen beim echten Tischtennis. Sie teilen sich ein Smartphone und entscheiden vor jeder Partie selbst, wer welchen Nationalspieler übernimmt. Die App organisiert die Meisterschaft, zeigt unterhaltsame Spielerprofile und speichert die real gespielten Ergebnisse. Fähigkeiten verändern weder Regeln noch Punkte und simulieren keine Spiele.

Ziele: schnelle Bedienung an der Platte, nachvollziehbare Auslosungen, charaktervolle feste Spielerporträts, verlässliches Fortsetzen und ein lokales Turnierarchiv. Smartphone zuerst, am Desktop ebenfalls nutzbar. Keine Anmeldung, Synchronisation, Cloud-Datenbank, Online-Gegner oder Verwaltung der beiden echten Personen. Keine Werbung und keine externen Laufzeitdienste.

## Betrachtete Ansätze und Entscheidung

1. Installierbare Progressive Web App (PWA): nach vollständigem ersten Laden offline nutzbar, Startbildschirm-Verknüpfung, lokale Daten. Etwas mehr Aufwand für Offline-Cache und Aktualisierungen.
2. Einfache Browser-Website: geringerer Aufwand, aber keine gezielt verlässliche Offline-Nutzung und Installation.

Der Nutzer hat die installierbare PWA gewählt. Beide Ansätze speichern nur im verwendeten Browser auf diesem Gerät. Das Löschen der Website-Daten entfernt Turniere. Export und Import sind spätere Erweiterungen.

Technischer Vorschlag des Autors: TypeScript, React und Vite; IndexedDB für Turniere, Web-App-Manifest und Service Worker für Offline-Nutzung. Diese Bibliothekswahl wurde noch nicht vom Nutzer vorgegeben. Versionswahl und konkrete Pakete bleiben der Umsetzung überlassen. In der aktuellen Umgebung fehlt Node.js; die Umsetzung muss eine geeignete Entwicklungsumgebung bereitstellen. Öffentliche Bereitstellung und Hosting sind noch nicht Teil dieses Designs; Installation und Service Worker benötigen eine sichere Auslieferung (HTTPS, lokal localhost).

## Turnierregeln

Beim Anlegen wählt man die Einstiegsrunde und 1, 2 oder 3 benötigte Satzsiege. Standard sind **1 Satzsieg** und, als Vorschlag des Autors, Viertelfinale. Während eines Turniers sind diese Einstellungen unveränderlich.

| Einstieg | Teams | Spiele inklusive Platz 3 |
| --- | ---: | ---: |
| Achtelfinale | 16 | 16 |
| Viertelfinale | 8 | 8 |
| Halbfinale | 4 | 4 |
| Finale | 2 | 1 |

Teams werden gleichverteilt ohne Wiederholung aus dem Pool gezogen. Es gibt keine Setzliste. Beim Turnierstart werden Teams, jeweils ein Spieler, Fähigkeiten und erste Paarungen erzeugt und gemeinsam dauerhaft gespeichert. Erneutes Öffnen oder Neuladen würfelt nichts neu.

Jede Runde ist ein frei ausgelostes K.-o.-Feld. Alle noch offenen Spiele der aktuellen Runde können in beliebiger Reihenfolge geöffnet werden; es gibt jeweils nur eine sichtbare Matchansicht. Nach Abschluss aller Spiele erscheint „Nächste Runde losen“. Der Button mischt die Gewinner gleichverteilt und bildet neue Paarungen; die Auslosung wird einmalig gespeichert. Doppelte Betätigung darf keine zweite Runde erzeugen.

Nach dem Halbfinale führt der Button „Finalrunde auslosen“ in eine Abschlussübersicht: Halbfinalgewinner spielen das Finale, Halbfinalverlierer um Platz 3. Diese Paarungen sind durch die Ergebnisse bestimmt; nur die Seitenanordnung kann ausgelost werden. Beide Spiele sind frei wählbar. Bei Finale-Einstieg gibt es kein Spiel um Platz 3. Der Turnierabschluss erscheint erst, wenn beide erforderlichen Abschlussmatches beendet sind.

Platzierung: Finalgewinner 1, Finalverlierer 2, Sieger des kleinen Finales 3, dessen Verlierer 4. Viertelfinalverlierer teilen Platz 5, Achtelfinalverlierer Platz 9. Keine zusätzlichen Platzierungsspiele und keine Sortierung innerhalb geteilter Plätze nach willkürlichen Kriterien.

## Nationalspieler und feste Identitäten

Der Pool umfasst genau die folgenden 23 Länder, mit jeweils drei vorab hinterlegten Spielern. Die sieben ausdrücklich genannten Namen bleiben exakt erhalten. Alle übrigen Namen in der Tabelle sind Vorschläge des Autors. Schreibweise des Landes: Uruguay.

| Land | Spieler 1 | Spieler 2 | Spieler 3 |
| --- | --- | --- | --- |
| Deutschland | Jonas Schmitt | Lukas Weber | Felix Bauer |
| Österreich | Franz Hinterberger | Lukas Gruber | Tobias Leitner |
| Nigeria | Oshimen | Chinedu Okafor | Tunde Adeyemi |
| Japan | Haruto Tanaka | Ren Sato | Yuto Nakamura |
| China | Ching Chang Chung | Wei Zhang | Jun Chen |
| Polen | Piotr Kowalski | Jakub Nowak | Tomasz Zieliński |
| Slowakei | Martin Kováč | Lukáš Horváth | Peter Varga |
| Tschechien | Jan Novák | Tomáš Svoboda | Jakub Dvořák |
| Schweden | Erik Lindberg | Johan Nyström | Viktor Andersson |
| Dänemark | Mikael Larsson | Mikkel Nielsen | Rasmus Jensen |
| Kroatien | Disch Denisovic | Luka Kovačević | Ivan Horvat |
| Uruguay | Martín Rodríguez | Diego Fernández | Nicolás Pereira |
| Spanien | Pablo García | Alejandro Martín | Diego López |
| Australien | Player without Name | Jack Wilson | Oliver Harris |
| Schweiz | Luca Meier | Simon Keller | Adrian Baumann |
| England | Oliver Smith | Harry Bennett | George Taylor |
| Frankreich | Hugo Moreau | Louis Dubois | Jules Laurent |
| Italien | Matteo Rossi | Luca Bianchi | Marco Ricci |
| Liechtenstein | Lukas Büchel | David Frommelt | Simon Gassner |
| Südkorea | Min-jun Kim | Seo-jun Park | Ji-ho Lee |
| Argentinien | Mateo González | Santiago Fernández | Tomás Romero |
| Portugal | João Silva | Tiago Pereira | Diogo Costa |
| Brasilien | Pedro Santos | Lucas Oliveira | Rafael Costa |

Jeder der 69 Spieler besitzt eine stabile ID und ein festes humorvolles Kopfporträt. Dieselbe Identität sieht in jedem Turnier gleich aus. Vorschlag des Autors: lokal hinterlegte SVG-Porträts, komponiert aus festen Gesichts-, Frisur- und Accessoire-Varianten pro Spieler; keine zur Laufzeit erzeugten Bilder. Unterschiede beruhen auf individuellen Merkmalen, ohne nationale Klischees. Die Vorschauköpfe sind Platzhalter; endgültige Porträts entstehen bei der Umsetzung. Länderflaggen werden als lokale Assets einschließlich eigener England-Flagge ausgeliefert.

## Fähigkeiten

Pro Turnierteilnehmer fünf unabhängige ganzzahlige Werte: Angriff (ANG), Verteidigung (VER), Service (SVC), Vorhand (VOR), Rückhand (RÜC). Für dasselbe Turnier bleiben sie fix, im nächsten Turnier werden sie neu ermittelt. Gesamtstärke = arithmetischer Mittelwert der fünf Werte, kaufmännisch auf eine ganze Zahl gerundet.

Konkreter Verteilungsvorschlag des Autors, passend zu den gewünschten Häufigkeiten: Zuerst ein Intervall mit den untenstehenden Wahrscheinlichkeiten auswählen, darin eine ganze Zahl gleichverteilt ziehen. Damit liegen 80 % der Werte zwischen 70 und 85; hohe Werte werden zunehmend seltener.

| Werte | Wahrscheinlichkeit |
| --- | ---: |
| 1–49 | 1 % |
| 50–69 | 10 % |
| 70–84 | 77 % |
| 85 | 3 % |
| 86–89 | 5 % |
| 90–94 | 3 % |
| 95–97 | 0,8 % |
| 98–99 | 0,18 % |
| 100 | 0,02 % |

Eindeutige Seltenheiten: 1–84 gewöhnlich, 85–89 legendär (gelb), 90–94 episch (grün), 95–100 mythisch (violett). Bezeichnungen und Farben folgen dem Nutzerwunsch. Die Seltenheit betrifft einzelne Fähigkeiten; die Gesamtstärke erhält keine zusätzliche Seltenheitsklasse. Legende und Textlabels ergänzen Farben.

## Ansichten und Bedienung

### Hauptbildschirm und Turnierstart

Titel „Matty’s Table Tennis Championships“, Tischtennismotiv, Auswahl der Einstiegsrunde und benötigten Satzsiege, Vorschau der Team- und Spielanzahl, Button „Teams auslosen & starten“. Hauptmenü mit Start und Archiv. Bei laufendem Turnier steht „Turnier fortsetzen“ im Vordergrund. Vorschlag des Autors: nur ein aktives Turnier; ein neues kann erst nach Abschluss oder bewusst bestätigtem Verwerfen begonnen werden. Ein vollständig ausgespieltes, aber noch nicht archiviertes Turnier führt beim Fortsetzen zu seiner Ergebnisübersicht.

### Rundenübersicht und Turnierbaum

Aktuelle Runde mit Fortschritt sowie anklickbaren Paarungen aus Flagge, Land und Spielername. Abgeschlossene Spiele zeigen Satzstand und Sieger. Mobile Standardansicht ist die gut lesbare Paarungsliste. Eine zusätzliche Gesamtansicht zeigt Runden und Verbindungslinien der tatsächlich gespeicherten Auslosungen; am Smartphone horizontal verschiebbar, ohne dass die normale Bedienung davon abhängt. Da jede Runde neu ausgelost wird, gibt es keine vorab feststehenden Weiterführungen: künftige Runden sind ausdrücklich „Noch nicht ausgelost“. Das Spiel um Platz 3 steht separat.

### Partie und Ergebniseingabe

Zwei kompakte Spielerkarten zeigen feste Köpfe, Flaggen, Namen, Gesamtstärke und die fünf Fähigkeiten. Die Seitenanordnung bleibt beim Spielen und Eingeben gleich. Niemand muss sich als echter Spieler registrieren oder zuordnen.

Pro Satz zwei große direkt bearbeitbare Zahlenfelder unter den beiden Spielern, mobile Zahlentastatur über inputmode=numeric. Beim Fokussieren wird der bisherige Inhalt markiert. Keine Plus-/Minus-Bedienung und keine verpflichtenden Swipe-Gesten. Leere Felder bleiben leer, statt ein Ergebnis vorzugeben. Bei einem benötigten Satzsieg wird genau eine Ergebniszeile angezeigt. Bei mehreren Satzsiegen erscheint nach einem gültigen Satz die nächste Zeile, bis eine Seite die erforderlichen Siege hat. Maximal 1, 3 oder 5 Sätze. „Spiel abschließen“ zeigt den ermittelten Satzstand und ist erst bei einem gültigen vollständigen Match aktiv.

Gültiger Satz: nichtnegative ganze Zahlen; entweder Sieger exakt 11 und Gegner 0–9 oder Sieger mindestens 12 und Vorsprung exakt 2. Beispiele: 11:9 und 14:12 gültig, 11:10 und 12:8 ungültig. Kein Unentschieden, keine künstliche Punktegrenze. Fehler werden neben der betroffenen Zeile in einfacher Sprache erklärt.

Entwurfseingaben werden automatisch gespeichert, zählen aber erst nach „Spiel abschließen“ als Ergebnis. Frühere Sätze bleiben editierbar; ändert sich dadurch der Zeitpunkt des Matchendes, werden nachfolgende, nun überzählige Sätze aus dem Entwurf entfernt und eine kurze Meldung gezeigt. Abschließen speichert Ergebnis und Fortschritt gemeinsam und kehrt zur Runde zurück. Vorschlag des Autors: abgeschlossene Spiele dürfen bis zum nächsten Auslosen wieder geöffnet und korrigiert werden; danach nur lesend. In der Abschlussrunde sind Korrekturen bis zum Archivieren möglich.

### Abschluss und Archiv

Siegerehrung mit Siegerporträt und geordneter Platzierungsliste aller gestarteten Teams. „Speichern und Beenden“ archiviert das Turnier genau einmal und führt zum Hauptbildschirm. Archivliste mit Datum, Sieger, Einstiegsrunde und Satzregel; Detailansicht mit Platzierungen, allen Paarungen, Satzergebnissen und damaligen Fähigkeiten/Porträts. Archivierte Turniere sind nur lesbar. Löschen und Export sind nicht Teil der ersten Version.

## Visuelle Gestaltung und Zugänglichkeit

Abgestimmte Richtung: Tischgrün, warme Papierflächen, orangefarbene Aktionsbuttons, feste lustige Charakterköpfe. Inspiration: Vereinsheim und Sammelkarten. Große Typografie, deutliche Abstände und klare Spielzustände. Keine Animation, die Eingaben verzögert. Interaktive Elemente mindestens etwa 44 × 44 CSS-Pixel, deutlicher Tastaturfokus, zugängliche Beschriftungen und ausreichende Kontraste. Seltenheitsgelb wird auf hellem Grund ausreichend dunkel dargestellt. Kein ausschließlich farblicher Informationsgehalt. Auf schmalen Smartphones kein horizontales Scrollen außerhalb der expliziten Baumansicht.

Abgestimmte Browserstudie: `.superpowers/brainstorm/preview/entwurf-v2.html`. Sie dient als visuelle Referenz, nicht als Produktcode. Satzsiege 1 und direkte Zahlenfelder sind bestätigt. Die Studie enthält beispielhafte, nicht bindende Matchdaten.

## Datenmodell und lokale Zuverlässigkeit

Statischer versionierter Katalog: Länder-ID, Anzeigename, Flaggenasset; Spieler-ID, Land, Name, Porträtdefinition. Turnier: ID, Schema-Version, Start-/Abschlussdatum, Status, Einstellungen, Teilnehmer-Snapshots, Runden, Matches, Auslosungszeitpunkte, Entwürfe, Platzierungen. Match: ID, Rundentyp, zwei Teilnehmer-IDs, Status, Satzpunkte, abgeleiteter Sieger und Satzstand. Snapshots enthalten Namen, Land, Porträtdefinition und Fähigkeiten, damit Archivdaten trotz Katalogänderungen stabil bleiben.

Fachlogik getrennt von Darstellung und Speicherung: Erzeugung, Auslosung, Satzvalidierung, Matchwertung, Übergänge und Platzierungen sind reine, testbare Funktionen; Zufallsquelle ist für Tests austauschbar. IndexedDB-Transaktionen sichern zusammengehörige Änderungen. UI meldet Speicherfehler sichtbar und behauptet erst nach erfolgreichem Speichern, eine Aktion sei abgeschlossen. Automatisches Speichern wird kurz verzögert, bei Fokusverlust zusätzlich angestoßen; abrupt vor dem abgeschlossenen Schreibvorgang beendete Eingaben können verloren gehen. Zustand wird vor Übergängen erneut geprüft, um Doppeltippen abzufangen. Bei beschädigten oder unbekannten Daten keine stille Löschung; verständliche Fehlermeldung. Schema-Migrationen müssen vorhandene Archive erhalten.

Vorschlag des Autors: nur ein bearbeitender Tab zur selben Zeit, zusätzliche Tabs öffnen vorhandene Daten lesend mit Hinweis. Die konkrete Sperrtechnik und Browser-Fallbacks bleiben der Umsetzung überlassen.

## Installation, Offline-Betrieb und Updates

App-Shell, Skripte, Schriften, Länderflaggen und Porträtbestandteile liegen lokal und werden für Offline-Betrieb gecacht. Nach erfolgreichem initialem Download ist der gesamte Turnierablauf einschließlich Archiv ohne Netz verfügbar. Erst bei vollständigem Cache signalisiert die App Offline-Bereitschaft. Manifest enthält Namen, Icons, Start-URL, Theme-Farbe und Standalone-Anzeige. Installationshilfe wird passend zur Browserfähigkeit angeboten; die normale Browsernutzung bleibt vollständig möglich.

Updates werden angeboten, ohne während eines Matches automatisch neu zu laden. Daten bleiben erhalten, neue Versionen müssen das gespeicherte Schema verstehen. Ein fehlgeschlagenes Update ersetzt nicht die funktionierende Offline-Version. Die Entwicklungsumsetzung muss Installation und Service Worker auf einer echten HTTPS-Testbereitstellung oder entsprechend geeigneten lokalen Umgebung prüfen. Hostinganbieter und Veröffentlichung werden später festgelegt.

## Abnahme und Prüfung

- Alle vier Einstiegsrunden ergeben korrekte Team-, Match- und Platzierungszahlen; keine doppelten Teams und keine zweite Auslosung durch Doppeltippen.
- Das Turnier lässt sich vom Start bis ins Archiv einschließlich kleinem Finale durchführen; Finale-Einstieg funktioniert ohne Platz-3-Spiel.
- Satzregeln inklusive Verlängerung, 1/2/3 Satzsiegen, ungültiger Eingaben und Korrekturen sind fachlich getestet.
- Fähigkeiten liegen im vorgesehenen Bereich, verwenden korrekte Seltenheitsgrenzen und gerundete Gesamtwerte; die definierte Verteilung wird anhand kontrollierter Zufallseingaben geprüft, ohne zufällig flackernde Tests.
- Neuladen erhält Spieler, Werte, Auslosungen, abgeschlossene Ergebnisse und gespeicherte Entwürfe. Archivierung erzeugt keine Duplikate.
- Nach erstmaligem vollständigem Laden funktionieren Neustart, neuer Turnierstart, Weiterkommen und Archiv offline.
- Manuelle Smartphone-Prüfung für Zahlentastatur, Fokus, Lesbarkeit, Touch-Flächen, Installation und schmale Ansichten; Desktop-Bedienung bleibt möglich.
- Speicherfehler, Zweittab und Update-Hinweis führen nicht zu stillen Datenverlusten.

## Offene Entscheidungen und Zuständigkeit

Keine zusätzliche Produktfrage blockiert dieses Design. Die oben als Autorenvorschlag markierten Details stehen bei der Designfreigabe zur Prüfung: technische Basis, Viertelfinale als Startstandard, Namensliste, konkrete Werteverteilung, ein aktives Turnier, Korrekturgrenzen und Zweittab-Verhalten. Die Umsetzung entscheidet Bibliotheksversionen, interne Dateistruktur, Porträtkomposition, Cache-/Sperrtechnik und Testwerkzeuge. Vor Umsetzung folgt nach Freigabe ein separater Implementierungsplan.
