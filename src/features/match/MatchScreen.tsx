import { useState } from 'react'
import { evaluateDraft } from '../../domain/scoring'
import type { DraftSet, Match, Tournament } from '../../domain/types'
import { PlayerCard } from '../../components/PlayerCard'
import { SetInputs } from './SetInputs'

export interface MatchScreenProps {
  tournament: Tournament
  match: Match
  draft: readonly DraftSet[]
  busy: boolean
  writable: boolean
  onEdit: (sets: readonly DraftSet[]) => void
  onBlur: () => void
  onComplete: (sets: readonly DraftSet[]) => void
}

export function MatchScreen({ tournament: t, match, draft, busy, writable, onEdit, onBlur, onComplete }: MatchScreenProps) {
  const [trimmed, setTrimmed] = useState(false)
  const historical = !t.rounds.at(-1)!.matches.some(m => m.id === match.id)
  const readonly = t.status === 'archived' || historical || !writable
  const evaluation = evaluateDraft(draft, t.settings.winsRequired)
  const rows: readonly DraftSet[] = draft.length === 0 ? [['', '']] :
    evaluation.status === 'incomplete' && draft.every(set => evaluateDraft([set], 1).status === 'complete')
      ? [...draft, ['', '']] : draft
  const players = match.participantIds.map(id => t.participants.find(p => p.id === id)!)

  function change(row: number, side: 0 | 1, value: string) {
    const next = rows.map((set, index): DraftSet => index === row
      ? side === 0 ? [value, set[1]] : [set[0], value]
      : set)
    const result = evaluateDraft(next, t.settings.winsRequired)
    const length = result.status === 'complete' ? result.sets.length : next.length
    if (length < next.length) setTrimmed(true)
    onEdit(next.slice(0, length))
  }

  return <section>
    <span className="eyebrow">Die Gesichter an der Platte</span>
    <h2>{match.kind === 'bronze' ? 'Spiel um Platz 3' : 'Aufschlag!'}</h2>
    <div className="players">{players.map(p => <PlayerCard key={p.id} participant={p} />)}</div>
    <div className="paper score-panel">
      {readonly ? <>
        <h3>Gespeichertes Ergebnis</h3>
        <p>{t.status === 'archived' ? 'Archiviert · nur lesbar.' : historical ? 'Nächste Runde bereits ausgelost · nur lesbar.' : 'Dieser Tab ist nur lesbar.'}</p>
        {match.status === 'completed' ? <>
          <p>Sieger: {players.find(p => p.id === match.result.winnerId)!.name} · Satzstand {match.result.setWins.join(' : ')}</p>
          {match.result.sets.map((set, i) => <p key={i}>Satz {i + 1}: {set.join(' : ')}</p>)}
        </> : draft.map((set, i) => <p key={i}>Satz {i + 1}: {set.map(text => text || '–').join(' : ')}</p>)}
      </> : <>
        <h3>{match.status === 'completed' ? 'Ergebnis korrigieren' : 'Eure Punkte zählen.'}</h3>
        <p className="muted">{t.settings.winsRequired} {t.settings.winsRequired === 1 ? 'Satzsieg' : 'Satzsiege'} benötigt · Änderungen zählen erst nach erneutem Abschluss.</p>
        <SetInputs sets={rows} names={[players[0]!.name, players[1]!.name]} disabled={busy}
          errors={evaluation.status === 'invalid' ? evaluation.errors : []} onChange={change} onBlur={onBlur} />
        {trimmed && <p role="status" aria-label="Satzkorrektur">Das Match endet jetzt früher. Überzählige Sätze wurden aus dem Entwurf entfernt.</p>}
        <button className="primary" disabled={busy || evaluation.status !== 'complete'} onClick={() => onComplete(draft)}>
          Spiel abschließen{evaluation.status === 'complete' ? ` · ${evaluation.setWins.join(' : ')}` : ''}
        </button>
      </>}
    </div>
  </section>
}
