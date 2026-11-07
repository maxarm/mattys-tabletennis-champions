# Lokaler HTTPS-Betrieb im Heimnetz

Die App speichert Turniere ausschließlich im Browser des jeweiligen Ursprungs. Verwende immer dieselbe LAN-Adresse und denselben Port. Ein Wechsel zwischen IP-Adresse und DNS-Name erzeugt einen anderen Browserursprung; IndexedDB-Daten werden dabei nicht übertragen.

## Feste Adresse und Serverstart

Reserviere im Router für den Rechner eine feste DHCP-Adresse oder richte im privaten Heimnetz einen stabilen DNS-Namen ein. Keine Portfreigabe am Router einrichten. Der Server ist unter `https://<LAN-IP>:8443/` erreichbar.

Node.js wird manuell installiert. Im Projektverzeichnis:

```sh
npm ci
npm run build
mkdir -p .certs
```

Der Server erwartet `.certs/lan-cert.pem` und `.certs/lan-key.pem`. Start mit `npm run serve:lan`; optional `LAN_PORT`, `LAN_TLS_CERT` und `LAN_TLS_KEY` setzen. Er liefert `dist/` statisch über HTTPS auf `0.0.0.0:8443`, prüft den Build und startet bei fehlendem Build oder Zertifikat mit einer Fehlermeldung. Er erzeugt keine Zertifikate und ändert keinen Systemvertrauensspeicher. `.certs/` ist in Git ignoriert.

## Lokale Zertifizierungsstelle und SAN

Das Zertifikat muss die verwendete IP-Adresse oder den Hostnamen als Subject Alternative Name (SAN) enthalten. Eine lokale Entwicklungs-CA kann mit dem separat manuell installierten Werkzeug [mkcert](https://github.com/FiloSottile/mkcert) erstellt werden. `mkcert -install` ändert den Vertrauensspeicher des Rechners; führe das nur bewusst und manuell aus. Das Projekt führt mkcert nicht aus.

```sh
# Bewusster manueller Schritt: erstellt CA und installiert Rechnervertrauen
mkcert -install
mkcert -CAROOT
mkcert -cert-file .certs/lan-cert.pem -key-file .certs/lan-key.pem 192.168.1.20 tischtennis.home
```

Ersetze IP und DNS-Namen durch die reservierte Adresse. Übertrage ausschließlich das öffentliche Root-Zertifikat (`rootCA.pem`) auf das Telefon, niemals `rootCA-key.pem` oder den privaten Server-Schlüssel. Root-Zertifikate erteilen weitreichendes Vertrauen; entferne sie nach Ende der Nutzung wieder. Private Schlüssel bleiben lokal.

## Telefon: Zertifikat und Vertrauen

Übertrage das öffentliche Root-Zertifikat über ein vertrauenswürdiges lokales Verfahren. Öffne danach dieselbe HTTPS-Adresse wie im SAN.

- **iPhone/iPad:** Öffne das übertragene öffentliche CA-Zertifikat und installiere das geladene Profil in den Einstellungen. Unter „Einstellungen > Allgemein > Info > Zertifikatsvertrauenseinstellungen“ muss SSL-Vertrauen für manuell installierte Root-Zertifikate ausdrücklich aktiviert werden. [Apple-Anleitung](https://support.apple.com/en-ie/102390).
- **Android:** Hersteller und Version unterscheiden sich. Suche unter „Sicherheit & Datenschutz > Weitere Sicherheitseinstellungen > Verschlüsselung & Anmeldedaten > Zertifikat installieren“ nach „CA-Zertifikat“ (Bezeichnungen geräteabhängig), und wähle das öffentliche Root-Zertifikat. Keine WLAN-/Client-Zertifikate oder privaten Schlüssel für diesen HTTPS-Server importieren. Googles Pixel-Anleitung beschreibt die Installation eines WLAN-Zertifikats. Das belegt keine allgemeine HTTPS-Akzeptanz benutzerinstallierter CAs in jeder Android-Version oder jedem Browser. Prüfe die Anleitung für Gerät und Browser. [Google Pixel-Anleitung](https://support.google.com/pixelphone/answer/2844832?hl=en).

Bei Zertifikatswarnung nicht fortfahren und keine Warnung umgehen. Prüfe SAN, Hostname/IP, Gültigkeit, Kette und Vertrauenseinstellung. Die App bleibt auch ohne Installationsmöglichkeit im Browser nutzbar.

## Erreichbarkeit und Entwicklung

Rechner und Telefon müssen im selben privaten Netz sein; Gastnetz-/Client-Isolation kann den Zugriff verhindern. Erlaube eingehend nur den gewählten TCP-Port im privaten Netz der Rechner-Firewall. Unter WSL muss die Windows-/WSL-Netzkonfiguration den Port ebenfalls erreichbar machen; dafür wird hier nichts automatisch eingerichtet. Ein eigener DNS-Name muss auf dem Telefon auflösbar sein; ein Eintrag nur in der Rechner-Hostsdatei reicht nicht.

`npm run dev` bindet für UI-Entwicklung an `0.0.0.0:5173` (HTTP). Das Telefon kann diesen Port erreichen, erhält darüber im LAN jedoch keinen sicheren Kontext und keinen Produktions-Service-Worker. Für PWA-Abnahme nach Änderungen `npm run build` und `npm run serve:lan` mit unveränderter HTTPS-Adresse verwenden.

## Betrieb und Updates

Nach `npm run build` den vollständigen neuen `dist/`-Ordner bereitstellen. Der Server setzt `Cache-Control: no-store`, einschließlich `/sw.js`, damit Workerupdates die neue Version finden. Keine Teilkopie eines Builds stehen lassen. Stoppen mit Ctrl+C. Nur in einem vertrauenswürdigen privaten LAN betreiben.

Offline-Bereitschaft erscheint erst nach erfolgreichem Laden und Prüfen des vollständigen Service-Worker-Caches. Ein Offline-Erststart ohne vorherigen erfolgreichen Onlineaufruf ist nicht zugesichert. Daten bleiben an Browserprofil und Ursprung gebunden.

Quellen, Stand 7. November 2026: [Node.js HTTPS API](https://nodejs.org/api/https.html), [mkcert](https://github.com/FiloSottile/mkcert), [Apple Zertifikatsvertrauen](https://support.apple.com/en-ie/102390), [Google Pixel Zertifikate](https://support.google.com/pixelphone/answer/2844832?hl=en).
