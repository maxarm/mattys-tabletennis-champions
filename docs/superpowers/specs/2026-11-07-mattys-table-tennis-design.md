# Matty’s Table Tennis Championships — Design

Stand: 07.11.2026. Design vom Nutzer freigegeben; Umsetzung folgt mit separatem Implementierungsplan.

## Zweck und abgestimmter Umfang

Eine deutschsprachige installierbare Progressive Web App für das heimische LAN über HTTPS begleitet zwei Menschen beim echten Tischtennis. Sie teilen sich ein Smartphone und entscheiden vor jeder Partie selbst, wer welchen Nationalspieler übernimmt. Die App organisiert die Meisterschaft, zeigt unterhaltsame Spielerprofile und speichert die real gespielten Ergebnisse. Fähigkeiten verändern weder Regeln noch Punkte und simulieren keine Spiele.

Ziele: schnelle Bedienung an der Platte, nachvollziehbare Auslosungen, charaktervolle feste Spielerporträts, verlässliches Fortsetzen und ein lokales Turnierarchiv. Smartphone zuerst, am Desktop ebenfalls nutzbar. Keine Anmeldung, Synchronisation, Cloud-Datenbank, Online-Gegner oder Verwaltung der beiden echten Personen. Keine Werbung und keine externen Laufzeitdienste.

## Betrachtete Ansätze und Entscheidung

1. Installierbare Progressive Web App (PWA): nach vollständigem ersten Laden offline nutzbar, Startbildschirm-Verknüpfung, lokale Daten. Etwas mehr Aufwand für Offline-Cache und Aktualisierungen.
2. Einfache Browser-Website: geringerer Aufwand, aber keine gezielt verlässliche Offline-Nutzung und Installation.

Der Nutzer hat eine installierbare PWA mit Offline-Nutzung gewählt. Sie läuft ausschließlich zuhause im LAN über HTTPS, ohne öffentliche Veröffentlichung. Beide Ansätze speichern nur im verwendeten Browser auf diesem Gerät. Das Löschen der Website-Daten entfernt Turniere. Export und Import sind spätere Erweiterungen.

Technischer Vorschlag des Autors: TypeScript, React und Vite; IndexedDB für Turniere, Web-App-Manifest und Service Worker für Offline-Nutzung. Diese Bibliothekswahl wurde noch nicht vom Nutzer vorgegeben. Versionswahl und konkrete Pakete bleiben der Umsetzung überlassen. Node.js installiert der Nutzer selbst; keine eigenständige Installation durch den Agenten. Die App wird als statischer Build im heimischen LAN über HTTPS ausgeliefert, ohne Hostinganbieter oder Veröffentlichung. Der Server muss auf einer LAN-erreichbaren Schnittstelle lauschen. Service Worker werden ausschließlich in unterstützten sicheren Kontexten aktiviert, niemals als Voraussetzung für die normale Browsernutzung.

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

Der Pool umfasst genau die folgenden 23 Länder, mit jeweils drei vorab hinterlegten Spielern. Die sieben ausdrücklich genannten Namen bleiben exakt erhalten. Alle übrigen Namen in der Tabelle sind Vorschläge des Autors. Jeweils der dritte Name ist bewusst ein landessprachlich angelehnter Spaßname mit Tischtennis- oder Sportbezug, teils mit Spitznamen oder Wortspielen statt Anspruch auf einen üblichen bürgerlichen Namen. Alle drei Spieler werden gleich wahrscheinlich ausgewählt. Die vorgegebenen Namen bleiben unverändert an ihrer bisherigen Stelle. Schreibweise des Landes: Uruguay.

