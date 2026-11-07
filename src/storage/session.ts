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
  let owned = false
  let queue = Promise.resolve()
  const refresh = () => {
    queue = queue.then(async () => {
      if (closed) return
      try {
        owned = await (owned ? repository.renewSession(id) : repository.acquireSession(id))
        if (!closed) onChange({ status: owned ? 'writable' : 'readonly' })
      } catch (error) {
        owned = false
        if (!closed) onChange({ status: 'error', message: error instanceof Error ? error.message : 'Schreibfreigabe konnte nicht erneuert werden.' })
      }
    })
    return queue
  }
  await refresh()
  const onFocus = () => { void refresh() }
  const onVisibility = () => { if (document.visibilityState === 'visible') void refresh() }
  const timer = setInterval(onFocus, 5_000)
  window.addEventListener('focus', onFocus)
  document.addEventListener('visibilitychange', onVisibility)
  const close = async () => {
    if (closed) return
    closed = true
    clearInterval(timer)
    window.removeEventListener('focus', onFocus)
    document.removeEventListener('visibilitychange', onVisibility)
    window.removeEventListener('pagehide', onClose)
    await queue
    await repository.releaseSession(id).catch(() => {})
  }
  const onClose = () => { void close() }
  window.addEventListener('pagehide', onClose)
  return { id, refresh, close }
}
