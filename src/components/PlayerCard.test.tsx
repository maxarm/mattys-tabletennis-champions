import { render, screen } from '@testing-library/react';
import { expect, it } from 'vitest';
import { PlayerCard } from './PlayerCard';
import { Portrait } from './Portrait';
import { createTournament } from '../domain/tournament';
import { PLAYERS, COUNTRIES } from '../domain/catalog';
import { context } from '../../tests/fixtures';
import { readFileSync } from 'node:fs';
it('names rarity bands and shows snapshot strength without an overall rarity', () => {
    const participant = { ...createTournament({ entryRound: 'final', winsRequired: 1 }, context()).participants[0]!, overall: 89, ratings: { ANG: 84, VER: 85, SVC: 90, VOR: 95, RUC: 100 } };
    render(<PlayerCard participant={participant}/>);
    expect(screen.getByText('Gewöhnlich')).toBeInTheDocument();
    expect(screen.getByText('Legendär')).toBeInTheDocument();
    expect(screen.getByText('Episch')).toBeInTheDocument();
    expect(screen.getAllByText('Mythisch')).toHaveLength(2);
    expect(screen.getByText('RÜC')).toBeInTheDocument();
    expect(screen.getByText('89')).toBeInTheDocument();
    expect(screen.getByRole('img', { name: `Flagge ${participant.countryName}` })).toHaveAttribute('src', participant.flagPath);
});
it('renders all fixed identities deterministically without random sources', () => {
    for (const player of PLAYERS) {
        const { container, rerender, unmount } = render(<Portrait definition={player.portrait}/>);
        const before = container.innerHTML;
        rerender(<Portrait definition={{ ...player.portrait }}/>);
        expect(container.innerHTML).toBe(before);
        expect(container.querySelector('svg')).toHaveAttribute('viewBox', '0 0 120 132');
        unmount();
    }
});
it('ships a self contained SVG flag for every catalog country, including England', () => {
    expect(COUNTRIES).toHaveLength(23);
    for (const country of COUNTRIES) {
        const svg = readFileSync(`public${country.flagPath}`, 'utf8');
        expect(svg).toContain('<svg');
        expect(svg).not.toMatch(/(?:href|src)=|<script/);
    }
    expect(readFileSync('public/flags/eng.svg', 'utf8')).toContain('#ce1124');
});
