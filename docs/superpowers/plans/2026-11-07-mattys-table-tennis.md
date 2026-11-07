# Matty’s Table Tennis Championships Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Die freigegebene deutschsprachige Tischtennis-Begleitapp als lokal gespeicherte, installierbare und offline nutzbare Smartphone-PWA im HTTPS-Heimnetz umsetzen.

**Architecture:** React stellt Ansichten dar; reine TypeScript-Funktionen erzeugen und verändern Turnier-Snapshots. Ein Repository validiert und speichert vollständige Snapshots transaktional in IndexedDB. Service Worker und lokaler HTTPS-Server liefern ausschließlich lokale Assets; keine Serverdatenbank.

**Tech Stack:** React, TypeScript strict, Vite, CSS; Zod für persistierte Daten, idb für IndexedDB, Vitest und Testing Library mit fake-indexeddb für Fach-/Integrationstests, Playwright für Browserabläufe, vite-plugin-pwa mit Workbox für precache-basierten Service Worker. Versionen bei Einrichtung auf gegenseitige Kompatibilität und die tatsächlich verfügbare Node-Version prüfen und mit Lockdatei festhalten.

**Spec:** [Freigegebenes Design](../specs/2026-11-07-mattys-table-tennis-design.md). Zusätzlich vor jeder Umsetzung `AGENTS.md` lesen.

## Umsetzungsstand

Softwareaufgaben 1–7 umgesetzt und einzeln geprüft. 144 Tests, 14 Chromium-E2E-Tests, Typecheck, Lint, Build und isolierte Paketinstallation erfolgreich. Details: [Abnahme](../../acceptance.md). Echte Smartphone-/HTTPS-LAN-Abnahme bleibt dort ausdrücklich offen.

| Aufgabe | Ergebnis-Commit |
| --- | --- |
| 1 · Basis und Katalog | `ddc07f8` |
| 2 · Fähigkeiten und Turnierlogik | `665150e` |
| 3 · Speicherung und Tabs einschließlich Reviewkorrekturen | `178ef78` |
| 4 · Oberfläche und Charakterkarten | `dd54017` |
| 5 · Ergebnisse und Archiv einschließlich Reviewkorrektur | `c699f59` |
| 6 · PWA und Offline | `610ab98` |
| 7 · HTTPS und automatisierte Abnahme | `3a18a1c` |

## Global Constraints

- Sprache der Oberfläche: Deutsch. Ein gemeinsames Smartphone, keine festen Zuordnungen zu den beiden echten Menschen.
- Standard: 1 Satzsieg, Viertelfinale. 23 Länder und jeweils genau drei Spieler gemäß Design; vorgeschriebene Namen exakt übernehmen.
- Fähigkeiten gelten ausschließlich als Profil, nie als echter Ergebnisbonus. Spieleridentität und Kopf bleiben über Turniere hinweg fix.
- HTTPS im privaten LAN, keine Veröffentlichung, keine Cloud, keine externen Laufzeitdienste. Node.js installiert der Nutzer manuell.
- Ein aktives Turnier, Archive nur lesbar; keine Export-/Import- oder Löschfunktion für Archive.
- Alle Assets lokal; auch England erhält eine eigene lokale Flagge. Private Schlüssel und Zertifikatsdateien nicht versionieren.
- Installations-/Offline-Bereitschaft nur nach nachgewiesener Browserfähigkeit beziehungsweise vollständigem Cache anzeigen.
- Ausführung vom Nutzer freigegeben: frischer Implementierungs-Subagent je Aufgabe mit separatem Aufgabenreview. Tatsächliche Smartphone-Abnahme bleibt manuell offen.

## Review Focus

