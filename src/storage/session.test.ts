import { afterEach, expect, it, vi } from 'vitest'
import { waitFor } from '@testing-library/react'
import { openRepository } from './repository'
import { newSessionId, startSession, type SessionHandle, type SessionState } from './session'
const handles: SessionHandle[] = []
afterEach(async () => { await Promise.all(handles.splice(0).map(h => h.close())); vi.useRealTimers(); vi.restoreAllMocks() })
it('renews every five seconds and on focus/visibility; close releases and removes listeners', async () => {
  vi.useFakeTimers({ toFake: ['Date', 'setInterval', 'clearInterval'] })
  const repo = await openRepository({ name: 'session-events' })
  const states: SessionState[] = []
  const h = await startSession(repo, state => states.push(state), 'a'); handles.push(h)
  expect(states.at(-1)).toEqual({ status: 'writable' })
  await vi.advanceTimersByTimeAsync(10_000)
  expect(await repo.acquireSession('b')).toBe(false)
  await vi.advanceTimersByTimeAsync(10_000)
  expect(await repo.acquireSession('b')).toBe(false)
  window.dispatchEvent(new Event('focus'))
  document.dispatchEvent(new Event('visibilitychange'))
  await h.refresh()
  expect(states.at(-1)).toEqual({ status: 'writable' })
  await h.close()
  expect(await repo.acquireSession('b')).toBe(true)
  const length = states.length
  await vi.advanceTimersByTimeAsync(20_000)
  window.dispatchEvent(new Event('focus'))
  expect(states).toHaveLength(length)
  repo.close()
})
it('keeps a second tab readonly and reports lease loss after a suspended owner is replaced', async () => {
  let now = 0
  const repo = await openRepository({ name: 'session-takeover', now: () => now })
  const a: SessionState[] = [], b: SessionState[] = []
  const first = await startSession(repo, s => a.push(s), 'a'); handles.push(first)
  const second = await startSession(repo, s => b.push(s), 'b'); handles.push(second)
  expect(b.at(-1)).toEqual({ status: 'readonly' })
  now = 15_000
  await second.refresh()
  expect(b.at(-1)).toEqual({ status: 'writable' })
  await first.refresh()
  expect(a.at(-1)).toEqual({ status: 'readonly' })
  await first.close(); await second.close(); repo.close()
})
it('reports renewal errors and best-effort release failures without unhandled rejections', async () => {
  const repo = await openRepository({ name: 'session-error' })
  const states: SessionState[] = []
  const h = await startSession(repo, s => states.push(s), 'a'); handles.push(h)
  vi.spyOn(repo, 'renewSession').mockRejectedValue(new Error('Speicher gesperrt'))
  await h.refresh()
  expect(states.at(-1)).toEqual({ status: 'error', message: 'Speicher gesperrt' })
  vi.spyOn(repo, 'releaseSession').mockRejectedValue(new Error('Geschlossen'))
  await expect(h.close()).resolves.toBeUndefined()
  repo.close()
})
it('uses randomUUID when present and getRandomValues otherwise', () => {
  const randomUUID = vi.spyOn(crypto, 'randomUUID').mockReturnValue('11111111-1111-4111-8111-111111111111')
  expect(newSessionId()).toBe('11111111-1111-4111-8111-111111111111')
  randomUUID.mockRestore()
  vi.stubGlobal('crypto', { getRandomValues: (bytes: Uint8Array) => bytes.fill(171) })
  try { expect(newSessionId()).toBe('ab'.repeat(16)) } finally { vi.unstubAllGlobals() }
})

it('focus and visible events extend the actual lease; pagehide releases it', async () => {
  let now = 0
  const repo = await openRepository({ name: 'session-browser-events', now: () => now })
  const states: SessionState[] = []
  const h = await startSession(repo, state => states.push(state), 'a'); handles.push(h)
  now = 14_000
  window.dispatchEvent(new Event('focus'))
  await waitFor(() => expect(states).toHaveLength(2))
  now = 16_000
  expect(await repo.acquireSession('b')).toBe(false)
  now = 28_000
  document.dispatchEvent(new Event('visibilitychange'))
  await waitFor(() => expect(states).toHaveLength(3))
  now = 30_000
  expect(await repo.acquireSession('b')).toBe(false)
  window.dispatchEvent(new Event('pagehide'))
  await waitFor(async () => expect(await repo.acquireSession('b')).toBe(true))
  await h.close(); repo.close()
})
