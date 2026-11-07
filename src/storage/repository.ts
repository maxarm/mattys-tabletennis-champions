import { openDB, type DBSchema, type IDBPTransaction } from 'idb'
import { applyCommand } from '../domain/tournament'
import { parseTournament } from './schema'
import { newSessionId } from './session'
import type { GenerationContext, Tournament, TournamentCommand } from '../domain/types'
export interface RepositoryOptions { name?: string; now?: () => number; context?: GenerationContext }
export interface TournamentRepository {
  loadActive(): Promise<Tournament | undefined>
  listArchives(): Promise<Tournament[]>
  loadById(id: string): Promise<Tournament | undefined>
  create(t: Tournament, sessionId: string): Promise<Tournament>
  dispatch(id: string, expectedRevision: number, operationId: string, command: TournamentCommand, sessionId: string): Promise<Tournament>
  discardActive(id: string, expectedRevision: number, sessionId: string): Promise<void>
  acquireSession(sessionId: string): Promise<boolean>
  renewSession(sessionId: string): Promise<boolean>
  releaseSession(sessionId: string): Promise<void>
  close(): void
}

interface Lease { sessionId: string; expiresAt: number }
interface Database extends DBSchema {
  tournaments: { key: string; value: Tournament }
  meta: { key: string; value: string | Lease }
  operations: { key: [string, string]; value: { tournamentId: string; operationId: string } }
}
export const LEASE_MS = 15_000
export class StorageError extends Error {
  constructor(public readonly code: 'LEASE_LOST' | 'REVISION_CONFLICT' | 'INVALID_ACTION' | 'STORAGE', message: string) { super(message) }
}
export function storageMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Speichern fehlgeschlagen. Bitte erneut versuchen.'
}
export async function openRepository(options: RepositoryOptions = {}): Promise<TournamentRepository> {
  const now = options.now ?? Date.now
  const ctx = options.context ?? { random: Math.random, newId: newSessionId, now: () => new Date(now()).toISOString() }
  const db = await openDB<Database>(options.name ?? 'mattys-table-tennis', 1, {
    upgrade(database) {
      database.createObjectStore('tournaments', { keyPath: 'id' })
      database.createObjectStore('meta')
      database.createObjectStore('operations', { keyPath: ['tournamentId', 'operationId'] })
    },
    blocking() { db.close() },
  }).catch((error: unknown) => {
    if (error instanceof DOMException && error.name === 'VersionError')
      throw new StorageError('STORAGE', 'Unbekannte Datenbankversion. Bitte eine passende App-Version verwenden; die Daten bleiben erhalten.')
    throw new StorageError('STORAGE', 'Der lokale Speicher konnte nicht geöffnet werden. Bitte Browserfreigabe prüfen und erneut versuchen.')
  })
  type Tx = IDBPTransaction<Database, ['tournaments', 'meta', 'operations'], 'readwrite'>
  async function atomic<T>(action: (tx: Tx) => Promise<T>): Promise<T> {
    const tx = db.transaction(['tournaments', 'meta', 'operations'], 'readwrite')
    try {
      const result = await action(tx)
      await tx.done
      return result
    } catch (error) {
      try { tx.abort() } catch { /* May already have aborted or completed. */ }
      await tx.done.catch(() => {})
      if (error instanceof DOMException) throw new StorageError('STORAGE', 'Speichern fehlgeschlagen. Bitte Speicherplatz und Browserfreigabe prüfen und erneut versuchen.')
      throw error
    }
  }
  async function assertOwner(tx: Tx, sessionId: string) {
    const lease = await tx.objectStore('meta').get('lease')
    if (typeof lease !== 'object' || lease.sessionId !== sessionId || lease.expiresAt <= now())
      throw new StorageError('LEASE_LOST', 'Ein anderer Tab bearbeitet das Turnier oder die Schreibfreigabe ist abgelaufen. Eingaben bleiben sichtbar.')
  }
  async function getTournament(tx: Tx, id: string) {
    const value = await tx.objectStore('tournaments').get(id)
    if (!value) throw new StorageError('INVALID_ACTION', 'Das Turnier wurde nicht gefunden.')
    return parseTournament(value)
  }
  function checkRevision(t: Tournament, expected: number) {
    if (t.revision !== expected) throw new StorageError('REVISION_CONFLICT', 'Das Turnier wurde in einem anderen Tab geändert. Bitte neu laden; ungespeicherte Eingaben bleiben sichtbar.')
  }
  return {
    async loadActive() {
      const tx = db.transaction(['meta', 'tournaments'])
      const id = await tx.objectStore('meta').get('active')
      const value = typeof id === 'string' ? await tx.objectStore('tournaments').get(id) : undefined
      await tx.done
      if (typeof id === 'string' && !value) throw new StorageError('STORAGE', 'Der Verweis auf das aktive Turnier ist beschädigt. Die Daten bleiben erhalten.')
      if (!value) return undefined
      const t = parseTournament(value)
      if (t.status === 'archived') throw new StorageError('STORAGE', 'Der aktive Turnierverweis ist widersprüchlich.')
      return t
    },
    async loadById(id) { const t = await db.get('tournaments', id); return t ? parseTournament(t) : undefined },
    async listArchives() { return (await db.getAll('tournaments')).map(parseTournament).filter(t => t.status === 'archived') },
    create(t, sessionId) {
      return atomic(async tx => {
        await assertOwner(tx, sessionId)
        // Never replace or silently discard data belonging to an unknown frontend version.
        const existing = await tx.objectStore('tournaments').getAll()
        existing.forEach(parseTournament)
        if (await tx.objectStore('meta').get('active') || await tx.objectStore('tournaments').get(t.id))
          throw new StorageError('INVALID_ACTION', 'Es gibt bereits ein aktives Turnier oder diese Turnier-ID.')
        const validated = parseTournament(t)
        if (validated.status === 'archived') throw new StorageError('INVALID_ACTION', 'Ein Archiv kann nicht als aktives Turnier angelegt werden.')
        await tx.objectStore('tournaments').put(validated)
        await tx.objectStore('meta').put(t.id, 'active')
        return validated
      })
    },
    dispatch(id, expectedRevision, operationId, command, sessionId) {
      return atomic(async tx => {
        await assertOwner(tx, sessionId)
        const t = await getTournament(tx, id)
        if (await tx.objectStore('operations').get([id, operationId])) return t
        checkRevision(t, expectedRevision)
        const active = await tx.objectStore('meta').get('active')
        if (t.status !== 'archived' && active !== id) throw new StorageError('INVALID_ACTION', 'Nur das aktive Turnier darf bearbeitet werden.')
        const next = parseTournament(applyCommand(t, command, ctx))
        await tx.objectStore('tournaments').put(next)
        if (next.status === 'archived' && active === id) await tx.objectStore('meta').delete('active')
        await tx.objectStore('operations').put({ tournamentId: id, operationId })
        return next
      })
    },
    discardActive(id, expectedRevision, sessionId) {
      return atomic(async tx => {
        await assertOwner(tx, sessionId)
        const t = await getTournament(tx, id)
        checkRevision(t, expectedRevision)
        if (await tx.objectStore('meta').get('active') !== id || t.status === 'archived')
          throw new StorageError('INVALID_ACTION', 'Nur das aktive Turnier kann verworfen werden.')
        await tx.objectStore('tournaments').delete(id)
        await tx.objectStore('meta').delete('active')
        const store = tx.objectStore('operations')
        let cursor = await store.openCursor(IDBKeyRange.bound([id, ''], [id, []]))
        while (cursor) { await cursor.delete(); cursor = await cursor.continue() }
      })
    },
    acquireSession(sessionId) {
      return atomic(async tx => {
        const lease = await tx.objectStore('meta').get('lease')
        if (typeof lease === 'object' && lease.sessionId !== sessionId && lease.expiresAt > now()) return false
        await tx.objectStore('meta').put({ sessionId, expiresAt: now() + LEASE_MS }, 'lease')
        return true
      })
    },
    renewSession(sessionId) {
      return atomic(async tx => {
        const lease = await tx.objectStore('meta').get('lease')
        if (typeof lease !== 'object' || lease.sessionId !== sessionId || lease.expiresAt <= now()) return false
        await tx.objectStore('meta').put({ sessionId, expiresAt: now() + LEASE_MS }, 'lease')
        return true
      })
    },
    releaseSession(sessionId) {
      return atomic(async tx => {
        const lease = await tx.objectStore('meta').get('lease')
        if (typeof lease === 'object' && lease.sessionId === sessionId) await tx.objectStore('meta').delete('lease')
      })
    },
    close() { db.close() },
  }
}