1. Langsame Speicherung und Doppeltippen dürfen keine zweite Auslosung oder Archivierung erzeugen; Revisionen und Operation-IDs in Aufgabe 3 testen.
2. Nachträgliche Satzkorrekturen können das Match früher beenden; überzählige Sätze und alte Siegerdaten in Aufgaben 2 und 5 prüfen.
3. Ein zweiter Tab oder unterbrochener erster Tab darf keine fremden Eingaben überschreiben; atomare Schreibsperre und Wiederaufnahme in Aufgabe 3 testen.
4. Ein altes Offline-Frontend darf nach einem Update keine neueren Daten beschädigen; unbekannte Schemata und Update-Ablehnung in Aufgaben 3 und 6 testen.
5. Die lokale Vorschau kann trotz laufendem HTTPS auf dem echten Telefon am Zertifikat scheitern; SAN, Vertrauen und echten Offline-Neustart in Aufgabe 7 manuell nachweisen.

## Ausgangslage, Struktur und Schnittstellen

Das Repository enthält Design und AGENTS.md, aber kein Scaffold. Die Brainstorming-Vorschau unter `.superpowers/` ist ignoriert und kein Produktcode. Die zuletzt geprüfte Agenten-Shell fand Node nicht und ein unpassendes npm; der Nutzer meldet Node v26.13.0/npm 11.20.0 in seiner Shell. Vor der Ausführung erneut prüfen, keine Runtime eigenständig installieren.

Geplante Aufteilung:

| Pfad | Verantwortung |
| --- | --- |
| `src/domain/types.ts`, `catalog.ts`, `portraits.ts` | Fachtypen, Länder/69 Identitäten, feste Kopfdefinitionen |
| `src/domain/ratings.ts`, `scoring.ts`, `tournament.ts` | Fähigkeiten, Satzregeln, Zustand und Übergänge |
| `src/storage/schema.ts`, `repository.ts`, `session.ts` | Laufzeitvalidierung, Transaktionen, Tab-Eigentum |
| `src/app/App.tsx`, `useTournament.ts` | Navigation und serialisierte Benutzeraktionen |
| `src/features/{home,rounds,match,results,archive}/` | Ansichten nach fachlicher Verantwortung |
| `src/components/{PlayerCard,Portrait,Flag,StatusMessage}.tsx` | gemeinsame, zugängliche Darstellungen |
| `src/styles/{tokens,global}.css` | Farben, Abstände und responsive Basis |
| `src/pwa/{client.ts,sw.ts,InstallHelp.tsx}` | Offline-Cache, Updates und Installationshilfe |
| `public/flags/`, `public/icons/` | lokale Flaggen und PWA-Icons |
| `scripts/serve-lan.mjs`, `docs/lan-setup.md` | statischer HTTPS-Betrieb und Zertifikatsanleitung |
| `tests/fixtures.ts`, `tests/e2e/` | deterministische Fixtures und Browserabläufe |

Tests der Fach-/Speicherfunktionen liegen jeweils daneben als `*.test.ts`; Komponententests als `*.test.tsx`. Dateiaufteilung darf bei der Umsetzung klein angepasst werden, Schnittstellen und fachliche Zuständigkeiten bleiben bestehen.

Gemeinsame Typentscheidungen für die Aufgaben:

- `RandomSource = () => number` liefert `[0, 1)`; `GenerationContext = { random: RandomSource; newId: () => string; now: () => string }`. Keine versteckten Zufalls-/Zeitquellen in Fachfunktionen.
- `EntryRound = 'roundOf16' | 'quarterfinal' | 'semifinal' | 'final'`; `WinsRequired = 1 | 2 | 3`; `Settings = { entryRound: EntryRound; winsRequired: WinsRequired }`.
- `Ratings = { ANG: number; VER: number; SVC: number; VOR: number; RUC: number }`; Anzeige von RUC als „RÜC“. `ParticipantSnapshot` enthält stabile Spieler-ID, Länder-ID, Namen, Land, Flaggenpfad, serialisierbare `PortraitDefinition`, Ratings und gerundete Gesamtstärke.
- `SetScore = readonly [number, number]`; `DraftSet = readonly [string, string]`. Texte erhalten auch unvollständige Eingaben, werden vor Abschluss streng geprüft.
- `Match` als Union `pending | completed`, mit ID, zwei Teilnehmer-IDs, Draft und optionalem Ergebnis nur im abgeschlossenen Fall. Ergebnis enthält gültige Sätze, Satzstand und Sieger-ID. `Round` enthält ID, Stufe, Auslosungszeit und Matches; die Stufe `medal` enthält finale und bronze Matches mit entsprechendem `kind`.
- `Tournament` als Union `playing | finished | archived`; gemeinsame Daten: ID, `schemaVersion: 1`, Revision, Beginn, Einstellungen, Snapshots, Runden. `finished`/`archived` enthalten Abschlusszeit und Platzierungen; `archived` zusätzlich Archivzeit. Keine Phase muss aus widersprüchlichen Flags erraten werden.
- `Placement = { participantId: string; rank: 1 | 2 | 3 | 4 | 5 | 9 }`. Gleiche Ränge bleiben in ursprünglicher Teilnehmerreihenfolge, ohne zusätzliche Wertung.
- `DomainError` mit Code für ungültige Ergebnisse, gesperrte Korrektur, unvollständige Runde oder unzulässige Aktion. Speicheradapter übersetzt Fehler in verständliche deutsche UI-Meldungen.

