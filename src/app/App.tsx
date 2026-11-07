import { useEffect, useRef, useState } from 'react';
import { openRepository, storageMessage, type TournamentRepository } from '../storage/repository';
import { newSessionId } from '../storage/session';
import { createTournament } from '../domain/tournament';
import type { Settings } from '../domain/types';
import { useTournament } from './useTournament';
import { HomeScreen } from '../features/home/HomeScreen';
import { RoundScreen } from '../features/rounds/RoundScreen';
import { PlayerCard } from '../components/PlayerCard';
import { StatusMessage } from '../components/StatusMessage';
import '../styles/tokens.css';
import '../styles/global.css';
export type Screen = {
    type: 'home';
} | {
    type: 'round';
} | {
    type: 'match';
    matchId: string;
} | {
    type: 'results';
} | {
    type: 'archive';
} | {
    type: 'archiveDetail';
    tournamentId: string;
};
export function TournamentApp({ repository }: {
    repository: TournamentRepository;
}) {
    const state = useTournament(repository);
    const [screen, setScreen] = useState<Screen>({ type: 'home' });
    const [navigationError, setNavigationError] = useState<string>();
    const [busy, setBusy] = useState(false);
    const lock = useRef(false);
    const pendingCreation = useRef<ReturnType<typeof createTournament> | undefined>(undefined);
    const drawOperation = useRef<{
        roundId: string;
        operationId: string;
    } | undefined>(undefined);
    async function action(work: () => Promise<void>) {
        if (lock.current)
            return;
        lock.current = true;
        setBusy(true);
        setNavigationError(undefined);
        try {
            await work();
        }
        catch (e) {
            setNavigationError(storageMessage(e));
        }
        finally {
            lock.current = false;
            setBusy(false);
        }
    }
    async function navigate(target: Screen) { await action(async () => { await state.flush(); setScreen(target); }); }
    async function create(settings: Settings) {
        await action(async () => {
            const old = pendingCreation.current;
            const snapshot = old && old.settings.entryRound === settings.entryRound && old.settings.winsRequired === settings.winsRequired ? old : createTournament(settings, { random: Math.random, newId: newSessionId, now: () => new Date().toISOString() });
            pendingCreation.current = snapshot;
            await state.create(snapshot);
            await state.flush();
            pendingCreation.current = undefined;
            setScreen({ type: 'round' });
        });
    }
    const t = state.tournament;
    const disabled = busy || state.status === 'loading' || state.session === 'loading';
    const writable = state.session === 'writable';
    const match = screen.type === 'match' ? t?.rounds.flatMap(r => r.matches).find(m => m.id === screen.matchId) : undefined;
    return <><header className="app-header"><div className="brand"><span className="brand-mark" aria-hidden="true">m.</span><div><h1>Matty’s Table Tennis Championships</h1><p>Dein Tischtennisturnier für zuhause.</p></div></div><nav aria-label="Hauptmenü"><button disabled={disabled} aria-current={screen.type === 'home' ? 'page' : undefined} onClick={() => void navigate({ type: 'home' })}>Start</button><button disabled={disabled} aria-current={screen.type === 'archive' ? 'page' : undefined} onClick={() => void navigate({ type: 'archive' })}>Archiv</button></nav></header>
    <main><div className="status-row"><StatusMessage message={state.message} error={state.status === 'error'}/>{state.session === 'readonly' && <StatusMessage message="Ein anderer Tab bearbeitet das Turnier. Diese Ansicht ist nur lesbar."/>}</div>{navigationError && navigationError !== state.error && <StatusMessage message={navigationError} error/>}
      {screen.type === 'home' && <HomeScreen tournament={t} busy={disabled} writable={writable} archiveCount={state.archives.length} onCreate={create} onResume={() => navigate({ type: t?.status === 'finished' ? 'results' : 'round' })} onDiscard={() => action(async () => { await state.discardActive(); pendingCreation.current = undefined; })} onArchive={() => void navigate({ type: 'archive' })}/>}
      {screen.type === 'round' && t && <><button className="back" disabled={disabled} onClick={() => void navigate({ type: 'home' })}>← Zum Start</button><RoundScreen tournament={t} busy={disabled} writable={writable} onMatch={matchId => void navigate({ type: 'match', matchId })} onNext={() => action(async () => {
                const round = t.rounds.at(-1)!;
                if (drawOperation.current?.roundId !== round.id)
                    drawOperation.current = { roundId: round.id, operationId: newSessionId() };
                await state.dispatch({ type: 'drawNextRound', roundId: round.id }, drawOperation.current.operationId);
                await state.flush();
            })}/>{t.status === 'finished' && <button className="primary" disabled={disabled} onClick={() => void navigate({ type: 'results' })}>Zur Siegerehrung →</button>}</>}
      {screen.type === 'match' && match && t && <section><button className="back" disabled={disabled} onClick={() => void navigate({ type: 'round' })}>← Zur Runde</button><span className="eyebrow">Die Gesichter an der Platte</span><h2>{match.kind === 'bronze' ? 'Spiel um Platz 3' : 'Aufschlag!'}</h2><div className="players">{match.participantIds.map(id => <PlayerCard key={id} participant={t.participants.find(p => p.id === id)!}/>)}</div><div className="paper placeholder"><h3>Ergebniseingabe folgt in Task 5</h3><p>Diese Partie ist gespeichert. Die Ergebnisfelder werden im nächsten Schritt ergänzt.</p></div></section>}
      {(screen.type === 'results' || screen.type === 'archive' || screen.type === 'archiveDetail') && <section className="paper placeholder"><h2>{screen.type === 'results' ? 'Siegerehrung' : screen.type === 'archive' ? 'Eure Meisterschaften' : 'Meisterschaft im Archiv'}</h2><p>Diese Ansicht folgt in Task 5.</p><button disabled={disabled} onClick={() => void navigate({ type: screen.type === 'results' ? 'round' : 'home' })}>← {screen.type === 'results' ? 'Zur Runde' : 'Zum Start'}</button></section>}
    </main><footer className="app-footer">An der Platte entscheidet ihr. Die Zahlen sind nur Charakter.</footer></>;
}
// Opening happens only in an effect. A cancelled StrictMode opening closes its
// own handle before any hook mounts; the mounted hook retains a stable repository.
export default function App() {
    const [repository, setRepository] = useState<TournamentRepository>();
    const [error, setError] = useState<string>();
    useEffect(() => {
        let cancelled = false;
        let opened: TournamentRepository | undefined;
        let sessionStarted = false;
        void openRepository().then(raw => {
            if (cancelled) {
                raw.close();
                return;
            }
            // Wrap once at the ownership boundary, without mutating the repository.
            opened = raw;
            const managed: TournamentRepository = {
                ...raw,
                acquireSession(id) { sessionStarted = true; return raw.acquireSession(id); },
                async releaseSession(id) {
                    try {
                        await raw.releaseSession(id);
                    }
                    finally {
                        if (cancelled)
                            raw.close();
                    }
                },
            };
            setRepository(managed);
        }).catch(e => { if (!cancelled)
            setError(storageMessage(e)); });
        return () => {
            cancelled = true;
            // Otherwise the hook's serialized cleanup releases the session first.
            if (!sessionStarted)
                opened?.close();
        };
    }, []);
    if (error)
        return <main><h1>Matty’s Table Tennis Championships</h1><StatusMessage message={error} error/></main>;
    return repository ? <TournamentApp repository={repository}/> : <main><h1>Matty’s Table Tennis Championships</h1><p>Dein Tischtennisturnier für zuhause.</p><StatusMessage message="Wird geladen"/></main>;
}
