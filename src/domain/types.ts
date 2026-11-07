import type { PortraitDefinition } from './portraits'
export type { PortraitDefinition } from './portraits'

export interface Country {
  readonly id: string
  readonly name: string
  readonly flagPath: string
  readonly strengthFactor: number
}
export interface Player {
  readonly id: string
  readonly countryId: string
  readonly name: string
  readonly portrait: PortraitDefinition
}
export type RandomSource = () => number
export interface GenerationContext {
  readonly random: RandomSource
  readonly newId: () => string
  readonly now: () => string
}
export type EntryRound = 'roundOf16' | 'quarterfinal' | 'semifinal' | 'final'
export type WinsRequired = 1 | 2 | 3
export interface Settings {
  readonly entryRound: EntryRound
  readonly winsRequired: WinsRequired
}
export interface Ratings {
  readonly ANG: number
  readonly VER: number
  readonly SVC: number
  readonly VOR: number
  readonly RUC: number
}
export interface ParticipantSnapshot {
  readonly id: string
  readonly playerId: string
  readonly countryId: string
  readonly name: string
  readonly countryName: string
  readonly flagPath: string
  readonly portrait: PortraitDefinition
  readonly ratings: Ratings
  readonly overall: number
}
export type SetScore = readonly [number, number]
export type DraftSet = readonly [string, string]
export interface MatchResult {
  readonly sets: readonly SetScore[]
  readonly setWins: readonly [number, number]
  readonly winnerId: string
}
interface MatchBase {
  readonly id: string
  readonly participantIds: readonly [string, string]
  readonly kind: 'standard' | 'final' | 'bronze'
  readonly draft: readonly DraftSet[]
}
export type Match = MatchBase & (
  | { readonly status: 'pending'; readonly result?: never }
  | { readonly status: 'completed'; readonly result: MatchResult }
)
export interface Round {
  readonly id: string
  readonly stage: EntryRound | 'medal'
  readonly drawnAt: string
  readonly matches: readonly Match[]
}
export interface Placement {
  readonly participantId: string
  readonly rank: 1 | 2 | 3 | 4 | 5 | 9
}
interface TournamentBase {
  readonly id: string
  readonly schemaVersion: 1
  readonly revision: number
  readonly startedAt: string
  readonly settings: Settings
  readonly participants: readonly ParticipantSnapshot[]
  readonly rounds: readonly Round[]
}
interface Completion {
  readonly finishedAt: string
  readonly placements: readonly Placement[]
}
export type Tournament = TournamentBase & (
  | { readonly status: 'playing'; readonly finishedAt?: never; readonly placements?: never; readonly archivedAt?: never }
  | (Completion & { readonly status: 'finished'; readonly archivedAt?: never })
  | (Completion & { readonly status: 'archived'; readonly archivedAt: string })
)
export type DomainErrorCode = 'INVALID_RESULT' | 'CORRECTION_LOCKED' | 'ROUND_INCOMPLETE' | 'INVALID_ACTION'
export interface DomainError {
  readonly code: DomainErrorCode
  readonly message: string
}

export type DraftEvaluation =
  | { readonly status: 'invalid'; readonly errors: readonly { readonly row: number; readonly message: string }[] }
  | { readonly status: 'incomplete' }
  | { readonly status: 'complete'; readonly sets: readonly SetScore[]; readonly setWins: readonly [number, number]; readonly winnerSide: 0 | 1 }

export type TournamentCommand =
  | { readonly type: 'saveDraft' | 'completeMatch'; readonly matchId: string; readonly sets: readonly DraftSet[] }
  | { readonly type: 'drawNextRound'; readonly roundId: string }
  | { readonly type: 'archive' }
