import { afterEach, describe, expect, it, vi } from 'vitest'
import { openDB } from 'idb'
import { createTournament, applyCommand } from '../domain/tournament'
import type { EntryRound, Tournament, TournamentCommand } from '../domain/types'
import { context } from '../../tests/fixtures'
import { openRepository, type TournamentRepository } from './repository'

let sequence = 0
const opened: TournamentRepository[] = []
afterEach(() => { opened.forEach(r => r.close()); opened.length = 0; vi.restoreAllMocks() })
async function setup(entryRound: EntryRound = 'final') {
  const name = `repository-${++sequence}`
  let now = 1000
  const ctx = context()
  const repo = await openRepository({ name, now: () => now, context: ctx })
  opened.push(repo)
  await repo.acquireSession('a')
  const t = createTournament({ entryRound, winsRequired: 1 }, ctx)
  await repo.create(t, 'a')
  return { repo, t, name, ctx, tick: (n: number) => { now += n } }
}
async function send(repo: TournamentRepository, t: Tournament, command: TournamentCommand, op = `op-${++sequence}`) {
  return repo.dispatch(t.id, t.revision, op, command, 'a')
}
describe('transactional repository', () => {
  it('reopens the exact active snapshot including incomplete drafts', async () => {
    const { repo, t, name } = await setup()
    const saved = await send(repo, t, { type: 'saveDraft', matchId: t.rounds[0].matches[0].id, sets: [['1', '']] })
    repo.close()
    const reopened = await openRepository({ name }); opened.push(reopened)
    expect(await reopened.loadActive()).toEqual(saved)
    expect(saved.revision).toBe(1)
  })
  it('rejects stale revisions without overwriting the stored draft', async () => {
    const { repo, t } = await setup()
    const command = { type: 'saveDraft', matchId: t.rounds[0].matches[0].id, sets: [['8', '']] } as const
    const saved = await send(repo, t, command)
    await expect(send(repo, t, command)).rejects.toThrow(/geändert/)
    expect(await repo.loadActive()).toEqual(saved)
  })
  it('deduplicates operations before revision checks and returns the current snapshot', async () => {
    const { repo, t } = await setup()
    const command = { type: 'saveDraft', matchId: t.rounds[0].matches[0].id, sets: [['8', '']] } as const
    const saved = await send(repo, t, command, 'same')
    const newer = await send(repo, saved, { ...command, sets: [['9', '']] })
    expect(await send(repo, t, command, 'same')).toEqual(newer)
  })
  it('draws and archives once, resumes finished tournaments, preserves archived snapshots', async () => {
    const { repo, t } = await setup('semifinal')
    let current = t
    for (const m of t.rounds[0].matches) current = await send(repo, current, { type: 'completeMatch', matchId: m.id, sets: [['11', '9']] })
    const draw = { type: 'drawNextRound', roundId: t.rounds[0].id } as const
    const drawn = await send(repo, current, draw, 'draw')
    expect(await send(repo, current, draw, 'draw')).toEqual(drawn)
    expect(await send(repo, drawn, draw)).toEqual(drawn) // Domain idempotence does not increment revision.
    current = drawn
    for (const m of drawn.rounds[1].matches) current = await send(repo, current, { type: 'completeMatch', matchId: m.id, sets: [['11', '9']] })
    expect((await repo.loadActive())?.status).toBe('finished')
    const archived = await send(repo, current, { type: 'archive' }, 'archive')
    expect(await send(repo, current, { type: 'archive' }, 'archive')).toEqual(archived)
    expect(await send(repo, archived, { type: 'archive' })).toEqual(archived)
    expect(await repo.loadActive()).toBeUndefined()
    expect(await repo.listArchives()).toEqual([archived])
    await expect(repo.discardActive(archived.id, archived.revision, 'a')).rejects.toThrow()
    expect(await repo.loadById(archived.id)).toEqual(archived)
  })
  it('serializes simultaneous revision writes and permits only one active tournament', async () => {
    const { repo, t } = await setup()
    const command = { type: 'saveDraft', matchId: t.rounds[0].matches[0].id, sets: [['7', '']] } as const
    const results = await Promise.allSettled([send(repo, t, command), send(repo, t, command)])
    expect(results.filter(r => r.status === 'fulfilled')).toHaveLength(1)
    await expect(repo.create({ ...t, id: 'another' }, 'a')).rejects.toThrow()
    await repo.discardActive(t.id, 1, 'a')
    expect(await repo.loadActive()).toBeUndefined()
    expect(await repo.loadById(t.id)).toBeUndefined()
  })
  it('rolls back the snapshot, active pointer and operation marker on transaction abort', async () => {
    const { repo, t } = await setup()
    const original = IDBObjectStore.prototype.put
    vi.spyOn(IDBObjectStore.prototype, 'put').mockImplementation(function (this: IDBObjectStore, ...args: Parameters<typeof original>) {
      const request = original.apply(this, args)
      if (this.name === 'operations') this.transaction.abort()
      return request
    })
    const command = { type: 'saveDraft', matchId: t.rounds[0].matches[0].id, sets: [['7', '']] } as const
    await expect(send(repo, t, command, 'retry')).rejects.toThrow()
    expect(await repo.loadActive()).toEqual(t)
    vi.restoreAllMocks()
    expect((await send(repo, t, command, 'retry')).revision).toBe(1)
  })
  it('rejects unknown schemas without deleting or replacing them', async () => {
    const { repo, t, name } = await setup()
    const raw = await openDB(name, 1)
    await raw.put('tournaments', { ...t, schemaVersion: 99 })
    await expect(repo.loadActive()).rejects.toThrow(/Datenversion/)
    await expect(repo.discardActive(t.id, 0, 'a')).rejects.toThrow()
    await expect(repo.create({ ...t, id: 'new' }, 'a')).rejects.toThrow()
    expect((await raw.get('tournaments', t.id)).schemaVersion).toBe(99)
    raw.close()
  })
  it('refuses a database created by a newer frontend', async () => {
    const name = `future-${++sequence}`
    const raw = await openDB(name, 2); raw.close()
    await expect(openRepository({ name })).rejects.toThrow(/Datenbankversion/)
  })
  it('guards every write with a 15-second lease; expired owners cannot renew or release a successor', async () => {
    const { repo, t, tick } = await setup()
    expect(await repo.acquireSession('b')).toBe(false)
    tick(14_999)
    expect(await repo.acquireSession('b')).toBe(false)
    tick(1)
    expect(await repo.acquireSession('b')).toBe(true)
    expect(await repo.renewSession('a')).toBe(false)
    await repo.releaseSession('a')
    const cmd = { type: 'saveDraft', matchId: t.rounds[0].matches[0].id, sets: [['1', '']] } as const
    await expect(send(repo, t, cmd)).rejects.toThrow(/Tab/)
    await expect(repo.discardActive(t.id, 0, 'a')).rejects.toThrow(/Tab/)
    await expect(repo.create({ ...t, id: 'new' }, 'a')).rejects.toThrow(/Tab/)
    expect(await repo.renewSession('b')).toBe(true)
    await repo.releaseSession('b')
    expect(await repo.acquireSession('a')).toBe(true)
    tick(15_000)
    expect(await repo.renewSession('a')).toBe(false)
    await expect(send(repo, t, cmd)).rejects.toThrow(/Tab/)
  })
  it('parses finished snapshots from every entry round', async () => {
    for (const entryRound of ['roundOf16', 'quarterfinal', 'semifinal', 'final'] as const) {
      const { repo, t, ctx } = await setup(entryRound)
      let current = t
      while (current.status === 'playing') {
        const r = current.rounds.at(-1)!
        for (const m of r.matches) current = applyCommand(current, { type: 'completeMatch', matchId: m.id, sets: [['11', '9']] }, ctx)
        if (current.status === 'playing') current = applyCommand(current, { type: 'drawNextRound', roundId: r.id }, ctx)
      }
      await repo.discardActive(t.id, 0, 'a')
      expect(await repo.create(current, 'a')).toEqual(current)
      expect(await repo.loadActive()).toEqual(current)
    }
  })
})