## Aufgabe 1: Lauffähige Basis und reproduzierbarer Spielerkatalog

**Dateien:** `package.json`, `package-lock.json`, `index.html`, `tsconfig*.json`, `vite.config.ts`, `eslint.config.js`, `vitest.config.ts`, `src/main.tsx`, `src/app/App.tsx`, `src/domain/{types,catalog,portraits}.ts`, `src/domain/catalog.test.ts`, `tests/setup.ts`, `.gitignore`, `README.md`.

**Schnittstellen:** Exportiert gemeinsame Typen, `COUNTRIES: readonly Country[]`, `PLAYERS: readonly Player[]`, `CATALOG_VERSION` und `PortraitDefinition`. `Country` besitzt ID, deutschen Namen, lokalen Flaggenpfad und Stärke-Faktor; `Player` stabile ID, Länder-ID, Namen und feste Porträtdefinition.

- [x] Node/npm mit `command -v node`, `node --version`, `command -v npm`, `npm --version` prüfen. Bei Pfadproblemen die vorhandene Installation suchen und passend einbinden; keine neue Runtime installieren. Bleibt sie unzugänglich, Ursache konkret melden und diesen Ausführungsblock offen lassen.
- [x] React-/Vite-/TypeScript-Projekt mit striktem Typecheck und den genannten Testwerkzeugen einrichten. Skripte: `dev`, `typecheck`, `lint`, `test` (Vitest run), `test:watch`, `build` (Typecheck + Vite), später `test:e2e` und `serve:lan`. Nur tatsächlich angelegte Skripte dokumentieren. `node_modules/`, `dist/`, Testreports, `.certs/`, `.env.local` und Schlüsseldateien ignorieren.
- [x] `catalog.test.ts` schreiben: exakt 23 eindeutige Länder und 69 eindeutige Spieler; je Land drei Einträge in Designreihenfolge; sieben Pflichtnamen wortgleich; dritter Name entspricht der Designtabelle; jede Identität hat eine stabile Porträtdefinition. `npm test -- src/domain/catalog.test.ts` muss vor Anlegen der Exporte scheitern.
- [x] Typen und den vollständigen Designkatalog implementieren; Faktoren 2/1,8/1,6/1,45/1,3/1,15 für China/Japan/Deutschland/Frankreich/Österreich/Kroatien, sonst 1. Porträts mit festen, unterschiedlichen Definitionen ohne Zufall beim Rendern vorbereiten.
- [x] `npm test -- src/domain/catalog.test.ts`, `npm run typecheck`, `npm run lint`, `npm run build` ausführen; alle erfolgreich. Minimale App zeigt den deutschen Titel. Nur nach geprüfter Ausgabe committen: `chore: bootstrap app and fixed player catalog`.


## Aufgabe 2: Fähigkeiten, Satzwertung und vollständiger Turniermotor

**Dateien:** `src/domain/{ratings,scoring,tournament}.ts`, jeweils `*.test.ts`, `tests/fixtures.ts`; nötige Ergänzungen an `types.ts`.

