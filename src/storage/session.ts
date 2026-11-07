import type { TournamentRepository } from './repository'

/** UUID support is optional in LAN browsers; getRandomValues also works outside secure contexts. */
export function newSessionId(): string {
  if (typeof globalThis.crypto?.randomUUID === 'function') return globalThis.crypto.randomUUID()
  if (typeof globalThis.crypto?.getRandomValues !== 'function') throw new Error('Dieser Browser kann keine sicheren Sitzungs-IDs erzeugen.')
  return Array.from(globalThis.crypto.getRandomValues(new Uint8Array(16)), n => n.toString(16).padStart(2, '0')).join('')
}

export type SessionState = { status: 'writable' | 'readonly' } | { status: 'error'; message: string }
export interface SessionHandle { readonly id: string; refresh(): Promise<void>; close(): Promise<void> }
export async function startSession(repository: TournamentRepository, onChange: (state: SessionState) => void, id = newSessionId()): Promise<SessionHandle> {
  let closed = false
  let paused = false
  let generation = 0
  let owned = false
  let queue = Promise.resolve()
  let timer: ReturnType<typeof setInterval> | undefined
  const refresh = () => {
    const requestedGeneration = generation
    queue = queue.then(async () => {
      if (closed || paused || requestedGeneration !== generation) return
      try {
        const acquired = await (owned ? repository.renewSession(id) : repository.acquireSession(id))
        if (!closed && !paused && requestedGeneration === generation) {
          owned = acquired
          onChange({ status: owned ? 'writable' : 'readonly' })
        }
      } catch (error) {
        if (!closed && !paused && requestedGeneration === generation) {
          owned = false
          onChange({ status: 'error', message: error instanceof Error ? error.message : 'Schreibfreigabe konnte nicht erneuert werden.' })
        }
      }
    })
    return queue
  }
  const release = () => {
    // Release must finish after older acquire/renew work and before a resume acquire.
    queue = queue.then(() => repository.releaseSession(id).catch(() => {}))
    return queue
  }
  const stopTimer = () => { clearInterval(timer); timer = undefined }
  const startTimer = () => { if (timer === undefined) timer = setInterval(() => { void refresh() }, 5_000) }
  const onFocus = () => { void refresh() }
  const onVisibility = () => { if (document.visibilityState === 'visible') void refresh() }
  const onHide = () => {
    if (closed || paused) return
    paused = true
    generation++
    owned = false
    stopTimer()
    onChange({ status: 'readonly' })
    void release()
  }
  const onShow = () => {
    if (closed) return
    if (paused) {
      paused = false
      generation++
      owned = false
    }
    startTimer()
    void refresh()
  }
  const close = () => {
    if (closed) return queue
    closed = true
    generation++
    owned = false
    stopTimer()
    window.removeEventListener('focus', onFocus)
    document.removeEventListener('visibilitychange', onVisibility)
    window.removeEventListener('pagehide', onHide)
    window.removeEventListener('pageshow', onShow)
    return release()
  }
  // Observe lifecycle changes even while the initial acquire is still pending.
  window.addEventListener('focus', onFocus)
  document.addEventListener('visibilitychange', onVisibility)
  window.addEventListener('pagehide', onHide)
  window.addEventListener('pageshow', onShow)
  startTimer()
  await refresh()
  return { id, refresh, close }
}