it('rolls back archive status and active pointer when committing the operation fails', async () => {
  const { repo, t } = await setup()
  const finished = await send(repo, t, { type: 'completeMatch', matchId: t.rounds[0].matches[0].id, sets: [['11', '9']] })
  const original = IDBObjectStore.prototype.put
  vi.spyOn(IDBObjectStore.prototype, 'put').mockImplementation(function (this: IDBObjectStore, ...args: Parameters<typeof original>) {
    const request = original.apply(this, args)
    if (this.name === 'operations') this.transaction.abort()
    return request
  })
  await expect(send(repo, finished, { type: 'archive' }, 'archive-retry')).rejects.toThrow()
  expect(await repo.loadActive()).toEqual(finished)
  expect(await repo.listArchives()).toEqual([])
  vi.restoreAllMocks()
  expect((await send(repo, finished, { type: 'archive' }, 'archive-retry')).status).toBe('archived')
  expect(await repo.loadActive()).toBeUndefined()
})
it('does not discard an active tournament using a stale revision or a different ID', async () => {
  const { repo, t } = await setup()
  await expect(repo.discardActive(t.id, 4, 'a')).rejects.toThrow(/geändert/)
  await expect(repo.discardActive('different', 0, 'a')).rejects.toThrow()
  expect(await repo.loadActive()).toEqual(t)
})
it('reopens archives with their historical names, ratings and portraits unchanged', async () => {
  const { repo, t, name } = await setup()
  await repo.discardActive(t.id, 0, 'a')
  const historical = { ...t, participants: t.participants.map(p => ({ ...p, name: 'Damals', portrait: { ...p.portrait, hair: 'bald' as const } })) }
  await repo.create(historical, 'a')
  const finished = await send(repo, historical, { type: 'completeMatch', matchId: t.rounds[0].matches[0].id, sets: [['14', '12']] })
  const archived = await send(repo, finished, { type: 'archive' })
  repo.close()
  const reopened = await openRepository({ name, context: { random: () => { throw new Error('No regeneration') }, newId: () => { throw new Error('No new IDs') }, now: () => { throw new Error('No timestamp regeneration') } } })
  opened.push(reopened)
  expect(await reopened.loadById(t.id)).toEqual(archived)
  expect(await reopened.listArchives()).toEqual([archived])
})