**Schnittstellen:** `rollRatings(factor: number, random: RandomSource): Ratings`; `overall(ratings: Ratings): number`; `rarity(value: number): 'common' | 'legendary' | 'epic' | 'mythic'`; `validateSet(score: SetScore): boolean`; `evaluateDraft(sets: readonly DraftSet[], wins: WinsRequired): DraftEvaluation`; `createTournament(settings: Settings, ctx: GenerationContext): Tournament`; `applyCommand(t: Tournament, command: TournamentCommand, ctx: GenerationContext): Tournament`.

`DraftEvaluation` ist `invalid` (Zeilenfehler), `incomplete` oder `complete` (gültige Sätze, Satzstand, Gewinnerseite). `TournamentCommand` ist eine Union aus `saveDraft(matchId, sets)`, `completeMatch(matchId, sets)`, `drawNextRound(roundId)` und `archive`; tatsächliche Felder als Objekte mit `type` modellieren. `roundId` bezeichnet ausdrücklich die abzuschließende Runde und verhindert erneutes Auslosen bereits verarbeiteter Runden. Verwerfen erledigt später das Repository.

- [x] Deterministische Tests für Intervallgrenzen, 85/89/90/94/95/100 und gerundeten Mittelwert schreiben. Basisgewichte `[1,8,66,13,8,3,0.8,0.2]` auf Bereiche `[1,49],[50,69],[70,84],[85,89],[90,94],[95,97],[98,99],[100,100]`; ab 85 Faktoren anwenden und normalisieren. Tests prüfen Erwartungswertrangfolge und China-Wahrscheinlichkeiten 19,2 % ab 90 / 6,4 % mythisch analytisch, ohne Stichprobenschwankungen.
- [x] Satz-/Draft-Tests schreiben: 11:0, 11:9, 12:10, 15:13 gültig; 11:10, 12:8, negative, dezimale und nicht numerische Eingaben ungültig. Leere Strings bleiben unvollständig, nicht 0. Spiegelbilder und Siege auf beiden Seiten prüfen. Für 1/2/3 Siege Matchende nach maximal 1/3/5 Sätzen; nach Änderung früherer Sätze keine überzähligen Sätze oder veralteten Siege. Zahlen außerhalb sicherer JS-Ganzzahlen als nicht darstellbare Eingabe ablehnen, ohne sportliche Obergrenze einzuführen.
- [x] Parametrisierte Turniertests für alle Einstiege schreiben: 16/8/4/2 Teilnehmer und 16/8/4/1 Gesamtmatches. Keine doppelten Länder, alle drei Spieler erreichbar, Zustand beim Rendern unverändert. Mit kontrollierter Zufallsfolge demonstrieren, dass Neuauslosung echte neue Paarungen zulässt und keine Setzliste benutzt.
- [x] Übergangstests schreiben: Auslosen vor vollständiger Runde abweisen; nach Halbfinale finale + bronze erzeugen; beide Reihenfolgen der Abschlussmatches zulassen; nur bei allen erforderlichen Ergebnissen `finished`. Plätze 1–4 sowie geteilte 5/9 korrekt. Wiederholte Auslosung derselben Runde und wiederholte Archivierung idempotent. Korrektur nur vor nächster Auslosung beziehungsweise Archivierung; vorübergehend unvollständige Korrektur darf ein fertiges Turnier wieder spielbar machen.
- [x] `npm test -- src/domain` ausführen und erwartetes Scheitern der neuen Tests beobachten; dann Funktionen implementieren. Fisher-Yates für Auswahl/Paarung, injizierte IDs/Zeit, Snapshots bei Erstellung. Dieselbe Fehler-/Korrekturlogik für Draft und Abschluss verwenden; beim Speichern eines korrigierten abgeschlossenen Matches altes Ergebnis entfernen, bis neu abgeschlossen wird.
- [x] `npm test -- src/domain`, `npm run typecheck` ausführen; erfolgreich committen: `feat: implement ratings scoring and tournament rules`.


## Aufgabe 3: Transaktionale Speicherung und Tab-Eigentum

**Dateien:** `src/storage/{schema,repository,session}.ts`, jeweils `*.test.ts`, `src/app/useTournament.ts`, `src/app/useTournament.test.tsx`.

