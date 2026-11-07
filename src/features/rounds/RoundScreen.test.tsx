import { render, screen, fireEvent } from '@testing-library/react';
import { expect, it, vi } from 'vitest';
import { RoundScreen } from './RoundScreen';
import { createTournament, applyCommand } from '../../domain/tournament';
import { context } from '../../../tests/fixtures';
const ctx = context();
const tournament = createTournament({ entryRound: 'quarterfinal', winsRequired: 1 }, ctx);
const props = { busy: false, writable: true, onMatch: vi.fn(), onNext: vi.fn().mockResolvedValue(undefined) };
it('blocks next draw until all matches are completed and opens completed matches', () => {
    const first = tournament.rounds[0]!.matches[0]!;
    const t = applyCommand(tournament, { type: 'completeMatch', matchId: first.id, sets: [['11', '8']] }, ctx);
    render(<RoundScreen {...props} tournament={t}/>);
    expect(screen.getByRole('button', { name: 'Nächste Runde losen' })).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: /Spiel 1 öffnen/ }));
    expect(props.onMatch).toHaveBeenCalledWith(first.id);
    expect(screen.getByText('1 von 4 Spielen abgeschlossen')).toBeInTheDocument();
});
it('enables the draw after the complete round', () => {
    let t = tournament;
    for (const m of tournament.rounds[0]!.matches)
        t = applyCommand(t, { type: 'completeMatch', matchId: m.id, sets: [['11', '8']] }, ctx);
    render(<RoundScreen {...props} tournament={t}/>);
    expect(screen.getByRole('button', { name: 'Nächste Runde losen' })).toBeEnabled();
});
it('does not invent future pairings in the tree', () => {
    render(<RoundScreen {...props} tournament={tournament}/>);
    fireEvent.click(screen.getByRole('button', { name: 'Turnierbaum' }));
    expect(screen.getAllByText('Noch nicht ausgelost')).toHaveLength(2);
    expect(screen.queryByText(/Sieger Spiel/)).not.toBeInTheDocument();
});
it('connects only actual participants across redraws and separates bronze',()=>{
  let t=createTournament({entryRound:'semifinal',winsRequired:1},context())
  for(const m of t.rounds[0]!.matches)t=applyCommand(t,{type:'completeMatch',matchId:m.id,sets:[['11','8']]},ctx)
  t=applyCommand(t,{type:'drawNextRound',roundId:t.rounds[0]!.id},ctx)
  const {container}=render(<RoundScreen {...props} tournament={t}/>)
  fireEvent.click(screen.getByRole('button',{name:'Turnierbaum'}))
  expect(screen.getByText('Spiel um Platz 3')).toBeInTheDocument()
  expect(container.querySelectorAll('.tree-lines path')).toHaveLength(4)
  expect(screen.queryByText('Noch nicht ausgelost')).not.toBeInTheDocument()
})
