import { useCallback, useEffect, useRef, useState } from 'react'
import type { TournamentRepository } from '../storage/repository'
import { storageMessage, StorageError } from '../storage/repository'
import { newSessionId, startSession, type SessionState } from '../storage/session'
import type { DraftSet, Tournament, TournamentCommand } from '../domain/types'

export interface UseTournamentOptions { sessionId?: string }
export type SaveStatus = 'loading' | 'saved' | 'dirty' | 'saving' | 'error'
interface PendingDraft { sets: readonly DraftSet[]; operationId: string }

/** Supply one stable repository per mounted app. Await flush() before navigating. */
export function useTournament(repository: TournamentRepository, options: UseTournamentOptions = {}) {
  const [tournament, setTournament] = useState<Tournament>()
  const [archives, setArchives] = useState<Tournament[]>([])
  const [drafts, setDrafts] = useState<Record<string, readonly DraftSet[]>>({})
  const [status, setStatus] = useState<SaveStatus>('loading')
  const [error, setError] = useState<string>()
  const [session, setSession] = useState<SessionState['status'] | 'loading'>('loading')
  const current = useRef<Tournament | undefined>(undefined)
  const pending = useRef(new Map<string, PendingDraft>())
  const queue = useRef<Promise<unknown>>(Promise.resolve())
  const lifecycle = useRef<Promise<void>>(Promise.resolve())
  const unacknowledged = useRef<{ tournamentId: string; revision: number; matchId: string; draft: PendingDraft } | undefined>(undefined)
  const sessionId = useRef<string | undefined>(undefined)
  const live = useRef(false)
  const ready = useRef(false)
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  const reportError = useCallback((reason: unknown) => {
    if (!live.current) return
    setStatus('error')
    setError(storageMessage(reason))
    if (reason instanceof StorageError && reason.code === 'LEASE_LOST') setSession('readonly')
  }, [])
  const publish = useCallback((t: Tournament | undefined) => {
    current.current = t
    if (live.current) setTournament(t)
  }, [])
  const publishDrafts = useCallback(() => {
    if (live.current) setDrafts(Object.fromEntries([...pending.current].map(([id, p]) => [id, p.sets])))
  }, [])
  const enqueue = useCallback(<T,>(action: () => Promise<T>): Promise<T> => {
    const task = queue.current.then(async () => {
      if (!live.current || !ready.current || !sessionId.current) throw new Error('Das Turnier ist noch nicht bereit.')
      setStatus('saving')
      try {
        const result = await action()
        if (live.current) { setStatus(pending.current.size ? 'dirty' : 'saved'); setError(undefined) }
        return result
      } catch (reason) { reportError(reason); throw reason }
    })
    queue.current = task.catch(() => {})
    return task
  }, [reportError])
  const savePending = useCallback(async () => {
    if (timer.current) clearTimeout(timer.current)
    timer.current = undefined
    while (pending.current.size || unacknowledged.current) {
      if (!unacknowledged.current) {
        const [matchId, draft] = pending.current.entries().next().value!
        const t = current.current
        if (!t) throw new Error('Es gibt kein aktives Turnier.')
        unacknowledged.current = { tournamentId: t.id, revision: t.revision, matchId, draft }
      }
      const { tournamentId, revision, matchId, draft } = unacknowledged.current
      const saved = await repository.dispatch(tournamentId, revision, draft.operationId, { type: 'saveDraft', matchId, sets: draft.sets }, sessionId.current!)
      publish(saved)
      unacknowledged.current = undefined
      // A response for an older edit must never erase the latest visible text.
      if (pending.current.get(matchId) === draft) pending.current.delete(matchId)
      publishDrafts()
    }
  }, [repository, publish, publishDrafts])
  const flush = useCallback(() => enqueue(savePending), [enqueue, savePending])
  const editDraft = useCallback((matchId: string, sets: readonly DraftSet[]) => {
    pending.current.set(matchId, { sets: sets.map(([a, b]) => [a, b] as const), operationId: newSessionId() })
    publishDrafts()
    setStatus('dirty')
    if (timer.current) clearTimeout(timer.current)
    timer.current = setTimeout(() => { void flush().catch(() => {}) }, 250)
  }, [flush, publishDrafts])
  const dispatch = useCallback((command: TournamentCommand, operationId = newSessionId()) => enqueue(async () => {
    await savePending()
    const t = current.current
    if (!t) throw new Error('Es gibt kein aktives Turnier.')
    const saved = await repository.dispatch(t.id, t.revision, operationId, command, sessionId.current!)
    publish(saved)
    if (saved.status === 'archived') {
      const listed = await repository.listArchives()
      if (live.current) setArchives(listed)
    }
    return saved
  }), [enqueue, savePending, repository, publish])
  const create = useCallback((t: Tournament) => enqueue(async () => {
    await savePending()
    const saved = await repository.create(t, sessionId.current!)
    publish(saved)
    return saved
  }), [enqueue, savePending, repository, publish])
  const discardActive = useCallback(() => enqueue(async () => {
    await savePending()
    const t = current.current
    if (!t) throw new Error('Es gibt kein aktives Turnier.')
    await repository.discardActive(t.id, t.revision, sessionId.current!)
    publish(undefined)
  }), [enqueue, savePending, repository, publish])
  const reload = useCallback(() => enqueue(async () => {
    // Reload never silently drops local text or rebases it over a different revision.
    if (pending.current.size) throw new Error('Es gibt ungespeicherte Eingaben. Bitte zuerst erneut speichern.')
    const [t, listed] = await Promise.all([repository.loadActive(), repository.listArchives()])
    publish(t)
    if (live.current) setArchives(listed)
  }), [enqueue, repository, publish])

  useEffect(() => {
    live.current = true
    ready.current = false
    let cancelled = false
    let close: (() => Promise<void>) | undefined
    async function initialize() {
      try {
        const id = options.sessionId ?? newSessionId()
        sessionId.current = id
        let sessionError: string | undefined
        const handle = await startSession(repository, state => {
          if (!cancelled) {
            setSession(state.status)
            if (state.status === 'error') { sessionError = state.message; reportError(new Error(state.message)) }
          }
        }, id)
        if (cancelled) { await handle.close(); return }
        close = handle.close
        const [t, listed] = await Promise.all([repository.loadActive(), repository.listArchives()])
        if (cancelled) return
        publish(t)
        setArchives(listed)
        ready.current = true
        if (!sessionError) setStatus('saved')
      } catch (reason) { if (!cancelled) reportError(reason) }
    }
    const startup = lifecycle.current.then(initialize)
    lifecycle.current = startup
    return () => {
      cancelled = true
      live.current = false
      ready.current = false
      if (timer.current) clearTimeout(timer.current)
      // Allow already-started transactions to settle before releasing ownership.
      lifecycle.current = startup.then(async () => {
        await queue.current
        await close?.()
      }).catch(() => {})
    }
  }, [repository, options.sessionId, publish, reportError])

  const message = status === 'saving' ? 'Wird gespeichert' : status === 'saved' ? 'Gespeichert' : status === 'dirty' ? 'Ungespeicherte Eingaben' : status === 'loading' ? 'Wird geladen' : error ?? 'Speichern fehlgeschlagen'
  return { tournament, archives, drafts, status, message, error, session, editDraft, flush, blur: flush, dispatch, create, discardActive, reload }
}