**Schnittstellen:** `parseTournament(value: unknown): Tournament`; `openRepository(): Promise<TournamentRepository>`. Repository: `loadActive()`, `listArchives()`, `loadById(id)`, `create(t, sessionId)`, `dispatch(id, expectedRevision, operationId, command, sessionId)`, `discardActive(id, expectedRevision, sessionId)`. Rückgaben sind Promises; dispatch liefert den gespeicherten Snapshot. `acquireSession(sessionId)`, `renewSession(sessionId)`, `releaseSession(sessionId)` verwenden dieselbe lokale Datenbank. Alle Schreibmethoden prüfen Session-Eigentum atomar.

Entscheidung: IndexedDB mit Stores `tournaments` (keyPath ID), `meta` (aktives Turnier und globale Schreib-Lease) und `operations` (Operation-ID + Turnier-ID). Alle Übergänge inklusive Revision, aktivem Verweis, Archivstatus und Deduplizierung erfolgen in derselben readwrite-Transaktion. Nach bereits gespeicherter Operation wird der aktuelle Snapshot zurückgegeben, ohne dieselbe Aktion erneut anzuwenden. Fachbefehl und IDs/Zeit werden vor beziehungsweise synchron innerhalb der Transaktion erzeugt, niemals auf Netzwerk warten.

- [x] fake-indexeddb-Tests schreiben: laufendes Turnier und Draft nach erneutem Öffnen identisch; Archiv behält damaligen Katalog/Porträts; Revisionenkonflikt überschreibt nichts; wiederholte Operation-ID erzeugt keine zweite Runde/Archivzeile. Fehler beim Commit lässt zuvor gespeicherte Daten unverändert.
- [x] Schemafälle prüfen: unbekannte Version, ungültiger Status, fehlende Teilnehmerreferenz, falsche Ratings/Satzwertung und widersprüchliche Platzierung melden Fehler ohne Löschung. Für Schema 1 eine versionierte Migrationsfunktion anlegen; spätere Versionen werden bis zur passenden Migration abgewiesen. Archive werden nicht bei jedem Öffnen mit dem aktuellen Katalog neu aufgebaut.
- [x] Lease-Tests mit injizierter Uhr: 15 Sekunden Laufzeit, Erneuerung alle 5 Sekunden; zweiter Tab bleibt lesend. Nach Ablauf darf er übernehmen, der alte Tab verliert Schreibrechte auch bei noch offener UI. Erneuerung bei visibilitychange/focus, Freigabe beim geordneten Schließen nur best effort. ID-Fallback mit `crypto.getRandomValues`, wenn `randomUUID` fehlt; keine Abhängigkeit von Web Locks.
- [x] Tests zuerst ausführen (`npm test -- src/storage src/app/useTournament.test.tsx`), Scheitern prüfen, dann Schema, Repository, Session und Hook implementieren. Hook serialisiert Eingaben, speichert Draft nach 250 ms und bei blur, wartet vor Navigation/Abschluss auf ausstehende Speicherung und zeigt „Wird gespeichert“, Fehler oder gespeicherten Zustand. Ältere Antworten dürfen neuere Texte nicht ersetzen; überlappende Autosaves mit Test absichern.
- [x] Wiederaufnahme eines fertigen, noch nicht archivierten Turniers und Verwerfen nur des aktiven Turniers testen. Speicherfehler und Lease-Verlust halten Eingaben sichtbar, statt Erfolg zu melden.
- [x] Genannte Tests sowie Typecheck erfolgreich ausführen; committen: `feat: persist tournaments and protect concurrent edits`.


## Aufgabe 4: Hauptbildschirm, Runden, Turnierbaum und Charakterkarten

**Dateien:** `src/app/App.tsx`, `src/features/home/HomeScreen.tsx`, `src/features/rounds/{RoundScreen,TournamentTree}.tsx`, `src/components/{PlayerCard,Portrait,Flag,StatusMessage}.tsx`, `src/styles/{tokens,global}.css`, `public/flags/*.svg`, `src/features/home/HomeScreen.test.tsx`, `src/features/rounds/RoundScreen.test.tsx`.

