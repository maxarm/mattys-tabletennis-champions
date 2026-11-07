import { StrictMode } from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import App, { TournamentApp } from './App';
import { openRepository } from '../storage/repository';
import { createTournament } from '../domain/tournament';
import { context } from '../../tests/fixtures';
const repositories: Awaited<ReturnType<typeof openRepository>>[] = [];
afterEach(() => { for (const repo of repositories)
    repo.close(); repositories.length = 0; });
async function repository() {
    const repo = await openRepository({ name: `ui-${crypto.randomUUID()}` });
    repositories.push(repo);
    return repo;
}
it('keeps setup visible when create fails and blocks double taps during a slow commit', async () => {
    const repo = await repository();
    let reject!: (reason: Error) => void;
    const create = vi.spyOn(repo, 'create').mockImplementation(() => new Promise((_, no) => { reject = no; }));
    render(<StrictMode><TournamentApp repository={repo}/></StrictMode>);
    const start = await screen.findByRole('button', { name: /Teams auslosen/ });
    await waitFor(() => expect(start).toBeEnabled());
    fireEvent.click(start);
    fireEvent.click(start);
    await waitFor(() => expect(create).toHaveBeenCalledOnce());
    reject(new Error('Speicher voll'));
    expect(await screen.findByRole('alert')).toHaveTextContent('Speicher voll');
    expect(screen.getByRole('heading', { name: 'Neue Meisterschaft' })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Viertelfinale.' })).not.toBeInTheDocument();
});
it('awaits flush and stays on home when the storage session is not ready', async () => {
    const repo = await repository();
    const t = createTournament({ entryRound: 'final', winsRequired: 1 }, context());
    await repo.acquireSession('seed');
    await repo.create(t, 'seed');
    await repo.releaseSession('seed');
    // The hook reports a load error, keeping readiness false; flush must reject.
    vi.spyOn(repo, 'listArchives').mockRejectedValue(new Error('Speicher nicht lesbar'));
    render(<TournamentApp repository={repo}/>);
    await screen.findByText('Speicher nicht lesbar');
    fireEvent.click(screen.getByRole('button', { name: 'Archiv' }));
    await waitFor(() => expect(screen.getAllByRole('alert').length).toBeGreaterThan(0));
    expect(screen.queryByRole('heading', { name: 'Eure Meisterschaften' })).not.toBeInTheDocument();
});
it('resumes the persisted round and opens fixed snapshot player cards', async () => {
    const repo = await repository();
    const t = createTournament({ entryRound: 'final', winsRequired: 1 }, context());
    await repo.acquireSession('seed');
    await repo.create(t, 'seed');
    await repo.releaseSession('seed');
    render(<StrictMode><TournamentApp repository={repo}/></StrictMode>);
    const resume = await screen.findByRole('button', { name: 'Turnier fortsetzen' });
    await waitFor(() => expect(resume).toBeEnabled());
    fireEvent.click(resume);
    expect(await screen.findByRole('heading', { name: 'Finale.' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Spiel 1 öffnen' }));
    expect(await screen.findByRole('button', { name: /Spiel abschließen/ })).toBeDisabled();
    for (const p of t.participants)
        expect(screen.getByRole('heading', { name: p.name })).toBeInTheDocument();
    expect(await repo.loadActive()).toEqual(t);
});
it('opens under StrictMode and releases its repository after unmount', async () => {
    const view = render(<StrictMode><App /></StrictMode>);
    expect(screen.getByRole('heading', { name: 'Matty’s Table Tennis Championships' })).toBeInTheDocument();
    await waitFor(() => expect(screen.getByRole('button', { name: /Teams auslosen/ })).toBeEnabled());
    view.unmount();
    const probe = await openRepository();
    repositories.push(probe);
    await waitFor(async () => expect(await probe.acquireSession('after-unmount')).toBe(true));
    await probe.releaseSession('after-unmount');
});
it('preserves conflict inputs on cancel and explicitly reloads saved state before navigation', async () => {
    const repo = await repository();
    const t = createTournament({ entryRound: 'final', winsRequired: 1 }, context());
    await repo.acquireSession('seed');
    await repo.create(t, 'seed');
    await repo.releaseSession('seed');
    render(<TournamentApp repository={repo}/>);
    const resume = await screen.findByRole('button', { name: 'Turnier fortsetzen' });
    await waitFor(() => expect(resume).toBeEnabled());
    fireEvent.click(resume);
    fireEvent.click(await screen.findByRole('button', { name: 'Spiel 1 öffnen' }));
    const inputs = await screen.findAllByRole('textbox');
    // Advance the actual stored revision while this mounted editor keeps its snapshot.
    const original = repo.dispatch.bind(repo);
    vi.spyOn(repo, 'dispatch').mockImplementationOnce(async (...args) => {
        await original(t.id, 0, 'foreign', { type: 'saveDraft', matchId: t.rounds[0].matches[0].id, sets: [['5', '3']] }, args[4]);
        return original(...args);
    });
    fireEvent.change(inputs[0], { target: { value: '8' } });
    fireEvent.blur(inputs[0]);
    await screen.findByRole('alert');
    fireEvent.click(screen.getByRole('button', { name: 'Gespeicherten Stand laden' }));
    fireEvent.click(screen.getByRole('button', { name: 'Abbrechen' }));
    expect(inputs[0]).toHaveValue('8');
    expect((await repo.loadActive())?.rounds[0].matches[0].draft).toEqual([['5', '3']]);
    fireEvent.click(screen.getByRole('button', { name: 'Gespeicherten Stand laden' }));
    fireEvent.click(screen.getByRole('button', { name: 'Eingaben verwerfen und laden' }));
    await waitFor(() => expect(screen.getByRole('button', { name: 'Turnier fortsetzen' })).toBeEnabled());
    fireEvent.click(screen.getByRole('button', { name: 'Turnier fortsetzen' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Spiel 1 öffnen' }));
    expect((await screen.findAllByRole('textbox'))[0]).toHaveValue('5');
    fireEvent.click(screen.getByRole('button', { name: 'Archiv' }));
    expect(await screen.findByRole('heading', { name: 'Eure Meisterschaften' })).toBeInTheDocument();
});
