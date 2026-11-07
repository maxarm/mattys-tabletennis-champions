import type { ParticipantSnapshot } from '../domain/types';
import { rarity } from '../domain/ratings';
import { Portrait } from './Portrait';
import { Flag } from './Flag';
const labels = { common: 'Gewöhnlich', legendary: 'Legendär', epic: 'Episch', mythic: 'Mythisch' };
export function PlayerCard({ participant: p }: {
    participant: ParticipantSnapshot;
}) {
    return <article className="player-card"><div className="player-art"><Portrait definition={p.portrait}/><strong className="overall">{p.overall}<small>Gesamt</small></strong></div><h3>{p.name}</h3><p className="country"><Flag countryName={p.countryName} src={p.flagPath}/>{p.countryName}</p><dl>{Object.entries(p.ratings).map(([key, value]) => <div key={key} className={`rating ${rarity(value)}`}><dt>{key === 'RUC' ? 'RÜC' : key}</dt><dd><strong>{value}</strong><small>{labels[rarity(value)]}</small></dd></div>)}</dl><p className="card-note">Profilwerte · kein Ergebnisbonus</p></article>;
}
