import type { Tournament } from '../../domain/types'
import { Portrait } from '../../components/Portrait'
import { Flag } from '../../components/Flag'

export function ResultsScreen({ tournament: t, busy = false, onArchive }: {
  tournament: Tournament
  busy?: boolean
  onArchive?: () => void
}) {
  if (t.status === 'playing') return <p>Die Meisterschaft läuft noch.</p>
  const winner = t.participants.find(p => p.id === t.placements.find(p => p.rank === 1)!.participantId)!
  return <section>
    <span className="eyebrow">Die Platte hat ihre Legende</span>
    <h2>Siegerehrung</h2>
    <div className="winner-banner">
      <Portrait definition={winner.portrait} />
      <div><span className="eyebrow">Meisterteam · Platz 1</span><h3>{winner.countryName}</h3><p>{winner.name}</p></div>
      <Flag countryName={winner.countryName} src={winner.flagPath} />
    </div>
    <ol className="placements paper" aria-label="Platzierungen">
      {t.placements.map(placement => {
        const p = t.participants.find(p => p.id === placement.participantId)!
        return <li key={p.id}>
          <strong>Platz {placement.rank}</strong>
          <Flag countryName={p.countryName} src={p.flagPath} />
          <span>{p.countryName}<small>{p.name}</small></span>
        </li>
      })}
    </ol>
    {t.status === 'finished' && onArchive && <button className="primary" disabled={busy} onClick={onArchive}>Speichern und Beenden</button>}
  </section>
}
