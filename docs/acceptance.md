# Abnahme Matty’s Table Tennis Championships

## Automatisierte Browserprüfung

Stand 7. November 2026. Chromiumläufe ersetzen keine Abnahme auf iOS oder Android.

| Bereich | Abdeckung | Ergebnis |
| --- | --- | --- |
| Fachlogik und Speicherung | Satzwertung, Medaillenrunde, Platzierungen, Revisionen, Tab-Lease, Wiederaufnahme und Archiv | 148/148 Vitest-Tests in 17 Dateien, einschließlich 2 HTTPS-Servertests, Übernahme mit aktualisiertem Aktiv-/Archivstand und bestätigter Konflikterholung |
| Turnier im Browser | alle vier Einstiegsrunden bis zum Archiv; 1/2/3 Satzsiege; vollständige Snapshots nach Reload; Mehrfachklicks bei verzögerter Speicherbestätigung; zweiter Tab liest vor einer fremden Änderung und lädt bei Übernahme nach Lease-Ablauf den aktuellen Draft vor dem Bearbeiten | 9/9 Turnier-/Tabfälle im finalen Gesamtlauf; geänderter Übernahmetest zusätzlich einzeln grün |
| PWA | Cache, Offline-Neustart im Browserkontext, Turnier/Archiv, Updateablehnung/-annahme mit Build-Markierung, Cachefehler, unbekanntes Schema | 14/14 Chromium-E2E-Tests im finalen Gesamtlauf bestanden (4,0 min), einschließlich des korrigierten Übernahmefalls |
| HTTPS-Server | Fehlkonfiguration, TLS mit temporärem Testzertifikat und explizitem Client-Trust, MIME, no-store, Traversal, Symlink-Ausbruch | Vitest; Testschlüssel temporär |
| Smartphone-Abnahme | manuell durch den Nutzer | Gesamt-Abnahme bestätigt; keine einzelnen Geräte-/Installationsdetails protokolliert |

Finaler Review-Fix: Übernahme lädt den aktuellen Aktiv-/Archivstand vor Schreibfreigabe. Konflikteingaben bleiben bis zur ausdrücklichen Verwerfbestätigung erhalten; Abbrechen erhält den Text. Vier zusätzliche Hook-/UI-Tests, beobachtetes Assertion-RED/GREEN und echter Browser-Übernahmefall; bestehende Lost-response-Regressionen weiterhin grün.

Prüfkommandos: `npm ci`, `npm run typecheck`, `npm run lint`, `npm test`, `npm run build`, `npm run test:e2e`. Ausgeführt mit Node 26.13.0 und npm 11.20.0: Typecheck, ESLint und Build erfolgreich. `npm ci --prefix <leeres temporäres Verzeichnis> --cache <temporärer Cache> --no-audit --no-fund --fetch-retries=0 --fetch-timeout=20000` installierte aus unverändertem `package.json` und `package-lock.json` erfolgreich 540 Pakete. Der erste Downloadversuch in der Netzwerksandbox scheiterte mit `EAI_AGAIN`; der autorisierte Lauf außerhalb der Sandbox gelang. Lockdatei und Abhängigkeiten wurden nicht verändert.

OpenSSL erzeugte nur kurzlebige Testzertifikate; HTTPS wurde mit explizit übergebenem Client-Vertrauen geprüft. Es gab keine CA-Installation oder Änderung am Systemvertrauen. Chromium testet lokal auf HTTP-Loopback bei 390 × 844 CSS-Pixeln; das ist kein Nachweis für vertrauenswürdiges HTTPS auf einem echten Telefon. Detailprotokolle und Task-Bericht liegen im ignorierten Arbeitsbereich `.superpowers/sdd/2026-11-07-mattys-table-tennis/`.

Bekannte nicht blockierende Werkzeugmeldungen: veraltete transitive glob-/ESLint-Versionen, npm-Hinweis zum esbuild-Installationsskript, von Rollup entfernte Zod-PURE-Kommentare und NO_COLOR/FORCE_COLOR-Konflikt im Browser-Teststarter. Keine Runtime oder Browser wurden automatisch installiert.

## Manuelle Abnahme auf echtem Smartphone – vom Nutzer bestätigt

Der Nutzer hat die Prüfung am Smartphone mit „geprüft – passt“ bestätigt. Die Gesamt-Abnahme ist damit erteilt. Gerätemodell, OS, Browser, Origin und einzelne Messungen wurden nicht mitgeteilt; die folgenden Schritte sind deshalb nicht als separat beobachtete Agentenprüfungen zu verstehen. Zertifikatseinrichtung: [LAN-Anleitung](lan-setup.md).

| Prüfschritt | Ergebnis |
| --- | --- |
| HTTPS-LAN-Adresse ohne Zertifikatswarnung geöffnet | Durch Gesamt-Abnahme bestätigt; kein Einzelprotokoll |
| `window.isSecureContext === true` und Service Worker aktiv | Durch Gesamt-Abnahme bestätigt; kein Einzelprotokoll |
| Auf iOS „Zum Home-Bildschirm“ bzw. angebotenen Android-Installationsdialog geprüft; App auch ohne Installation im Browser bedient | Durch Gesamt-Abnahme bestätigt; kein Einzelprotokoll |
| Zahlenfeld antippen: native Zahlentastatur, Fokus, direkte Eingabe und sichtbarer Speicherstatus; gespeicherten Entwurf nach Neustart prüfen | Durch Gesamt-Abnahme bestätigt; kein Einzelprotokoll |
| Touchziele mindestens ca. 44 × 44 CSS-Pixel; Lesbarkeit/Kontrast; kein Seitenüberlauf, ausschließlich Baum horizontal scrollbar | Durch Gesamt-Abnahme bestätigt; kein Einzelprotokoll |
| Offlinebereitschaft angezeigt, Server/Netz getrennt, App geschlossen und neu geöffnet | Durch Gesamt-Abnahme bestätigt; kein Einzelprotokoll |
| Nach vollständigem Schließen ohne Server/Netz offline neu starten; Turnier fortsetzen, Partie abschließen und Archiv öffnen | Durch Gesamt-Abnahme bestätigt; kein Einzelprotokoll |
| Desktop-Browser an derselben LAN-Adresse geprüft | Nicht separat vom Nutzer berichtet |

Nachweis: Bestätigung des Nutzers im Projektgespräch; Geräte- und Einzelprüfungsdaten nicht erfasst.

## Verschieben des Projektordners

Die Startbefehle und Standard-Zertifikatspfade sind relativ zum aktuellen Projektverzeichnis. Der Projektordner heißt `mattys-tabletennis-champions`; die Umbenennung erfordert keine Anpassung versionierter absoluter Projektpfade. Neue Shell/Editor-Sitzung im verschobenen Ordner öffnen; gegebenenfalls externe Startverknüpfungen und absolut gesetzte `LAN_TLS_CERT`-/`LAN_TLS_KEY`-Variablen anpassen. Der Browser-Origin muss unverändert bleiben, damit die gespeicherten Turniere erreichbar bleiben.

## Abschlussreview

Alle sieben Softwareaufgaben wurden unabhängig geprüft. Das abschließende Review des gesamten Branches fand einen Mehrtab-Übernahmefehler; dieser wurde mit Regressionstests korrigiert und im gezielten Re-Review freigegeben (`0f205ee`). Keine offenen blockierenden Softwarebefunde; die Smartphone-Gesamt-Abnahme wurde anschließend vom Nutzer bestätigt.
