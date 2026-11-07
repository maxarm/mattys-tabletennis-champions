# Entwicklungsregeln

## Projekt und Referenz

- „Matty’s Table Tennis Championships“ begleitet echte Tischtennisspiele zweier Menschen auf einem gemeinsam genutzten Smartphone. Sprache der Oberfläche: Deutsch.
- Fachliche Referenz: [Design](docs/superpowers/specs/2026-11-07-mattys-table-tennis-design.md). Benutzerkorrekturen haben Vorrang; Design bei fachlichen Änderungen aktualisieren.
- Geplante Basis: React, TypeScript mit strict-Prüfung, Vite, IndexedDB. Solange noch kein Scaffold existiert, keine vorhandenen npm-Skripte oder Tests voraussetzen.
- Node.js installiert der Nutzer manuell. Keine automatische Runtime-Installation und keine Veröffentlichung oder Cloud-Infrastruktur einrichten.

## Entwicklung

- Kleine, nachvollziehbare Änderungen. Bestehende Konventionen übernehmen; keine unnötigen Abhängigkeiten oder unbeteiligten Refactorings.
- Funktionale React-Komponenten und Hooks verwenden. Keine Seiteneffekte während des Renderns; Effects nur für externe Synchronisation, mit nötigem Cleanup.
- Typen für Turnierzustände und Statusübergänge explizit modellieren, möglichst als diskriminierte Unions. Kein unkontrolliertes `any`; persistierte Daten zur Laufzeit validieren.
- Fachlogik, Katalogdaten, Speicherung und UI trennen. Satzwertung, Auslosung, Fähigkeiten und Platzierungen als reine Funktionen mit injizierbarer Zufallsquelle implementieren.
- IDs und Snapshot-Daten bleiben stabil. Keine Zufallswerte beim Rendern oder Öffnen vorhandener Turniere erzeugen. React-Listen verwenden stabile fachliche Keys.
- Daten im State unveränderlich aktualisieren. Ableitbare Werte nicht redundant pflegen, sofern sie nicht bewusst Teil eines Archiv-Snapshots sind.
- IndexedDB-Schreibvorgänge abwarten, zusammengehörige Übergänge transaktional speichern und Speicherfehler sichtbar behandeln. Datenmigrationen erhalten laufende Turniere und Archive.
- Keine Geheimnisse im Frontend oder Repository. Keine Turnierdaten in unnötigen Logs.

## LAN und Assets

- Primärbetrieb: HTTPS im privaten LAN, konstante Adresse und Port. Entwicklung und statischer Build müssen vom Smartphone erreichbar sein; keine öffentliche Bereitstellung.
- Lokales HTTPS inklusive auf dem Smartphone vertrauenswürdigem Zertifikat und passendem Hostnamen/IP-SAN dokumentieren. Zertifikatswarnungen nicht als Lösung behandeln. Private Schlüssel und lokale Zertifikate nicht committen.
- Service Worker nach Feature- und Kontextprüfung aktivieren. Installation und vollständigen Offline-Neustart als Produktfunktionen umsetzen und auf dem Smartphone prüfen. Normale Browsernutzung muss ohne Installationsmöglichkeit funktionieren.
- Secure-Context-APIs, etwa für Sperren oder UUIDs, nicht ungeprüft verwenden; browserkompatible Fallbacks vorsehen.
- Keine Offline- oder Installationsfähigkeit versprechen, wenn sie im aktuellen Kontext fehlt. Herkunftswechsel nicht als automatische Datenmigration behandeln.
- Alle Schriften, Flaggen, Icons und Porträtbestandteile lokal ausliefern, keine CDNs oder externen Laufzeitdienste.
- Feste Spieleridentitäten und Porträts erhalten; Fähigkeiten ausschließlich bei Turnierbeginn erzeugen. Länderbonus ist Spielbalance, keine echte Sportstatistik.

## Oberfläche

- Smartphone zuerst, responsive Desktop-Ansicht. Tischgrün, Papierflächen, orangefarbene Hauptaktionen gemäß Designstudie.
- Semantisches HTML, sichtbarer Tastaturfokus, beschriftete Eingaben und Statusmeldungen, ausreichende Kontraste. Seltenheiten zusätzlich zur Farbe benennen.
- Touch-Flächen mindestens etwa 44 × 44 CSS-Pixel. Kein horizontales Scrollen außerhalb der ausdrücklichen Turnierbaum-Ansicht.
- Ergebniszahlen direkt über große Felder mit `inputmode="numeric"` erfassen; keine Plus-/Minus-Pflicht. Eingaben fachlich validieren, Entwürfe erhalten.
- Standard: ein Satzsieg. Keine Fähigkeiten als tatsächlichen Ergebnisbonus anwenden.

## Qualität und Zusammenarbeit

- Nach dem Scaffold passende npm-Skripte für Typecheck, Lint, Tests, Build und LAN-Start anlegen und deren tatsächliche Verwendung dokumentieren. Lockdatei mitführen.
- Änderungen mit den vorhandenen relevanten Prüfungen verifizieren. Erfolg nur nach beobachtetem Ergebnis behaupten; fehlende Runtime oder nicht ausgeführte Checks klar nennen.
- Fachlogik sinnvoll testen: Satzgrenzen und Verlängerung, Matchende, alle Einstiegsrunden, kleines Finale, Platzierungen, doppelte Aktionen, Verteilungsgrenzen und Ländergewichte.
- Zufallstests deterministisch gestalten. Keine probabilistisch flackernden Tests oder Tests, die nur die Implementierung kopieren.
- Speicherung und Wiederaufnahme mit Integrationstests prüfen. Wichtige Abläufe zusätzlich auf schmaler Ansicht und echter HTTPS-LAN-Adresse prüfen, insbesondere die Smartphone-Zahlentastatur.
- Für reine Dokumentänderungen reichen Konsistenz- und Diff-Prüfungen; keine künstlichen Produkt-Tests hinzufügen.
- Keine fremden Änderungen überschreiben. Nur aufgabenbezogene Dateien committen; keine generierten Abhängigkeiten, Buildausgaben, privaten Daten oder Brainstorming-Laufzeitdateien versionieren.
- Ergebnisse knapp auf Deutsch zusammenfassen: Änderung, Prüfung und verbleibende Einschränkungen.
