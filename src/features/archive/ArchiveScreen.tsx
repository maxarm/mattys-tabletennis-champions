import type { Tournament } from '../../domain/types'
import { stageNames } from '../rounds/labels'

export function ArchiveScreen({ archives, busy, onOpen }: {
  archives: readonly Tournament[]
  busy: boolean
  onOpen: (id: string) => void
}) {
  const sorted = archives.filter(t => t.status === 'archived').sort((a, b) => b.archivedAt!.localeCompare(a.archivedAt!))
  return <section>
    <span className="eyebrow">Erinnerungen an der Platte</span>
    <h2>Eure Meisterschaften</h2>
    {!sorted.length && <p className="paper placeholder">Noch keine Meisterschaft archiviert. Eure erste Legende wartet schon.</p>}
    <div className="match-grid">{sorted.map(t => {
      const winner = t.participants.find(p => p.id === t.placements!.find(p => p.rank === 1)!.participantId)!
      return <article className="paper archive-card" key={t.id}>
        <p>Archiviert am {new Date(t.archivedAt!).toLocaleString('de-AT')}</p>
        <h3>{winner.countryName} · {winner.name}</h3>
        <p>Einstieg: {stageNames[t.settings.entryRound]} · {t.settings.winsRequired} {t.settings.winsRequired === 1 ? 'Satzsieg' : 'Satzsiege'}</p>
        <button disabled={busy} onClick={() => onOpen(t.id)} aria-label={`Meisterschaft ansehen: ${winner.countryName}, ${new Date(t.archivedAt!).toLocaleDateString('de-AT')}`}>Meisterschaft ansehen →</button>
      </article>
    })}</div>
  </section>
}
