import { expect, test } from 'vitest'
import { context } from '../../tests/fixtures'
import { applyCommand, createTournament } from './tournament'
import type { EntryRound, Tournament } from './types'

function completeRound(t: Tournament, ctx = context()): Tournament {
  for (const match of t.rounds.at(-1)!.matches) t = applyCommand(t,{type:'completeMatch',matchId:match.id,sets:[['11','0']]},ctx)
  return t
}
test.each([['roundOf16',16,16],['quarterfinal',8,8],['semifinal',4,4],['final',2,1]] as const)('full lifecycle %s', (entryRound: EntryRound,count,total) => {
  const ctx = context()
  let t = createTournament({entryRound,winsRequired:1},ctx)
  const original = JSON.stringify(t)
  expect(t.participants).toHaveLength(count)
  expect(new Set(t.participants.map(p => p.countryId)).size).toBe(count)
  expect(() => applyCommand(t,{type:'drawNextRound',roundId:t.rounds[0]!.id},ctx)).toThrow()
  expect(JSON.stringify(t)).toBe(original)
  while(t.status === 'playing') {
    t = completeRound(t,ctx)
    if(t.status === 'playing') {
      const roundId = t.rounds.at(-1)!.id
      const previous = t
      t = applyCommand(t,{type:'drawNextRound',roundId},ctx)
      expect(applyCommand(t,{type:'drawNextRound',roundId},ctx)).toBe(t)
      expect(() => applyCommand(t,{type:'saveDraft',matchId:previous.rounds.at(-1)!.matches[0]!.id,sets:[]},ctx)).toThrow()
    }
  }
  expect(t.rounds.flatMap(r => r.matches)).toHaveLength(total)
  expect(t.placements?.map(p => p.rank)).toEqual(count === 2 ? [1,2] : count === 4 ? [1,2,3,4] : count === 8 ? [1,2,3,4,5,5,5,5] : [1,2,3,4,5,5,5,5,9,9,9,9,9,9,9,9])
  for(const rank of [5,9]) expect(t.placements?.filter(p => p.rank === rank).map(p => p.participantId)).toEqual(t.participants.filter(p => t.placements?.some(place => place.participantId === p.id && place.rank === rank)).map(p => p.id))
  const archived = applyCommand(t,{type:'archive'},ctx)
  expect(applyCommand(archived,{type:'archive'},ctx)).toBe(archived)
  expect(() => applyCommand(archived,{type:'saveDraft',matchId:t.rounds.at(-1)!.matches[0]!.id,sets:[]},ctx)).toThrow()
})
test.each([false,true])('medals can finish in either order; correction reopens tournament %s', reverse => {
  const ctx = context()
  let t = completeRound(createTournament({entryRound:'semifinal',winsRequired:1},ctx),ctx)
  t = applyCommand(t,{type:'drawNextRound',roundId:t.rounds[0]!.id},ctx)
  const matches = [...t.rounds[1]!.matches]
  expect(matches.map(m => m.kind)).toEqual(['final','bronze'])
  if(reverse) matches.reverse()
  t = applyCommand(t,{type:'completeMatch',matchId:matches[0]!.id,sets:[['0','11']]},ctx)
  expect(t.status).toBe('playing')
  t = applyCommand(t,{type:'completeMatch',matchId:matches[1]!.id,sets:[['11','0']]},ctx)
  expect(t.status).toBe('finished')
  t = applyCommand(t,{type:'saveDraft',matchId:matches[0]!.id,sets:[['','11']]},ctx)
  expect(t.status).toBe('playing'); expect(t.finishedAt).toBeUndefined(); expect(t.placements).toBeUndefined()
  expect(t.rounds[1]!.matches.find(m => m.id === matches[0]!.id)?.result).toBeUndefined()
  t = applyCommand(t,{type:'completeMatch',matchId:matches[0]!.id,sets:[['11','0']]},ctx)
  expect(t.status).toBe('finished')
})
test('player selection reaches each of the three fixed identities', () => {
  for(const [value,suffix] of [[0,'1'],[0.4,'2'],[0.999,'3']] as const) {
    const t = createTournament({entryRound:'final',winsRequired:1},context(() => value))
    expect(t.participants.every(p => p.playerId.endsWith(suffix))).toBe(true)
  }
})
test('redrawing shuffles winners rather than preserving a bracket or ratings order', () => {
  const ctx = context()
  const t = completeRound(createTournament({entryRound:'quarterfinal',winsRequired:1},ctx),ctx)
  const cmd = {type:'drawNextRound',roundId:t.rounds[0]!.id} as const
  const a = applyCommand(t,cmd,{...ctx,random:() => 0})
  const b = applyCommand(t,cmd,{...ctx,random:() => 0.999})
  expect(a.rounds[1]!.matches.map(m => m.participantIds)).not.toEqual(b.rounds[1]!.matches.map(m => m.participantIds))
  expect(a.participants).toBe(t.participants)
})
test('typed errors reject incomplete and unknown commands without mutation', () => {
  const ctx = context()
  const t = createTournament({entryRound:'quarterfinal',winsRequired:1},ctx)
  const before = JSON.stringify(t)
  expect(() => applyCommand(t,{type:'drawNextRound',roundId:t.rounds[0]!.id},ctx)).toThrow(expect.objectContaining({code:'ROUND_INCOMPLETE'}))
  expect(() => applyCommand(t,{type:'archive'},ctx)).toThrow(expect.objectContaining({code:'INVALID_ACTION'}))
  expect(() => applyCommand(t,{type:'drawNextRound',roundId:'missing'},ctx)).toThrow(expect.objectContaining({code:'INVALID_ACTION'}))
  expect(() => applyCommand(t,{type:'saveDraft',matchId:'missing',sets:[]},ctx)).toThrow(expect.objectContaining({code:'INVALID_ACTION'}))
  expect(() => applyCommand(t,{type:'completeMatch',matchId:t.rounds[0]!.matches[0]!.id,sets:[['11','10']]},ctx)).toThrow(expect.objectContaining({code:'INVALID_RESULT'}))
  expect(JSON.stringify(t)).toBe(before)
})
test('draft preserves invalid text; corrected earlier wins truncate stale sets and replace winner', () => {
  const ctx = context()
  let t = createTournament({entryRound:'final',winsRequired:2},ctx)
  const initial = JSON.stringify(t)
  const m = t.rounds[0]!.matches[0]!
  const invalid = applyCommand(t,{type:'saveDraft',matchId:m.id,sets:[['abc','']]},ctx)
  expect(invalid.rounds[0]!.matches[0]!.draft).toEqual([['abc','']])
  expect(JSON.stringify(t)).toBe(initial)
  t = applyCommand(t,{type:'completeMatch',matchId:m.id,sets:[['11','0'],['0','11'],['0','11']]},ctx)
  expect(t.rounds[0]!.matches[0]!.result?.winnerId).toBe(m.participantIds[1])
  t = applyCommand(t,{type:'saveDraft',matchId:m.id,sets:[['11','0'],['11','0'],['0','11']]},ctx)
  expect(t.rounds[0]!.matches[0]!.draft).toEqual([['11','0'],['11','0']])
  expect(t.rounds[0]!.matches[0]!.result).toBeUndefined()
  expect(t.status).toBe('playing')
  t = applyCommand(t,{type:'completeMatch',matchId:m.id,sets:t.rounds[0]!.matches[0]!.draft},ctx)
  expect(t.rounds[0]!.matches[0]!.result).toEqual({sets:[[11,0],[11,0]],setWins:[2,0],winnerId:m.participantIds[0]})
  expect(t.placements?.find(p => p.rank === 1)?.participantId).toBe(m.participantIds[0])
})
test('medal participants are exactly semifinal winners and losers', () => {
  const ctx = context()
  let t = completeRound(createTournament({entryRound:'semifinal',winsRequired:1},ctx),ctx)
  const semifinals = t.rounds[0]!.matches
  t = applyCommand(t,{type:'drawNextRound',roundId:t.rounds[0]!.id},ctx)
  expect(new Set(t.rounds[1]!.matches[0]!.participantIds)).toEqual(new Set(semifinals.map(m => m.participantIds[0])))
  expect(new Set(t.rounds[1]!.matches[1]!.participantIds)).toEqual(new Set(semifinals.map(m => m.participantIds[1])))
})
