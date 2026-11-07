# Matty’s Table Tennis Championships

Lokale deutschsprachige Begleitung echter Tischtennisspiele auf einem gemeinsamen Smartphone.

## Entwicklung (Task 1)

Node.js wird manuell installiert. Geprüft mit Node **26.13.0** und npm **11.20.0**.
Bei dieser lokalen Installation vor jedem Aufruf:

```sh
export PATH=/home/markus/.nvm/versions/node/v26.13.0/bin:$PATH
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

Aktuell enthält die App den Titel und den versionierten Katalog mit 23 Ländern, 69 festen Spielern und serialisierbaren Porträtdefinitionen. IDs (`de`, `de-1` usw.) bleiben bei künftigen Änderungen erhalten. Die Porträtdefinitionen sind fest ausgeschrieben; es gibt keine Zufallsquelle beim Laden oder Rendern. Die Länderfaktoren sind fiktive Spielbalance.

Die lokalen Flaggenpfade sind Katalogreferenzen; Flaggenassets und Porträtrenderer folgen in späteren Aufgaben. Speicherung, Turnierabläufe, HTTPS-Betrieb, Installation und Offline-Cache sind noch nicht implementiert. Es gibt derzeit keine Offline- oder Installationszusage. Der spätere HTTPS-LAN-Betrieb benötigt eine konstante Adresse und ein auf dem Smartphone vertrauenswürdiges Zertifikat mit passendem SAN. Ein Originwechsel übernimmt keine Browserdaten automatisch.

Testing Library, fake-indexeddb und Playwright sind für weitere Aufgaben vorbereitet; Browserabläufe und der statische HTTPS-LAN-Server erhalten ihre Skripte erst bei ihrer Implementierung. Buildausgaben, Abhängigkeiten, private Schlüssel, Zertifikate und lokale Umgebungsdateien werden nicht versioniert.
