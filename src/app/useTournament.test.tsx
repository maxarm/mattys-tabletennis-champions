import { StrictMode } from 'react'
import { act, renderHook, waitFor } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'
import { openRepository, type TournamentRepository } from '../storage/repository'
import { createTournament } from '../domain/tournament'
import { context } from '../../tests/fixtures'
import { useTournament } from './useTournament'

let sequence = 0
const repos: TournamentRepository[] = []
afterEach(() => { repos.splice(0).forEach(r => r.close()); vi.useRealTimers(); vi.restoreAllMocks() })
async function setup(now?: () => number) {
  const repo = await openRepository({ name: `hook-${++sequence}`, context: context(), now }); repos.push(repo)
  const t = createTournament({ entryRound: 'final', winsRequired: 1 }, context())
  await repo.acquireSession('seed'); await repo.create(t, 'seed'); await repo.releaseSession('seed')
  const hook = renderHook(() => useTournament(repo, { sessionId: 'editor' }))
  return { repo, t, matchId: t.rounds[0].matches[0].id, ...hook }
}
function deferred() { let resolve!: () => void; const promise = new Promise<void>(r => { resolve = r }); return { promise, resolve } }
it('loads the active tournament and saves drafts after 250ms or blur', async () => {
  const { result, repo, t, matchId } = await setup()
  await waitFor(() => expect(result.current.tournament).toEqual(t))
  await waitFor(() => expect(result.current.session).toBe('writable'))
  vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] })
  act(() => result.current.editDraft(matchId, [['1', '']]))
  expect(result.current.drafts[matchId]).toEqual([['1', '']])
  await act(async () => { await vi.advanceTimersByTimeAsync(249) })
  expect((await repo.loadActive())?.revision).toBe(0)
  await act(async () => { await vi.advanceTimersByTimeAsync(1); await result.current.flush() })
  expect((await repo.loadActive())?.rounds[0].matches[0].draft).toEqual([['1', '']])
  expect(result.current.status).toBe('saved')
  act(() => result.current.editDraft(matchId, [['2', '']]))
  await act(async () => { await result.current.blur() })
  expect((await repo.loadActive())?.rounds[0].matches[0].draft).toEqual([['2', '']])
})
it('serializes overlapping saves and does not replace newer text with an older response', async () => {
  const { result, repo, matchId } = await setup()
  await waitFor(() => expect(result.current.session).toBe('writable'))
  const gate = deferred()
  const original = repo.dispatch.bind(repo)
  let entered = false
  vi.spyOn(repo, 'dispatch').mockImplementationOnce(async (...args) => { entered = true; await gate.promise; return original(...args) })
  act(() => result.current.editDraft(matchId, [['1', '']]))
  let first!: Promise<void>
  act(() => { first = result.current.flush() })
  await waitFor(() => expect(entered).toBe(true))
  expect(result.current.message).toBe('Wird gespeichert')
  act(() => result.current.editDraft(matchId, [['11', '9']]))
  let second!: Promise<void>
  act(() => { second = result.current.flush() })
  expect(result.current.drafts[matchId]).toEqual([['11', '9']])
  await act(async () => { gate.resolve(); await Promise.all([first, second]) })
  expect((await repo.loadActive())?.rounds[0].matches[0].draft).toEqual([['11', '9']])
  expect(result.current.tournament?.revision).toBe(2)
  expect(result.current.status).toBe('saved')
})
it('flushes before completion and archive; duplicate operation IDs archive once', async () => {
  const { result, repo, matchId } = await setup()
  await waitFor(() => expect(result.current.session).toBe('writable'))
  act(() => result.current.editDraft(matchId, [['11', '9']]))
  await act(async () => { await result.current.dispatch({ type: 'completeMatch', matchId, sets: [['11', '9']] }) })
  expect(result.current.tournament?.status).toBe('finished')
  expect(result.current.tournament?.revision).toBe(2)
  await act(async () => {
    await Promise.all([result.current.dispatch({ type: 'archive' }, 'archive'), result.current.dispatch({ type: 'archive' }, 'archive')])
  })
  expect(await repo.loadActive()).toBeUndefined()
  expect(result.current.archives).toHaveLength(1)
})
it('keeps failed inputs and retries using the same operation ID after an uncertain response', async () => {
  const { result, repo, matchId } = await setup()
  await waitFor(() => expect(result.current.session).toBe('writable'))
  const original = repo.dispatch.bind(repo)
  vi.spyOn(repo, 'dispatch').mockImplementationOnce(async (...args) => { await original(...args); throw new Error('Antwort unterbrochen') })
  act(() => result.current.editDraft(matchId, [['11', '']]))
  await act(async () => { await expect(result.current.flush()).rejects.toThrow('Antwort unterbrochen') })
  expect(result.current.drafts[matchId]).toEqual([['11', '']])
  expect(result.current.status).toBe('error')
  expect(result.current.error).toContain('Antwort unterbrochen')
  await act(async () => { await result.current.flush() })
  expect(result.current.status).toBe('saved')
  expect(result.current.tournament?.revision).toBe(1)
})
it('preserves input and blocks transitions when the lease has been lost', async () => {
  const { result, repo, matchId } = await setup()
  await waitFor(() => expect(result.current.session).toBe('writable'))
  await repo.releaseSession('editor'); await repo.acquireSession('other')
  act(() => result.current.editDraft(matchId, [['11', '9']]))
  await act(async () => { await expect(result.current.dispatch({ type: 'completeMatch', matchId, sets: [['11', '9']] })).rejects.toThrow(/Tab/) })
  expect(result.current.drafts[matchId]).toEqual([['11', '9']])
  expect(result.current.status).toBe('error')
  expect(result.current.session).toBe('readonly')
  expect((await repo.loadActive())?.revision).toBe(0)
})
it('opens additional hooks readonly, cleans up, and resumes finished active tournaments', async () => {
  const { result, repo, matchId, unmount } = await setup()
  await waitFor(() => expect(result.current.session).toBe('writable'))
  const other = renderHook(() => useTournament(repo, { sessionId: 'other' }))
  await waitFor(() => expect(other.result.current.session).toBe('readonly'))
  expect(other.result.current.tournament?.status).toBe('playing')
  other.unmount()
  await act(async () => { await result.current.dispatch({ type: 'completeMatch', matchId, sets: [['11', '9']] }) })
  unmount()
  await waitFor(async () => expect(await repo.acquireSession('resumed')).toBe(true))
  const resumed = renderHook(() => useTournament(repo, { sessionId: 'resumed' }))
  await waitFor(() => expect(resumed.result.current.tournament?.status).toBe('finished'))
})
it('surfaces load failures without claiming saved state', async () => {
  const repo = await openRepository({ name: `hook-error-${++sequence}` }); repos.push(repo)
  vi.spyOn(repo, 'loadActive').mockRejectedValue(new Error('Unbekannte Datenversion'))
  const { result } = renderHook(() => useTournament(repo))
  await waitFor(() => expect(result.current.status).toBe('error'))
  expect(result.current.error).toBe('Unbekannte Datenversion')
})