| Land | Spieler 1 | Spieler 2 | Spieler 3 |
| --- | --- | --- | --- |
| Deutschland | Jonas Schmitt | Lukas Weber | Benno Netzroller |
| Österreich | Franz Hinterberger | Lukas Gruber | Sepp Schmetterer |
| Nigeria | Oshimen | Chinedu Okafor | Tunde Topspin Adeyemi |
| Japan | Haruto Tanaka | Ren Sato | Takumi Pingponda |
| China | Ching Chang Chung | Wei Zhang | Hao Qiu |
| Polen | Piotr Kowalski | Jakub Nowak | Piotr Paletkowski |
| Slowakei | Martin Kováč | Lukáš Horváth | Marek Smečík |
| Tschechien | Jan Novák | Tomáš Svoboda | Petr Pálka |
| Schweden | Erik Lindberg | Johan Nyström | Bosse Kantboll |
| Dänemark | Mikael Larsson | Mikkel Nielsen | Bo Bordtennis |
| Kroatien | Disch Denisovic | Luka Kovačević | Goran Mrežić |
| Uruguay | Martín Rodríguez | Diego Fernández | Pablo Paleta |
| Spanien | Pablo García | Alejandro Martín | Paco Pelotazo |
| Australien | Player without Name | Jack Wilson | Bruce Backspin |
| Schweiz | Luca Meier | Simon Keller | Beat Netzli |
| England | Oliver Smith | Harry Bennett | Harry Edgesworth |
| Frankreich | Hugo Moreau | Louis Dubois | Jean-Philippe Filet |
| Italien | Matteo Rossi | Luca Bianchi | Gigi Racchetta |
| Liechtenstein | Lukas Büchel | David Frommelt | Fürst Flip von Vaduz |
| Südkorea | Min-jun Kim | Seo-jun Park | Kim Ping-pong |
| Argentinien | Mateo González | Santiago Fernández | Diego Paletazo |
| Portugal | João Silva | Tiago Pereira | João Raquetinha |
| Brasilien | Pedro Santos | Lucas Oliveira | Zé Saque |

Jeder der 69 Spieler besitzt eine stabile ID und ein festes humorvolles Kopfporträt. Dieselbe Identität sieht in jedem Turnier gleich aus. Vorschlag des Autors: lokal hinterlegte SVG-Porträts, komponiert aus festen Gesichts-, Frisur- und Accessoire-Varianten pro Spieler; keine zur Laufzeit erzeugten Bilder. Unterschiede beruhen auf individuellen Merkmalen, ohne nationale Klischees. Die Vorschauköpfe sind Platzhalter; endgültige Porträts entstehen bei der Umsetzung. Länderflaggen werden als lokale Assets einschließlich eigener England-Flagge ausgeliefert.

## Fähigkeiten

Pro Turnierteilnehmer fünf unabhängige ganzzahlige Werte: Angriff (ANG), Verteidigung (VER), Service (SVC), Vorhand (VOR), Rückhand (RÜC). Für dasselbe Turnier bleiben sie fix, im nächsten Turnier werden sie neu ermittelt. Gesamtstärke = arithmetischer Mittelwert der fünf Werte, kaufmännisch auf eine ganze Zahl gerundet.

Überarbeiteter Verteilungsvorschlag des Autors: Intervall anhand seiner Wahrscheinlichkeit wählen, darin eine ganze Zahl gleichverteilt ziehen. 85–89 ist ein gemeinsames Intervall. Die Basisverteilung gilt für alle Länder außerhalb der sechs genannten Favoriten.

| Werte | Basiswahrscheinlichkeit |
| --- | ---: |
| 1–49 | 1 % |
| 50–69 | 8 % |
| 70–84 | 66 % |
| 85–89 | 13 % |
| 90–94 | 8 % |
| 95–97 | 3 % |
| 98–99 | 0,8 % |
| 100 | 0,2 % |

Damit sind in der Basis 12 % der Fähigkeiten mindestens 90 und 4 % mythisch (zuvor 4 % beziehungsweise 1 %). Bei fünf unabhängig gezogenen Fähigkeiten hat ein Spieler ohne Länderbonus etwa 47 % Chance auf mindestens einen Wert ab 90 und 18,5 % auf mindestens einen mythischen Wert. Hohe Gesamtstärken bleiben seltener als einzelne Spitzenfähigkeiten.

