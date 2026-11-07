import type { Tournament } from '../../domain/types';
import { stageNames } from './labels';
export function TournamentTree({ tournament: t, onMatch }: {
    tournament: Tournament;
    onMatch: (id: string) => void;
}) {
    const stages = (['roundOf16', 'quarterfinal', 'semifinal', 'medal'] as const).slice({ roundOf16: 0, quarterfinal: 1, semifinal: 2, final: 3 }[t.settings.entryRound]);
    const columns = stages.map(stage => ({ stage, round: t.rounds.find(r => r.stage === stage || (stage === 'medal' && r.stage === 'final')) }));
    const width = columns.length * 256;
    // Connections follow participant identity, never bracket slot assumptions: every round is redrawn.
    const edges = columns.flatMap((column, index) => {
        const next = columns[index + 1]?.round;
        if (!column.round || !next)
            return [];
        return column.round.matches.flatMap((source, sourceIndex) => next.matches.flatMap((target, targetIndex) => target.participantIds.filter(id => source.participantIds.includes(id)).map(id => ({ id: `${source.id}-${target.id}-${id}`, x1: index * 256 + 224, y1: 70 + sourceIndex * 150 + source.participantIds.indexOf(id) * 30, x2: (index + 1) * 256 + 8, y2: 70 + targetIndex * 150 + target.participantIds.indexOf(id) * 30 }))));
    });
    return <div className="tree-scroll" role="region" aria-label="Turnierbaum, horizontal scrollbar" tabIndex={0}><div className="tree" style={{ width, minHeight: Math.max(...t.rounds.map(r => r.matches.length)) * 150 + 80 }}>
    <svg className="tree-lines" width={width} height="100%" aria-hidden="true">{edges.map(e => <path key={e.id} d={`M${e.x1} ${e.y1} C${e.x1 + 16} ${e.y1},${e.x2 - 16} ${e.y2},${e.x2} ${e.y2}`}/>)}</svg>
    {columns.map(({ stage, round }) => <section className="tree-column" key={stage}><h3>{round ? stageNames[round.stage] : stageNames[stage]}</h3>{round ? round.matches.map((match, i) => <div key={match.id} className={`tree-node ${match.kind === 'bronze' ? 'bronze' : ''}`}><button onClick={() => onMatch(match.id)} aria-label={`${stageNames[round.stage]} Spiel ${i + 1} öffnen`}><small>{match.kind === 'bronze' ? 'Spiel um Platz 3' : match.kind === 'final' ? 'Finale' : `Spiel ${i + 1}`}</small>{match.participantIds.map(id => <span key={id}>{t.participants.find(p => p.id === id)!.countryName}{match.status === 'completed' && match.result.winnerId === id ? ' ✓' : ''}</span>)}</button></div>) : <p className="future">Noch nicht ausgelost</p>}</section>)}
  </div></div>;
}
