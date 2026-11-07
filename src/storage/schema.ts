import { z } from 'zod'
import { evaluateDraft } from '../domain/scoring'
import { overall } from '../domain/ratings'
import type { Match, Placement, Tournament } from '../domain/types'

const id = z.string().min(1)
const date = z.iso.datetime({ offset: true })
const rating = z.number().int().min(1).max(100)
const entry = z.enum(['roundOf16', 'quarterfinal', 'semifinal', 'final'])
const draft = z.array(z.tuple([z.string(), z.string()]))
const matchBase = { id, participantIds: z.tuple([id, id]), kind: z.enum(['standard', 'final', 'bronze']), draft }
const match = z.discriminatedUnion('status', [
  z.strictObject({ ...matchBase, status: z.literal('pending') }),
  z.strictObject({ ...matchBase, status: z.literal('completed'), result: z.strictObject({
    sets: z.array(z.tuple([z.number().int().nonnegative(), z.number().int().nonnegative()])),
    setWins: z.tuple([z.number().int().nonnegative(), z.number().int().nonnegative()]), winnerId: id,
  }) }),
])
const base = {
  id, schemaVersion: z.literal(1), revision: z.number().int().nonnegative(), startedAt: date,
  settings: z.strictObject({ entryRound: entry, winsRequired: z.union([z.literal(1), z.literal(2), z.literal(3)]) }),
  participants: z.array(z.strictObject({
    id, playerId: id, countryId: id, name: id, countryName: id, flagPath: z.string().startsWith('/'),
    portrait: z.strictObject({ face: z.enum(['round', 'oval', 'square']), skin: id, hair: z.enum(['crop', 'curls', 'swept', 'bald']), hairColor: id, accessory: z.enum(['none', 'glasses', 'headband']), shirtColor: id }),
    ratings: z.strictObject({ ANG: rating, VER: rating, SVC: rating, VOR: rating, RUC: rating }), overall: rating,
  })),
  rounds: z.array(z.strictObject({ id, stage: z.enum(['roundOf16', 'quarterfinal', 'semifinal', 'final', 'medal']), drawnAt: date, matches: z.array(match) })).min(1),
}
const completion = { finishedAt: date, placements: z.array(z.strictObject({ participantId: id, rank: z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4), z.literal(5), z.literal(9)]) })) }
const schemaV1 = z.discriminatedUnion('status', [
  z.strictObject({ ...base, status: z.literal('playing') }),
  z.strictObject({ ...base, ...completion, status: z.literal('finished') }),
  z.strictObject({ ...base, ...completion, status: z.literal('archived'), archivedAt: date }),
])

function consistent(condition: boolean): asserts condition {
  if (!condition) throw new Error('Die gespeicherten Turnierdaten sind widersprüchlich.')
}
function unique(values: readonly string[]) { return new Set(values).size === values.length }
function winner(m: Match) { consistent(m.status === 'completed'); return m.result.winnerId }
function loser(m: Match) { return m.participantIds.find(p => p !== winner(m))! }
function sameMembers(a: readonly string[], b: readonly string[]) { return a.length === b.length && unique(a) && a.every(p => b.includes(p)) }

/** Schema 1 has no predecessor; future migrations must be explicit and preserve snapshots. */
export function migrateTournament(value: unknown): unknown {
  if (typeof value !== 'object' || value === null || !('schemaVersion' in value) || value.schemaVersion !== 1)
    throw new Error('Unbekannte Datenversion. Bitte eine passende App-Version verwenden; die Daten bleiben erhalten.')
  return value
}
export function parseTournament(value: unknown): Tournament {
  const result = schemaV1.safeParse(migrateTournament(value))
  if (!result.success) throw new Error('Die gespeicherten Turnierdaten sind ungültig. Die Daten bleiben erhalten.')
  const t: Tournament = result.data
  const count = { roundOf16: 16, quarterfinal: 8, semifinal: 4, final: 2 }[t.settings.entryRound]
  consistent(t.participants.length === count)
  for (const field of ['id', 'playerId', 'countryId'] as const) consistent(unique(t.participants.map(p => p[field])))
  consistent(t.participants.every(p => p.overall === overall(p.ratings)))
  consistent(unique([t.id, ...t.participants.map(p => p.id), ...t.rounds.flatMap(r => [r.id, ...r.matches.map(m => m.id)])]))
  const ranks = new Map<string, Placement['rank']>()
  for (let i = 0; i < t.rounds.length; i++) {
    const r = t.rounds[i]
    const previous = t.rounds[i - 1]
    const expectedStage = previous ? { roundOf16: 'quarterfinal', quarterfinal: 'semifinal', semifinal: 'medal', final: '', medal: '' }[previous.stage] : t.settings.entryRound
    consistent(r.stage === expectedStage)
    if (previous) consistent(previous.matches.every(m => m.status === 'completed'))
    const expectedIds = previous ? previous.matches.map(winner) : t.participants.map(p => p.id)
    if (r.stage === 'medal') {
      consistent(r.matches.length === 2 && r.matches[0].kind === 'final' && r.matches[1].kind === 'bronze')
      consistent(sameMembers(r.matches[0].participantIds, expectedIds))
      consistent(sameMembers(r.matches[1].participantIds, previous.matches.map(loser)))
    } else {
      consistent(r.matches.every(m => m.kind === (r.stage === 'final' ? 'final' : 'standard')))
      consistent(sameMembers(r.matches.flatMap(m => [...m.participantIds]), expectedIds))
    }
    for (const m of r.matches) {
      consistent(m.participantIds[0] !== m.participantIds[1] && m.participantIds.every(p => t.participants.some(v => v.id === p)))
      // Pending drafts deliberately allow partial or invalid input.
      if (m.status === 'completed') {
        const result = evaluateDraft(m.draft, t.settings.winsRequired)
        consistent(result.status === 'complete')
        consistent(JSON.stringify(result.sets) === JSON.stringify(m.result.sets) && m.draft.length === result.sets.length)
        consistent(JSON.stringify(result.setWins) === JSON.stringify(m.result.setWins) && m.result.winnerId === m.participantIds[result.winnerSide])
        if (m.kind === 'final') { ranks.set(winner(m), 1); ranks.set(loser(m), 2) }
        else if (m.kind === 'bronze') { ranks.set(winner(m), 3); ranks.set(loser(m), 4) }
        else if (r.stage === 'quarterfinal' || r.stage === 'roundOf16') ranks.set(loser(m), r.stage === 'quarterfinal' ? 5 : 9)
      }
    }
  }
  const last = t.rounds.at(-1)!
  const done = (last.stage === 'final' || last.stage === 'medal') && last.matches.every(m => m.status === 'completed')
  consistent(done === (t.status !== 'playing'))
  if (t.status !== 'playing') {
    const expected = t.participants.map(p => ({ participantId: p.id, rank: ranks.get(p.id) })).sort((a, b) => a.rank! - b.rank!)
    consistent(JSON.stringify(expected) === JSON.stringify(t.placements))
  }
  return t
}
