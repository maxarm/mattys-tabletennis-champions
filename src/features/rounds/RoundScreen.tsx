import { useRef, useState } from 'react'
import type { Tournament } from '../../domain/types'
import { Flag } from '../../components/Flag'
import { Portrait } from '../../components/Portrait'
import { TournamentTree } from './TournamentTree'
import { stageNames } from './labels'

export interface RoundScreenProps {
  tournament: Tournament
  busy: boolean
  writable: boolean
  onMatch: (id: string) => void
  onNext: () => Promise<unknown>
}

export function RoundScreen({ tournament: t, busy, writable, onMatch, onNext }: RoundScreenProps) {
  const [tree, setTree] = useState(false)
  const [pending, setPending] = useState(false)
  const lock = useRef(false)
  const round = t.rounds.at(-1)!
  const done = round.matches.filter(m => m.status === 'completed').length

  async function next() {
    if (lock.current) return
    lock.current = true
    setPending(true)
    try {
      await onNext()
    } catch { /* App displays errors without navigating. */ }
    finally {
      lock.current = false
      setPending(false)
    }
  }

  return <section>
    <div className="round-heading">
      <div>
        <span className="eyebrow">Die Platte gehört euch</span>
        <h2>{stageNames[round.stage]}.</h2>
        <p>{done} von {round.matches.length} Spielen abgeschlossen</p>
      </div>
      <button aria-pressed={tree} onClick={() => setTree(!tree)}>{tree ? 'Paarungsliste' : 'Turnierbaum'}</button>
    </div>
    <progress aria-label="Rundenfortschritt" max={round.matches.length} value={done} />
    {tree ? <TournamentTree tournament={t} onMatch={onMatch} /> : <div className="match-grid">
      {round.matches.map((match, i) => <article className={`match paper ${match.status}`} key={match.id}>
        <div className="match-meta">
          <span>{match.kind === 'bronze' ? 'Spiel um Platz 3' : match.kind === 'final' ? 'Finale' : `Spiel ${String(i + 1).padStart(2, '0')}`}</span>
          <span>{match.status === 'completed' ? 'Abgeschlossen ✓' : 'Bereit für euch'}</span>
        </div>
        {match.participantIds.map((id, side) => {
          const p = t.participants.find(p => p.id === id)!
          return <div className="team" key={id}>
            <Portrait definition={p.portrait} />
            <Flag countryName={p.countryName} src={p.flagPath} />
            <div className="team-name">
              <strong>{p.countryName}</strong><span>{p.name}</span>
              {match.status === 'completed' && match.result.winnerId === id && <small>Sieger</small>}
            </div>
            {match.status === 'completed' && <b className="score">{match.result.setWins[side]}</b>}
          </div>
        })}
        <button className={match.status === 'pending' ? 'primary' : 'open-match'} disabled={busy || pending}
          onClick={() => onMatch(match.id)} aria-label={`Spiel ${i + 1} öffnen${match.status === 'completed' ? ', abgeschlossen' : ''}`}>
          {match.status === 'completed' ? 'Ergebnis ansehen →' : 'Partie öffnen →'}
        </button>
      </article>)}
    </div>}
    {round.stage !== 'medal' && round.stage !== 'final' && <div className="round-footer">
      <button className="primary" disabled={done !== round.matches.length || busy || pending || !writable} onClick={() => void next()}>
        {round.stage === 'semifinal' ? 'Finalrunde auslosen' : 'Nächste Runde losen'}
      </button>
      <p className="muted">Neue Paarungen entstehen erst nach allen Spielen dieser Runde.</p>
    </div>}
  </section>
}
