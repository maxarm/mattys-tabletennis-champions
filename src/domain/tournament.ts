import { COUNTRIES, PLAYERS } from './catalog'
import { overall, rollRatings } from './ratings'
import { evaluateDraft } from './scoring'
import type { DomainError, DomainErrorCode, EntryRound, GenerationContext, Match, Placement, RandomSource, Round, Settings, Tournament, TournamentCommand } from './types'

function fail(code: DomainErrorCode): never {
  const messages: Record<DomainErrorCode,string> = {
    INVALID_RESULT:'Das Ergebnis ist unvollständig oder ungültig.',
    CORRECTION_LOCKED:'Dieses Spiel kann nicht mehr korrigiert werden.',
    ROUND_INCOMPLETE:'Bitte zuerst alle Spiele der Runde abschließen.',
    INVALID_ACTION:'Diese Aktion ist nicht möglich.',
  }
  throw Object.assign(new Error(messages[code]), {code}) satisfies Error & DomainError
}
function shuffle<T>(items: readonly T[], random: RandomSource): T[] {
  const result = [...items]
  for (let i = result.length-1; i > 0; i--) {
    const j = Math.floor(random() * (i+1))
    ;[result[i],result[j]] = [result[j]!,result[i]!]
  }
  return result
}
function match(ids: readonly string[], kind: Match['kind'], ctx: GenerationContext): Match {
  return {id:ctx.newId(),participantIds:[ids[0]!,ids[1]!],kind,status:'pending',draft:[]}
}
function round(ids: readonly string[], stage: Round['stage'], ctx: GenerationContext): Round {
  const shuffled = shuffle(ids,ctx.random)
  const matches: Match[] = []
  for(let i = 0; i < shuffled.length; i+=2) matches.push(match(shuffled.slice(i,i+2),stage === 'final' ? 'final' : 'standard',ctx))
  return {id:ctx.newId(),stage,drawnAt:ctx.now(),matches}
}
export function createTournament(settings: Settings, ctx: GenerationContext): Tournament {
  const count = {roundOf16:16,quarterfinal:8,semifinal:4,final:2}[settings.entryRound]
  const participants = shuffle(COUNTRIES,ctx.random).slice(0,count).map(country => {
    const players = PLAYERS.filter(p => p.countryId === country.id)
    const player = players[Math.floor(ctx.random()*players.length)]!
    const ratings = rollRatings(country.strengthFactor,ctx.random)
    return {id:ctx.newId(),playerId:player.id,countryId:country.id,name:player.name,countryName:country.name,flagPath:country.flagPath,portrait:{...player.portrait},ratings,overall:overall(ratings)}
  })
  return {id:ctx.newId(),schemaVersion:1,revision:0,startedAt:ctx.now(),settings:{...settings},participants,rounds:[round(participants.map(p => p.id),settings.entryRound,ctx)],status:'playing'}
}
function loser(m: Match): string {
  if(m.status !== 'completed') return fail('ROUND_INCOMPLETE')
  return m.participantIds.find(id => id !== m.result.winnerId)!
}
function winner(m: Match): string {
  return m.status === 'completed' ? m.result.winnerId : fail('ROUND_INCOMPLETE')
}
function placements(t: Tournament): Placement[] {
  const ranks = new Map<string,Placement['rank']>()
  for(const r of t.rounds) for(const m of r.matches) {
    if(m.kind === 'final') { ranks.set(winner(m),1); ranks.set(loser(m),2) }
    else if(m.kind === 'bronze') { ranks.set(winner(m),3); ranks.set(loser(m),4) }
    else if(r.stage === 'roundOf16' || r.stage === 'quarterfinal') ranks.set(loser(m),r.stage === 'roundOf16' ? 9 : 5)
  }
  return t.participants.map(p => ({participantId:p.id,rank:ranks.get(p.id)!})).sort((a,b) => a.rank-b.rank)
}
export function applyCommand(t: Tournament, command: TournamentCommand, ctx: GenerationContext): Tournament {
  if(command.type === 'archive') {
    if(t.status === 'archived') return t
    if(t.status !== 'finished') return fail('INVALID_ACTION')
    return {...t,status:'archived',archivedAt:ctx.now(),revision:t.revision+1}
  }
  if(t.status === 'archived') return fail('CORRECTION_LOCKED')
  const latest = t.rounds.at(-1)!
  if(command.type === 'drawNextRound') {
    const index = t.rounds.findIndex(r => r.id === command.roundId)
    if(index === -1) return fail('INVALID_ACTION')
    if(index < t.rounds.length-1) return t
    if(latest.matches.some(m => m.status !== 'completed')) return fail('ROUND_INCOMPLETE')
    if(latest.stage === 'medal' || latest.stage === 'final') return fail('INVALID_ACTION')
    let next: Round
    if(latest.stage === 'semifinal') {
      next = {id:ctx.newId(),stage:'medal',drawnAt:ctx.now(),matches:[match(shuffle(latest.matches.map(winner),ctx.random),'final',ctx),match(shuffle(latest.matches.map(loser),ctx.random),'bronze',ctx)]}
    } else {
      const stage: EntryRound = latest.stage === 'roundOf16' ? 'quarterfinal' : 'semifinal'
      next = round(latest.matches.map(winner),stage,ctx)
    }
    return {...t,revision:t.revision+1,rounds:[...t.rounds,next]}
  }
  const oldMatch = latest.matches.find(m => m.id === command.matchId)
  if(!oldMatch) {
    if(t.rounds.some(r => r.matches.some(m => m.id === command.matchId))) return fail('CORRECTION_LOCKED')
    return fail('INVALID_ACTION')
  }
  const evaluation = evaluateDraft(command.sets,t.settings.winsRequired)
  if(command.type === 'completeMatch' && evaluation.status !== 'complete') return fail('INVALID_RESULT')
  // Match end is authoritative even if a correction leaves stale later rows.
  const draft = command.sets.slice(0,evaluation.status === 'complete' ? evaluation.sets.length : undefined).map(([a,b]) => [a,b] as const)
  const base = {id:oldMatch.id,participantIds:oldMatch.participantIds,kind:oldMatch.kind,draft}
  const updated: Match = command.type === 'completeMatch' && evaluation.status === 'complete'
    ? {...base,status:'completed',result:{sets:evaluation.sets,setWins:evaluation.setWins,winnerId:oldMatch.participantIds[evaluation.winnerSide]}}
    : {...base,status:'pending'}
  // Reconstruct the playing union explicitly so completion metadata cannot survive corrections.
  const playing: Tournament = {id:t.id,schemaVersion:t.schemaVersion,revision:t.revision+1,startedAt:t.startedAt,settings:t.settings,participants:t.participants,status:'playing',rounds:t.rounds.map(r => r.id === latest.id ? {...r,matches:r.matches.map(m => m.id === updated.id ? updated : m)} : r)}
  const last = playing.rounds.at(-1)!
  if((last.stage === 'final' || last.stage === 'medal') && last.matches.every(m => m.status === 'completed')) return {...playing,status:'finished',finishedAt:ctx.now(),placements:placements(playing)}
  return playing
}
