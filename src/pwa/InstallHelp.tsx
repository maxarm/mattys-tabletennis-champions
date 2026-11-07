import { useEffect, useState, useSyncExternalStore } from 'react'
import type { PwaController } from './client'
interface InstallEvent extends Event { prompt(): Promise<void>; userChoice: Promise<{ outcome: string }> }
export function InstallHelp({ controller, blocked, onUpdate }: { controller: PwaController; blocked: boolean; onUpdate: () => void }) {
  const status = useSyncExternalStore(controller.subscribe, controller.getStatus)
  const [install, setInstall] = useState<InstallEvent>()
  const [later, setLater] = useState(false)
  useEffect(() => {
    const offer = (event: Event) => { event.preventDefault(); setInstall(event as InstallEvent) }
    const installed = () => setInstall(undefined)
    window.addEventListener('beforeinstallprompt', offer)
    window.addEventListener('appinstalled', installed)
    return () => { window.removeEventListener('beforeinstallprompt', offer); window.removeEventListener('appinstalled', installed) }
  }, [])
  const apple = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
  return <aside className="pwa-panel" aria-label="App und Offlinebetrieb">
    <p role="status">{status === 'unsupported' ? 'Offlinebetrieb benötigt einen sicheren Kontext und Service-Worker-Unterstützung.' : status === 'caching' ? 'Offline-Dateien werden vorbereitet …' : status === 'error' ? 'Offline-Dateien konnten nicht vollständig bestätigt werden. Bitte online erneut öffnen.' : status === 'updateAvailable' ? 'Neue Version verfügbar.' : 'Offline bereit auf diesem Gerät.'}</p>
    {status === 'updateAvailable' && <>
      <p>Eine neue Version ist bereit.{blocked ? ' Aktualisieren ist nach Verlassen des Spiels und erfolgreichem Speichern möglich.' : ' Deine Eingaben werden vor dem Neustart gespeichert.'}</p>
      {!later && <button disabled={blocked} onClick={onUpdate}>Jetzt aktualisieren</button>}
      <button onClick={() => setLater(value => !value)}>{later ? 'Update anzeigen' : 'Später'}</button>
    </>}
    {(status === 'ready' || status === 'updateAvailable') && install && <button onClick={() => { const offer = install; setInstall(undefined); void offer.prompt().catch(() => {}) }}>App installieren</button>}
    {apple && status !== 'unsupported' && <p>In Safari kannst du über „Teilen“ → „Zum Home-Bildschirm“ eine Verknüpfung hinzufügen, sofern dein Browser dies anbietet.</p>}
  </aside>
}
