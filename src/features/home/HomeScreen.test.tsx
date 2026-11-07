import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { expect, it, vi } from 'vitest';
import { HomeScreen } from './HomeScreen';
import { createTournament } from '../../domain/tournament';
import { context } from '../../../tests/fixtures';
const base = () => ({ busy: false, writable: true, archiveCount: 0, onCreate: vi.fn().mockResolvedValue(undefined), onResume: vi.fn().mockResolvedValue(undefined), onDiscard: vi.fn().mockResolvedValue(undefined), onArchive: vi.fn() });
it('defaults to quarterfinal and one win with eight teams and eight matches', () => {
    render(<HomeScreen {...base()}/>);
    expect(screen.getByRole('radio', { name: 'Viertelfinale' })).toBeChecked();
    expect(screen.getByRole('radio', { name: '1 Satzsieg' })).toBeChecked();
    expect(screen.getByText('8 Nationalteams · 8 Spiele inkl. Platz 3')).toBeInTheDocument();
});
it('guards a pending create against double taps', async () => {
    const props = base();
    props.onCreate.mockImplementation(() => new Promise(() => { }));
    render(<HomeScreen {...props}/>);
    const button = screen.getByRole('button', { name: /Teams auslosen/ });
    fireEvent.click(button);
    fireEvent.click(button);
    await waitFor(() => expect(props.onCreate).toHaveBeenCalledTimes(1));
    expect(props.onCreate).toHaveBeenCalledWith({ entryRound: 'quarterfinal', winsRequired: 1 });
});
it('requires explicit discard confirmation and offers resume', async () => {
    const props = base();
    render(<HomeScreen {...props} tournament={createTournament({ entryRound: 'final', winsRequired: 1 }, context())}/>);
    fireEvent.click(screen.getByRole('button', { name: 'Turnier fortsetzen' }));
    await waitFor(() => expect(screen.getByRole('button', { name: 'Turnier fortsetzen' })).toBeEnabled());
    expect(props.onResume).toHaveBeenCalledOnce();
    fireEvent.click(screen.getByRole('button', { name: 'Turnier verwerfen' }));
    expect(props.onDiscard).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Ja, Turnier verwerfen' }));
    await waitFor(() => expect(props.onDiscard).toHaveBeenCalledOnce());
});
