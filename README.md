# Matty’s Table Tennis Championships

Lokale deutschsprachige Begleitung echter Tischtennisspiele auf einem gemeinsamen Smartphone.

## Entwicklung

Node.js wird manuell installiert. Geprüft mit Node **26.13.0** und npm **11.20.0**.
Bei dieser lokalen Installation vor jedem Aufruf:

```sh
export PATH="$HOME/.nvm/versions/node/v26.13.0/bin:$PATH"
npm ci
npm run dev
```

Der Entwicklungsserver lauscht auf `0.0.0.0:5173`, mit festem Port (kein automatisches Ausweichen). Im privaten LAN ist die Entwicklungsbasis über `http://<LAN-IP>:5173` erreichbar. Nur im vertrauenswürdigen privaten Netz starten.

| Befehl | Zweck |
| --- | --- |
| `npm run dev` | Vite-Entwicklungsserver |
| `npm run typecheck` | Strikte Prüfung von App, Tests und Toolkonfiguration |
| `npm run lint` | ESLint einschließlich React-Hook-Regeln |
| `npm test` | Vollständiger Vitest-Lauf |
| `npm test -- src/domain/catalog.test.ts` | Fokussierter Katalogtest |
| `npm run test:watch` | Vitest im Watch-Modus |
| `npm run build` | Typecheck und statischer Build nach `dist/` |
| `npm run serve:lan` | Statischer HTTPS-Build auf Port 8443 |
| `npm run test:e2e` | Vollständige Playwright-Browserprüfung |

## PWA und Browserprüfungen

Der aktuelle Stand enthält Turnierabläufe, Ergebniseingabe, Wiederaufnahme und Archiv in IndexedDB. Flaggen und SVG-Porträts werden lokal dargestellt.

`npm run build` erzeugt Manifest, lokale PNG-Icons und `dist/sw.js` mit Workbox-Precache. Service Worker laufen im Produktionsbuild, nicht im Vite-Entwicklungsserver. „Offline bereit“ erscheint erst nach vollständiger Prüfung des Pflichtcaches durch den tatsächlich kontrollierenden Worker. Installation wird bei angebotenem Browserdialog ermöglicht; Apple-Geräte erhalten einen bedingten manuellen Hinweis. Browserbedienung funktioniert ohne Installation.

Updates werden nur angeboten. „Später“ lässt die laufende Ansicht unverändert. „Jetzt aktualisieren“ bleibt in der Matchansicht gesperrt und wartet außerhalb davon auf erfolgreiches `flush()` des einzigen Turnier-Hooks. Speicherfehler verhindern Aktivierung/Reload. Andere offene Tabs werden nicht automatisch neu geladen. Nach einem Reload kann die bestehende Schreibfreigabe bis zum Ablauf ihrer 15-Sekunden-Lease vorübergehend nur lesbar sein; die Sitzungsprüfung erwirbt sie erneut.

```sh
npm test -- src/pwa
npm run test:e2e -- tests/e2e/offline.spec.ts tests/e2e/updates.spec.ts
```

Der E2E-Befehl baut zwei lokale Versionen in ignorierte `.superpowers/sdd/`-Verzeichnisse und startet ausschließlich für Tests einen HTTP-Server auf `127.0.0.1:8776`. Chromium muss bereits installiert sein; bei Sandboxbeschränkungen ist eine Freigabe für den Browserstart nötig. Die Tests prüfen Offline-Neustart, Turnier/Archiv, alle Flaggen, Cachefehler und manuelle Versionswechsel mit Datenbestand. Die Test-Build-Markierung wird ausschließlich vom Test-Buildskript eingefügt; der Produktcode enthält dafür keine Sonderfälle. Icons lassen sich mit `node scripts/render-icons.mjs` aus `public/icons/source.svg` lokal neu rendern.

## HTTPS im privaten LAN

```sh
npm ci
npm run typecheck
npm run lint
npm test
npm run build
npm run test:e2e
# Nach manueller Zertifikatseinrichtung:
npm run serve:lan
# Optional, Pfade relativ zum Projektverzeichnis:
LAN_PORT=8443 LAN_TLS_CERT=.certs/lan-cert.pem LAN_TLS_KEY=.certs/lan-key.pem npm run serve:lan
```

`serve:lan` liefert den Build auf `0.0.0.0:8443` über HTTPS. Feste Adresse, passende SANs und auf dem Telefon vertrauenswürdige lokale CA gemäß [LAN-Anleitung](docs/lan-setup.md) einrichten. Der Start erzeugt weder Zertifikate noch Vertrauen. Ohne Build oder Schlüssel bricht er ab; es gibt keinen HTTP-Fallback.

`npm test -- tests/serve-lan.test.ts` prüft den echten HTTPS-Server mit kurzlebigen temporären Zertifikaten; dafür muss OpenSSL vorhanden sein. `npm run test:e2e` prüft alle Einstiegsrunden bis zum Archiv, 1/2/3 Satzsiege, Wiederaufnahme, langsame Speicherung, Tab-Sperre und PWA-Updates. Tests benötigen freie lokale Ports und einen startbaren Chromium-Browser.

Der HTTP-Entwicklungsserver bietet im LAN keinen sicheren Kontext. Für Smartphone-PWA-Prüfungen den HTTPS-Build verwenden. Offline- und Installationsbereitschaft hängen vom Browser und bestätigtem Cache ab. Ein anderer Hostname, Port oder Browser überträgt keine bestehenden Daten. Die [Abnahme](docs/acceptance.md) trennt automatisierte Ergebnisse von noch offenen echten Smartphone- und LAN-Prüfungen.
