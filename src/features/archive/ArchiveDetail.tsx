import { useEffect, useState } from 'react'
import type { TournamentRepository } from '../../storage/repository'
import { storageMessage } from '../../storage/repository'
import type { Tournament } from '../../domain/types'
import { StatusMessage } from '../../components/StatusMessage'
import { PlayerCard } from '../../components/PlayerCard'
import { ResultsScreen } from '../results/ResultsScreen'
import { stageNames } from '../rounds/labels'

export function ArchiveDetail({ repository, tournamentId }: {
  repository: TournamentRepository
  tournamentId: string
}) {
  const [snapshot, setSnapshot] = useState<Tournament>()
  const [error, setError] = useState<string>()
  useEffect(() => {
    let cancelled = false
    void repository.loadById(tournamentId).then(t => {
      if (!t || t.status !== 'archived') throw new Error('Diese Meisterschaft ist nicht im Archiv verfügbar.')
      if (!cancelled) setSnapshot(t)
    }).catch(reason => { if (!cancelled) setError(storageMessage(reason)) })
    return () => { cancelled = true }
  }, [repository, tournamentId])
  if (error) return <StatusMessage message={error} error />
  if (!snapshot) return <StatusMessage message="Archiv wird geladen" />
  const t = snapshot
  return <section>
    <h2>Meisterschaft im Archiv</h2>
    <p>Archiviert am {new Date(t.archivedAt!).toLocaleString('de-AT')}</p>
    <p>Begonnen: {new Date(t.startedAt).toLocaleString('de-AT')} · Beendet: {new Date(t.finishedAt!).toLocaleString('de-AT')}</p>
    <p>Einstieg: {stageNames[t.settings.entryRound]} · {t.settings.winsRequired} {t.settings.winsRequired === 1 ? 'Satzsieg' : 'Satzsiege'}</p>
    <ResultsScreen tournament={t} />
    <h2>Alle Partien</h2>
    {t.rounds.map(round => <section key={round.id}>
      <h3>{stageNames[round.stage]}</h3>
      <p className="muted">Ausgelost: {new Date(round.drawnAt).toLocaleString('de-AT')}</p>
      <div className="match-grid">{round.matches.map(match => <article className="paper archive-card" key={match.id}>
        <h4>{match.kind === 'bronze' ? 'Spiel um Platz 3' : match.kind === 'final' ? 'Finale' : 'Partie'}</h4>
        <p>{match.participantIds.map(id => { const p = t.participants.find(p => p.id === id)!; return `${p.countryName} · ${p.name}` }).join(' gegen ')}</p>
        {match.status === 'completed' && <>
          <p>Sieger: {t.participants.find(p => p.id === match.result.winnerId)!.name} · Satzstand {match.result.setWins.join(' : ')}</p>
          {match.result.sets.map((set, i) => <p key={i}>Satz {i + 1}: {set.join(' : ')}</p>)}
        </>}
      </article>)}</div>
    </section>)}
    <h2>Die damaligen Spielerprofile</h2>
    <div className="profile-grid">{t.participants.map(p => <PlayerCard key={p.id} participant={p} />)}</div>
  </section>
}