Die gewünschte fiktive Länderhierarchie ist China > Japan > Deutschland > Frankreich > Österreich > Kroatien. Sie ist eine Spielbalance-Vorgabe, keine Behauptung über reale Nationalmannschaften. Weil für die übrigen Länder keine Reihenfolge genannt wurde, werden sie gleich stark behandelt. Konkreter Balance-Vorschlag des Autors: Für Intervalle ab 85 wird das Basisgewicht mit dem Länderfaktor multipliziert, danach werden sämtliche Gewichte auf 100 % normalisiert. Für Intervalle unter 85 bleibt das Gewicht unverändert. Faktoren: China 2,0; Japan 1,8; Deutschland 1,6; Frankreich 1,45; Österreich 1,3; Kroatien 1,15; übrige Länder 1,0. Beispiel China: Gesamtgewicht 75 + 25 × 2 = 125; Wahrscheinlichkeit ab 90 = 24/125 = 19,2 %, mythisch = 8/125 = 6,4 %. Nicht direkt gerundete Prozenttabellen für die Ziehung verwenden.

Die Hierarchie gilt im Erwartungswert über viele Turniere, nicht zwingend für ein einzelnes Feld. Jeder Spieler kann überraschend stark oder schwach werden. Keine nachträgliche Sortierung, kein garantierter Favoritensieg, kein Bonus auf Gesamtstärke und kein Einfluss auf Auslosungen. Landesspezifische Gewichte gehören zum versionierten Katalog; gezogene Einzelwerte bleiben im Turnier-Snapshot gespeichert.

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

Vorschlag des Autors: nur ein bearbeitender Tab zur selben Zeit, zusätzliche Tabs öffnen vorhandene Daten lesend mit Hinweis. Die konkrete Sperrtechnik und Browser-Fallbacks bleiben der Umsetzung überlassen. Bei Übernahme der Schreibfreigabe lädt ein Tab ohne lokale ungespeicherte Eingaben zuerst das aktuelle aktive Turnier und die Archivliste, bevor Eingaben freigegeben werden. Lokale Konflikteingaben bleiben mit ihrer ursprünglichen Revision erhalten und werden niemals automatisch auf fremde Änderungen übertragen. „Gespeicherten Stand laden“ bietet einen ausdrücklich bestätigten Verzicht auf diese Eingaben; Abbrechen erhält den Text, bestätigtes Laden führt zum Start zurück und ermöglicht wieder Navigation.

## HTTPS im LAN, Installation, Offline-Betrieb und Updates

Betriebsziel ist eine feste HTTPS-Adresse im heimischen LAN. Der Smartphone-Browser lädt alle Assets vom Heimserver; keine CDN-Schriften, externen Bilder oder öffentlichen Dienste. Ein lokaler HTTPS-Server liefert den statischen Build aus, der Vite-Entwicklungsserver ist kein dauerhafter Produktivserver. Die konkrete Serverwahl bleibt der Umsetzung überlassen. Hostname beziehungsweise IP und Port bleiben konstant, da Browserdaten an den Origin gebunden sind. Ein Wechsel von HTTP zu HTTPS oder zu einer anderen Adresse übernimmt vorhandene Daten nicht automatisch.

HTTPS-Einrichtung und eine dokumentierte lokale Startanleitung gehören zur ersten Version. Ein lokales, auf dem Server und dem Smartphone vertrauenswürdiges Zertifikat deckt den verwendeten Hostnamen beziehungsweise die LAN-IP als Subject Alternative Name ab. Vorschlag des Autors: lokale Zertifizierungsstelle; die Anleitung beschreibt Zertifikatserzeugung und das erforderliche Installieren und Aktivieren des Vertrauens auf dem Smartphone. Eine bloß weggeklickte Zertifikatswarnung erfüllt die Abnahme nicht. Private Schlüssel und lokale Zertifikatsdateien werden nicht versioniert. Keine öffentliche Domain, Veröffentlichung oder Router-Portfreigabe erforderlich. Node.js installiert weiterhin der Nutzer selbst.