it('keeps ownership through React StrictMode effect replay', async () => {
  const repo = await openRepository({ name: `strict-${++sequence}` }); repos.push(repo)
  const { result } = renderHook(() => useTournament(repo, { sessionId: 'strict' }), { wrapper: StrictMode })
  await waitFor(() => expect(result.current.status).toBe('saved'))
  const t = createTournament({ entryRound: 'final', winsRequired: 1 }, context())
  await act(async () => { await expect(result.current.create(t)).resolves.toEqual(t) })
  expect(await repo.loadActive()).toEqual(t)
})
it('recovers an uncertain autosave before saving newer text without a revision conflict', async () => {
  const { result, repo, matchId } = await setup()
  await waitFor(() => expect(result.current.session).toBe('writable'))
  const original = repo.dispatch.bind(repo)
  vi.spyOn(repo, 'dispatch').mockImplementationOnce(async (...args) => { await original(...args); throw new Error('Antwort unterbrochen') })
  act(() => result.current.editDraft(matchId, [['1', '']]))
  await act(async () => { await expect(result.current.flush()).rejects.toThrow() })
  act(() => result.current.editDraft(matchId, [['11', '9']]))
  await act(async () => { await expect(result.current.flush()).resolves.toBeUndefined() })
  expect((await repo.loadActive())?.rounds[0].matches[0].draft).toEqual([['11', '9']])
  expect(result.current.tournament?.revision).toBe(2)
})
it('retains draft and blocks navigation after revision conflict without overwriting another editor', async () => {
  const { result, repo, t, matchId } = await setup()
  await waitFor(() => expect(result.current.session).toBe('writable'))
  await repo.dispatch(t.id, 0, 'external', { type: 'saveDraft', matchId, sets: [['5', '']] }, 'editor')
  act(() => result.current.editDraft(matchId, [['8', '']]))
  await act(async () => { await expect(result.current.flush()).rejects.toThrow(/geändert/) })
  expect(result.current.drafts[matchId]).toEqual([['8', '']])
  expect(result.current.status).toBe('error')
  expect((await repo.loadActive())?.rounds[0].matches[0].draft).toEqual([['5', '']])
})
it('creates and discards only active tournaments and keeps archives in state', async () => {
  const repo = await openRepository({ name: `new-${++sequence}` }); repos.push(repo)
  const { result } = renderHook(() => useTournament(repo))
  await waitFor(() => expect(result.current.status).toBe('saved'))
  const t = createTournament({ entryRound: 'final', winsRequired: 1 }, context())
  await act(async () => { await result.current.create(t) })
  await act(async () => { await result.current.discardActive() })
  expect(result.current.tournament).toBeUndefined()
  expect(await repo.loadActive()).toBeUndefined()
})