**Schnittstellen:** `App` navigiert intern über eine diskriminierte `Screen`-Union (home, round, match, results, archive, archiveDetail). Keine zusätzlichen URL-Routen nötig. Ansichten konsumieren persistierte Snapshots und Callback-Promises aus `useTournament`; sie verändern keine Fachzustände selbst. `Portrait({definition})`, `Flag({countryName,src})`, `PlayerCard({participant})` rendern Snapshot-Inhalte.

- [x] Komponententests schreiben: Standard Viertelfinale/1; Anzahl 8 Teams/8 Matches; neue Meisterschaft per einmaliger Aktion; aktives Turnier zeigt Fortsetzen und bestätigtes Verwerfen. Speicherfehler navigiert nicht. Rundenbutton nur nach vollständiger Runde; abgeschlossene Partien öffnen; künftige Paarungen sind nicht erfunden.
- [x] Tests scheitern lassen, dann Grundlayout im bestätigten Stil implementieren. Flaggen vollständig lokal erstellen, alle 69 Köpfe anhand fester Definitionen als SVG rendern. Karten zeigen ANG/VER/SVC/VOR/RÜC, Gesamtwert und Seltenheitsbezeichnungen mit Farben. Keine Rasterbildgenerierung notwendig.
- [x] Paarungsliste und zusätzliche Baumansicht mit tatsächlichen Teilnehmer-Verbindungen bauen; kommende Runden „Noch nicht ausgelost“, Platz 3 separat. Responsive Baum als eigener Scrollbereich; normale Ansichten bleiben bei 360 CSS-Pixeln ohne Seiten-Overflow.
- [x] Tests und `npm run build` ausführen; Tastaturfokus, Kontraste, 44-Pixel-Flächen und 360/390/desktop-Ansichten kontrollieren. Nur lokale Assets/ Systemschrift verwenden. Commit: `feat: add tournament setup rounds and player cards`.


## Aufgabe 5: Ergebniseingabe, Siegerehrung und Archiv

**Dateien:** `src/features/match/{MatchScreen,SetInputs}.tsx`, `src/features/results/ResultsScreen.tsx`, `src/features/archive/{ArchiveScreen,ArchiveDetail}.tsx`, zugehörige `*.test.tsx`, nötige Anpassungen an `App.tsx`.

**Schnittstellen:** Matchansicht verwendet `evaluateDraft` und Repository-Befehle, nie eine zweite Satzwertung. Ergebnis- und Archivansichten lesen ausschließlich Snapshots; nach Archivierung keine schreibenden Callbacks anbieten.

- [x] Interaktionstests schreiben: zwei leere große Felder bei 1 Satzsieg, `inputmode="numeric"`, vorhandener Inhalt beim Fokus selektiert, gültige Folgezeile bei 2/3 Satzsiegen, verständliche Zeilenfehler. 11:10 deaktiviert Abschluss; 12:10 erlaubt Abschluss und Rückkehr erst nach Speichererfolg.
- [x] Korrekturtests: bereits abgeschlossenes Ergebnis vor Neuauslosung editieren; vorläufiger Draft entfernt den alten Sieger aus dem Fortschritt. Bei früherem Matchende überzählige Sätze abschneiden und Meldung zeigen. Nach Auslosung bzw. Archivierung nur lesen. Browser-Neuladen übernimmt zuletzt gespeicherte Eingabe.
- [x] Tests für Finale/Platz 3 in beiden Reihenfolgen, fertiges nicht archiviertes Turnier nach Neustart, doppelte Archivbetätigung, sämtliche geteilten Ränge und vollständige Archivdetails schreiben. Archivdatum/Sieger/Runde/Satzregel sichtbar; kein Neu-Auswürfeln beim Öffnen.
- [x] Tests vor Implementierung scheitern lassen, Ansichten und Navigation bauen. Fachliche Aktionen mit Pending-Zustand gegen Doppeltippen schützen, echte Fehlermeldungen sichtbar ausgeben. Hauptmenü erlaubt Rückkehr und Archiv; keine echte Personenzuordnung und keine Plus-/Minus-Pflicht.
- [x] Relevante Komponenten-/Speichertests, Typecheck und Build erfolgreich ausführen. Manuell Beispielpartie eingeben und ganze Meisterschaft abschließen. Commit: `feat: add results entry podium and tournament archive`.


