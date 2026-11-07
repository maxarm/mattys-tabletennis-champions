import { describe, expect, it } from 'vitest'
import { createTournament, applyCommand } from '../domain/tournament'
import { context } from '../../tests/fixtures'
import { parseTournament } from './schema'

function fixture() { return createTournament({ entryRound: 'final', winsRequired: 1 }, context()) }
describe('persisted schema', () => {
  it('preserves historical snapshots without consulting the current catalog', () => {
    const t = fixture()
    const old = { ...t, participants: t.participants.map(p => ({ ...p, name: 'Historischer Name', portrait: { ...p.portrait, skin: '#123456' } })) }
    expect(parseTournament(old)).toEqual(old)
  })
  it.each([
    ['unknown version', (t: ReturnType<typeof fixture>) => ({ ...t, schemaVersion: 2 })],
    ['invalid status', (t: ReturnType<typeof fixture>) => ({ ...t, status: 'broken' })],
    ['missing participant', (t: ReturnType<typeof fixture>) => ({ ...t, participants: t.participants.slice(1) })],
    ['invalid ratings', (t: ReturnType<typeof fixture>) => ({ ...t, participants: t.participants.map(p => ({ ...p, ratings: { ...p.ratings, ANG: 101 } })) })],
    ['wrong overall', (t: ReturnType<typeof fixture>) => ({ ...t, participants: t.participants.map(p => ({ ...p, overall: 1 })) })],
    ['duplicate identity', (t: ReturnType<typeof fixture>) => ({ ...t, participants: [t.participants[0], t.participants[0]] })],
    ['inconsistent progression', (t: ReturnType<typeof fixture>) => ({ ...t, rounds: [...t.rounds, t.rounds[0]] })],
  ])('rejects %s', (_name, change) => { expect(() => parseTournament(change(fixture()))).toThrow() })
  it('rejects scores, winners, placements and completion metadata inconsistent with the bracket', () => {
    const t = fixture()
    const match = t.rounds[0].matches[0]
    const finished = applyCommand(t, { type: 'completeMatch', matchId: match.id, sets: [['11', '9']] }, context())
    expect(parseTournament(finished)).toEqual(finished)
    expect(() => parseTournament({ ...finished, placements: [] })).toThrow()
    expect(() => parseTournament({ ...finished, status: 'playing' })).toThrow()
    for (const result of [
      { sets: [[11, 10]], setWins: [1, 0], winnerId: match.participantIds[0] },
      { sets: [[11, 9]], setWins: [0, 1], winnerId: match.participantIds[1] },
    ]) expect(() => parseTournament({ ...finished, rounds: [{ ...finished.rounds[0], matches: [{ ...finished.rounds[0].matches[0], result }] }] })).toThrow()
  })
})

it('reports malformed persisted data in German', () => {
  expect(() => parseTournament({ schemaVersion: 1 })).toThrow(/Turnierdaten/)
})
