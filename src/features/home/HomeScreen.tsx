import { useRef, useState } from 'react';
import type { Settings, Tournament } from '../../domain/types';
import { stageNames } from '../rounds/labels';
export interface HomeScreenProps {
    tournament?: Tournament;
    busy: boolean;
    writable: boolean;
    archiveCount: number;
    onCreate: (settings: Settings) => Promise<unknown>;
    onResume: () => Promise<unknown>;
    onDiscard: () => Promise<unknown>;
    onArchive: () => void;
}
export function HomeScreen({ tournament, busy, writable, archiveCount, onCreate, onResume, onDiscard, onArchive }: HomeScreenProps) {
    const [settings, setSettings] = useState<Settings>({ entryRound: 'quarterfinal', winsRequired: 1 });
    const [confirm, setConfirm] = useState(false);
    const [pending, setPending] = useState(false);
    const lock = useRef(false);
    async function run(action: () => Promise<unknown>) {
        if (lock.current)
            return;
        lock.current = true;
        setPending(true);
        try {
            await action();
            setConfirm(false);
        }
        catch { /* Parent displays persistence errors. */ }
        finally {
            lock.current = false;
            setPending(false);
        }
    }
    const disabled = busy || pending || !writable;
    const count = { roundOf16: 16, quarterfinal: 8, semifinal: 4, final: 2 }[settings.entryRound];
    const active = tournament && tournament.status !== 'archived';
    return <section className="home-layout">
    <div className="hero"><span className="eyebrow">Eure Platte. Eure Meisterschaft.</span><div className="paddle" aria-hidden="true"><i /></div><h2>Kleine Platte.<br />Große Legenden.</h2><p>Ein Smartphone. Zwei Menschen.<br />Und jede Menge Tischtennis.</p><span className="hero-note">MATTY’S CHAMPIONSHIP CLUB · EST. 2026</span></div>
    <div className="setup paper"><span className="eyebrow">Ab an die Platte</span><h2>{active ? 'Euer Turnier wartet.' : 'Neue Meisterschaft'}</h2>
    {active ? <><p>{stageNames[tournament.rounds.at(-1)!.stage]} · {tournament.participants.length} Nationalteams · {tournament.settings.winsRequired} Satzsiege benötigt</p><button className="primary" disabled={busy || pending} onClick={() => void run(onResume)}>Turnier fortsetzen</button>
      {!confirm ? <button className="text-button" disabled={disabled} onClick={() => setConfirm(true)}>Turnier verwerfen</button> : <div className="confirmation" role="group" aria-label="Turnier verwerfen bestätigen"><p>Dieses laufende Turnier wird dauerhaft verworfen. Wirklich neu beginnen?</p><button disabled={disabled} onClick={() => void run(onDiscard)}>Ja, Turnier verwerfen</button><button onClick={() => setConfirm(false)}>Behalten</button></div>}</> : <>
      <fieldset disabled={disabled}><legend>In welcher Runde steigt ihr ein?</legend><div className="choices">{(['roundOf16', 'quarterfinal', 'semifinal', 'final'] as const).map(stage => <label key={stage}><input type="radio" name="round" checked={settings.entryRound === stage} onChange={() => setSettings({ ...settings, entryRound: stage })}/><span>{stageNames[stage]}</span></label>)}</div></fieldset>
      <p className="muted">{count} Nationalteams · {count === 2 ? '1 Spiel' : `${count} Spiele inkl. Platz 3`}</p>
      <fieldset disabled={disabled}><legend>Wie viele Satzsiege braucht ihr?</legend><div className="choices">{([1, 2, 3] as const).map(wins => <label key={wins}><input type="radio" name="wins" checked={settings.winsRequired === wins} onChange={() => setSettings({ ...settings, winsRequired: wins })}/><span>{wins} {wins === 1 ? 'Satzsieg' : 'Satzsiege'}</span></label>)}</div></fieldset>
      <p className="muted">Bis 11 Punkte · zwei Punkte Vorsprung</p><button className="primary" disabled={disabled} onClick={() => void run(() => onCreate(settings))}>Teams auslosen &amp; starten ↗</button></>}
      <button className="archive-link" disabled={busy || pending} onClick={onArchive}>Eure bisherigen Meisterschaften <span>({archiveCount}) ↗</span></button><p className="muted">Turnierdaten bleiben in diesem Browser auf diesem Gerät.</p>
    </div></section>;
}
