export type PwaStatus = 'unsupported' | 'caching' | 'ready' | 'updateAvailable' | 'error'
export interface PwaController {
  getStatus(): PwaStatus
  subscribe(listener: () => void): () => void
  applyUpdate(): Promise<void>
  dispose(): void
}
export function registerPwa(): PwaController {
  let status: PwaStatus = 'unsupported'
  const listeners = new Set<() => void>()
  const cleanups: (() => void)[] = []
  let registration: ServiceWorkerRegistration | undefined
  let disposed = false
  let applying = false
  let cancelUpdate: (() => void) | undefined
  const publish = (next: PwaStatus) => { if (!disposed) { status = next; listeners.forEach(fn => fn()) } }
  const listen = (target: EventTarget, event: string, fn: EventListener) => {
    target.addEventListener(event, fn)
    cleanups.push(() => target.removeEventListener(event, fn))
  }
  if (globalThis.isSecureContext && 'serviceWorker' in navigator) {
    status = 'caching'
    const sw = navigator.serviceWorker
    const check = () => sw.controller?.postMessage({ type: 'CHECK_OFFLINE' })
    listen(sw, 'controllerchange', () => { check() })
    listen(sw, 'message', event => {
      const message = event as MessageEvent
      if (message.source !== sw.controller) return
      if (message.data?.type === 'OFFLINE_READY') publish(registration?.waiting ? 'updateAvailable' : 'ready')
      if (message.data?.type === 'OFFLINE_ERROR') publish('error')
    })
    void sw.register('/sw.js', { updateViaCache: 'none' }).then(reg => {
      if (disposed) return
      registration = reg
      const watch = () => {
        const worker = reg.installing
        if (!worker) return
        listen(worker, 'statechange', () => {
          if (worker.state === 'installed' && reg.waiting) publish('updateAvailable')
          if (worker.state === 'redundant' && !reg.waiting) { if (sw.controller) check(); else publish('error') }
        })
      }
      listen(reg, 'updatefound', watch)
      watch()
      if (reg.waiting) publish('updateAvailable')
      check()
      listen(window, 'focus', () => { void reg.update().catch(() => {}) })
    }).catch(() => publish('error'))
  }
  return {
    getStatus: () => status,
    subscribe(fn) { listeners.add(fn); return () => { listeners.delete(fn) } },
    async applyUpdate() {
      if (!registration?.waiting || applying) throw new Error('Keine Aktualisierung bereit.')
      applying = true
      const sw = navigator.serviceWorker
      await new Promise<void>((resolve, reject) => {
        const cleanup = () => {
          clearTimeout(timeout)
          sw.removeEventListener('controllerchange', changed)
          cancelUpdate = undefined
        }
        const fail = (error: Error) => { cleanup(); applying = false; reject(error) }
        const changed = () => { cleanup(); resolve(); window.location.reload() }
        const timeout = setTimeout(() => fail(new Error('Aktualisierung nicht bestätigt. Bitte erneut versuchen.')), 15000)
        cancelUpdate = () => fail(new Error('Aktualisierung abgebrochen.'))
        sw.addEventListener('controllerchange', changed)
        try { registration!.waiting!.postMessage({ type: 'APPLY_UPDATE' }) }
        catch (error) { fail(error instanceof Error ? error : new Error('Aktualisierung fehlgeschlagen.')) }
      })
    },
    dispose() { disposed = true; cancelUpdate?.(); cleanups.forEach(fn => fn()); listeners.clear() },
  }
}