## Aufgabe 6: Installierbare PWA mit verlässlichem Offline-Cache

**Dateien:** `src/pwa/{client.ts,sw.ts,InstallHelp.tsx}`, `src/pwa/client.test.ts`, `public/icons/{icon-192,icon-512,maskable-512,apple-touch-icon}.png`, `vite.config.ts`, `index.html`, `playwright.config.ts`, `tests/e2e/offline.spec.ts`, `tests/e2e/updates.spec.ts`.

**Schnittstellen:** `registerPwa(): PwaController` liefert subscribierbaren Status `unsupported | caching | ready | updateAvailable | error` und `applyUpdate(): Promise<void>`. Status `ready` nur nach vollständigem verpflichtendem Precache und aktivem kontrollierendem Worker, nicht allein wegen `navigator.onLine` oder Registration-Erfolg. UI zeigt Installationshilfe je Plattformfähigkeit; Apple-Startbildschirm-Hinweise als manueller Weg.

- [x] Clienttests schreiben: fehlender sicherer Kontext/SW → unsupported; fehlgeschlagener Cache → keine Offline-Zusage; wartender Worker → Update-Hinweis ohne Reload. Keine automatische Aktivierung mit `skipWaiting` und kein automatischer Seitenwechsel während eines Matches.
- [x] Playwright offline-Test anlegen: gebauten Stand frisch laden, explizit auf Cache-Bereitschaft warten, Browser offline setzen, Seite neu öffnen, neues Turnier durchspielen und Archiv öffnen. Lokale Flaggen/Porträts müssen sichtbar bleiben. Bei Erstaufruf ohne Netz verständlicher Browserfehler zulässig, keine fiktive Verfügbarkeit.
- [x] Update-Test mit zwei lokal gebauten Versionen vorbereiten: aktiven Draft erfassen, neue Version verfügbar machen, Update ablehnen → Draft/Seite unverändert; später nach abgeschlossenem Speichern akzeptieren → neue Version und gleiche Daten. Fehlgeschlagene neue Cache-Installation lässt alte Offline-Version nutzbar. Unbekannte Datenversion wird vom alten Frontend lesbar als Fehler gemeldet, nicht überschrieben.
- [x] Tests scheitern lassen; Workbox-Precache via injectManifest konfigurieren, alle nötigen lokalen Assets einschließlich dynamischer Flaggen aufnehmen. Manifest mit Namen, Icons, Start-URL, Theme und Standalone; Icons aus eigenen Vektorformen lokal rendern. Keine externen Requests für Installation oder Darstellung.
- [x] `npm test -- src/pwa`, `npm run build`, `npm run test:e2e -- tests/e2e/offline.spec.ts tests/e2e/updates.spec.ts` ausführen. Playwright darf localhost als sicheren Testkontext verwenden; echte LAN-Zertifikatsprüfung bleibt Aufgabe 7. Commit: `feat: enable installation offline use and safe updates`.


## Aufgabe 7: Lokaler HTTPS-Betrieb und vollständige Abnahme

**Dateien:** `scripts/serve-lan.mjs`, `tests/serve-lan.test.ts`, `docs/lan-setup.md`, `README.md`, `package.json`, `tests/e2e/championship.spec.ts`, `tests/e2e/multi-tab.spec.ts`, `docs/acceptance.md`.

**Schnittstellen:** `npm run serve:lan` startet Node-HTTPS-Server für `dist/` an `0.0.0.0`, Port standardmäßig 8443. Konfiguration über `LAN_PORT`, `LAN_TLS_CERT`, `LAN_TLS_KEY`; Standardpfade `.certs/lan-cert.pem` und `.certs/lan-key.pem`. Kein automatisches Erzeugen von CA, Zertifikaten oder Trust-Änderungen beim Start.