Manifest und lokale Icons ermöglichen die Installation im Rahmen der jeweiligen Browserfunktionen; auf unterstützten Smartphones wird eine passende Installationshilfe angeboten. Service Worker und Cache enthalten App-Shell, Skripte, Schriften, Flaggen und Porträtbestandteile. Erst nach vollständiger Cache-Befüllung zeigt die App Offline-Bereitschaft. Danach funktionieren erneutes Öffnen, Turnierstart, Ergebniseingabe und Archiv ohne Heimserver oder LAN-Verbindung. Turnierdaten bleiben in IndexedDB auf dem Smartphone.

Service Worker nur bei vorhandenem sicheren Kontext und Browserunterstützung aktivieren. Normale Browserbedienung bleibt auch bei fehlender Installationsmöglichkeit verfügbar, ohne falsche Offline-Zusage. Updates werden angeboten, ohne während einer Partie automatisch neu zu laden; Cache-Aktualisierung und Schema-Migrationen müssen vorhandene Daten erhalten. Ein fehlgeschlagenes Update ersetzt nicht die funktionierende Offline-Version.

## Abnahme und Prüfung

- Alle vier Einstiegsrunden ergeben korrekte Team-, Match- und Platzierungszahlen; keine doppelten Teams und keine zweite Auslosung durch Doppeltippen.
- Das Turnier lässt sich vom Start bis ins Archiv einschließlich kleinem Finale durchführen; Finale-Einstieg funktioniert ohne Platz-3-Spiel.
- Satzregeln inklusive Verlängerung, 1/2/3 Satzsiegen, ungültiger Eingaben und Korrekturen sind fachlich getestet.
- Fähigkeiten liegen im vorgesehenen Bereich, verwenden korrekte Seltenheitsgrenzen und gerundete Gesamtwerte; Basisverteilung, normalisierte Ländergewichte und Rangfolge ihrer Erwartungswerte werden anhand kontrollierter Zufallseingaben geprüft, ohne zufällig flackernde Tests.
- Neuladen erhält Spieler, Werte, Auslosungen, abgeschlossene Ergebnisse und gespeicherte Entwürfe. Archivierung erzeugt keine Duplikate.
- Vollständiger Ablauf auf dem Smartphone über die feste HTTPS-LAN-Adresse mit vertrauenswürdigem Zertifikat ohne Warnung; Installation im unterstützten Browser prüfen. Nach vollständigem initialem Laden Offline-Neustart, neuer Turnierstart, Ergebniseingabe und Archiv bei nicht erreichbarem Heimserver prüfen. Daten bleiben beim Neuladen am selben Origin erhalten.
- Manuelle Smartphone-Prüfung für Zahlentastatur, Fokus, Lesbarkeit, Touch-Flächen, HTTPS-LAN-Nutzung und schmale Ansichten; Desktop-Bedienung bleibt möglich.
- Speicherfehler, Zweittab und Update-Hinweis führen nicht zu stillen Datenverlusten.

## Offene Entscheidungen und Zuständigkeit

Keine zusätzliche Produktfrage blockiert dieses Design. Die oben als Autorenvorschlag markierten Details stehen bei der Designfreigabe zur Prüfung: technische Basis, Viertelfinale als Startstandard, Namensliste, konkrete Werteverteilung und Länderfaktoren, Gleichbehandlung der nicht eingeordneten Länder, ein aktives Turnier, Korrekturgrenzen und Zweittab-Verhalten. Die Umsetzung entscheidet Bibliotheksversionen, interne Dateistruktur, Porträtkomposition, Cache-/Sperrtechnik und Testwerkzeuge. Vor Umsetzung folgt nach Freigabe ein separater Implementierungsplan.