it('does not claim a saved state after initial session acquisition failed', async () => {
  const repo = await openRepository({ name: `lease-error-${++sequence}` }); repos.push(repo)
  vi.spyOn(repo, 'acquireSession').mockRejectedValue(new Error('Schreibfreigabe fehlgeschlagen'))
  const { result } = renderHook(() => useTournament(repo))
  await waitFor(() => expect(result.current.session).toBe('error'))
  expect(result.current.status).toBe('error')
  expect(result.current.error).toBe('Schreibfreigabe fehlgeschlagen')
})

it('rejects an advanced dedup snapshot after a lost response and lease takeover without rebasing newer local edits', async () => {
  let now = 0
  const { result, repo, t, matchId } = await setup(() => now)
  await waitFor(() => expect(result.current.status).toBe('saved'))
  const original = repo.dispatch.bind(repo)
  vi.spyOn(repo, 'dispatch').mockImplementationOnce(async (...args) => {
    await original(...args)
    throw new Error('Antwort unterbrochen')
  })
  act(() => result.current.editDraft(matchId, [['1', '']]))
  await act(async () => { await expect(result.current.flush()).rejects.toThrow('Antwort unterbrochen') })
  act(() => result.current.editDraft(matchId, [['11', '9']]))

  now = 15_000
  expect(await repo.acquireSession('other')).toBe(true)
  const foreign = await repo.dispatch(t.id, 1, 'foreign-edit', { type: 'saveDraft', matchId, sets: [['6', '4']] }, 'other')
  await repo.releaseSession('other')
  expect(await repo.acquireSession('editor')).toBe(true)

  await act(async () => { await expect(result.current.flush()).rejects.toThrow(/geändert/) })
  expect(result.current.drafts[matchId]).toEqual([['11', '9']])
  expect(result.current.tournament?.revision).toBe(0)
  expect(result.current.status).toBe('error')
  expect(await repo.loadActive()).toEqual(foreign)
  await act(async () => {
    await expect(result.current.dispatch({ type: 'completeMatch', matchId, sets: [['11', '9']] })).rejects.toThrow(/geändert/)
  })
  expect(await repo.loadActive()).toEqual(foreign)
})
it('reacquires on bfcache pageshow and saves through the same mounted hook', async () => {
  const { result, repo, matchId } = await setup()
  await waitFor(() => expect(result.current.status).toBe('saved'))
  act(() => window.dispatchEvent(new PageTransitionEvent('pagehide', { persisted: true })))
  await waitFor(async () => expect(await repo.acquireSession('other')).toBe(true))
  expect(result.current.session).toBe('readonly')
  await repo.releaseSession('other')
  act(() => window.dispatchEvent(new PageTransitionEvent('pageshow', { persisted: true })))
  await waitFor(() => expect(result.current.session).toBe('writable'))
  act(() => result.current.editDraft(matchId, [['8', '']]))
  await act(async () => { await expect(result.current.flush()).resolves.toBeUndefined() })
  expect((await repo.loadActive())?.rounds[0].matches[0].draft).toEqual([['8', '']])
})