- [x] Servertests schreiben: fehlende Zertifikate/fehlender Build erklären Fehler statt HTTP-Fallback; nur Dateien innerhalb `dist/` erreichbar, Pfad-Traversal abweisen, korrekte MIME-Typen für JS/SVG/Manifest, Service Worker ohne dauerhaften HTTP-Cache. Danach minimalen statischen Server mit Node-Bordmitteln implementieren; keine API/Serverdatenbank.
- [x] HTTPS-Anleitung erstellen: feste LAN-Adresse/Name, lokale CA etwa mit mkcert (manuell zu installierendes Zusatzwerkzeug, keine automatische Systemänderung), Zertifikat mit passendem IP-/DNS-SAN, Ablage unter `.certs/`, nur öffentliches CA-Zertifikat zum Telefon übertragen, dort installieren und Vertrauen aktivieren. Separate iOS-/Android-Hinweise anhand offizieller aktueller Dokumentation bei Umsetzung verifizieren. Kein privater CA-Schlüssel aufs Smartphone, keine Router-Portfreigabe. Startbefehle und Origin-Bindung erklären.
- [x] E2E-Prüfungen schreiben: alle Einstiegsrunden vom Start bis Archiv; 1/2/3 Satzsiege über Testmatrix; mehrfacher Klick während künstlich langsamer Speicherung; zweiter Tab lesend und Übernahme nach Lease-Ablauf; Neustart erhält Namen, Werte, Auslosungen und Entwürfe. Vor Produktanpassungen fehlschlagende Fälle beobachten.
- [x] `npm run typecheck`, `npm run lint`, `npm test`, `npm run build`, `npm run test:e2e` ausführen; Ergebnisse dokumentieren, Fehler beheben und nur betroffene Prüfungen wiederholen, sofern der Fehler keine breitere Wirkung hat.
- [ ] Auf echtem Smartphone HTTPS ohne Zertifikatswarnung und `window.isSecureContext` prüfen. App installieren, Zahlentastatur/Fokus, 44-Pixel-Touchflächen, Baumscroll und Lesbarkeit testen. Nach Offline-Bereitschaft Heimserver stoppen bzw. Verbindung trennen, App schließen/erneut öffnen, Turnier spielen und Archiv ansehen. Desktop ebenfalls prüfen. Agenten-Browsertests ersetzen diese Hardwareprüfung nicht; falls kein Zugriff möglich, offene manuelle Punkte klar in `docs/acceptance.md` lassen, ohne sie als bestanden zu markieren.
- [x] Abnahme dokumentieren und ausschließlich geprüfte Änderungen committen: `feat: support trusted LAN HTTPS and document acceptance`. Keine Veröffentlichung, kein Merge/Push ohne passenden Auftrag.


## Selbstprüfung und Übergabe

Plan gegen das freigegebene Design geprüft: Katalog und Porträts (1/4), Gewichtung und Turnierregeln (2), Persistenz/Korrekturen/Zweittab (2/3/5), alle Ansichten und Baum (4/5), Installation/Offline/Updates (6), HTTPS und Smartphone-Abnahme (7). Die fünf Review-Fälle besitzen jeweils zugeordnete Tests bzw. die notwendige Hardwareprüfung. Befehle beschreiben erst einzurichtende Skripte und sind noch keine Behauptung ausgeführter Tests.

Reihenfolge: 1 → 2 → 3 → 4 → 5 → 6 → 7. Nach jedem abgeschlossenen Aufgabenschritt Zustand prüfen; nach jeder Aufgabe Commit und kurze Rückmeldung. Bei Abweichungen den Plan aktualisieren, statt still den Umfang zu verändern.

Empfehlung: native Umsetzung in dieser Sitzung, weil die sieben Aufgaben eng auf denselben Typen und Snapshots aufbauen. Ein unabhängiger Review der gesamten Implementierung vor Abschluss ergänzt Fach-, Speicher- und Browserprüfungen. Alternativ aufgabenweise Umsetzung und Review durch jeweils frische Subagenten; das bietet frühere unabhängige Prüfungen bei höherem Kontextaufwand.

Gewählte Ausführung: Subagenten pro Aufgabe und unabhängiges Aufgabenreview; der ursprünglich empfohlene native Ansatz wurde nicht gewählt.
