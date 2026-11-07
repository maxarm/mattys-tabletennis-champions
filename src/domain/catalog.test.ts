import { describe, expect, it, vi } from 'vitest'
import { CATALOG_VERSION, COUNTRIES, PLAYERS } from './catalog'

const design = [
  [
    "Deutschland",
    "Jonas Schmitt",
    "Lukas Weber",
    "Benno Netzroller"
  ],
  [
    "Österreich",
    "Franz Hinterberger",
    "Lukas Gruber",
    "Sepp Schmetterer"
  ],
  [
    "Nigeria",
    "Oshimen",
    "Chinedu Okafor",
    "Tunde Topspin Adeyemi"
  ],
  [
    "Japan",
    "Haruto Tanaka",
    "Ren Sato",
    "Takumi Pingponda"
  ],
  [
    "China",
    "Ching Chang Chung",
    "Wei Zhang",
    "Hao Qiu"
  ],
  [
    "Polen",
    "Piotr Kowalski",
    "Jakub Nowak",
    "Piotr Paletkowski"
  ],
  [
    "Slowakei",
    "Martin Kováč",
    "Lukáš Horváth",
    "Marek Smečík"
  ],
  [
    "Tschechien",
    "Jan Novák",
    "Tomáš Svoboda",
    "Petr Pálka"
  ],
  [
    "Schweden",
    "Erik Lindberg",
    "Johan Nyström",
    "Bosse Kantboll"
  ],
  [
    "Dänemark",
    "Mikael Larsson",
    "Mikkel Nielsen",
    "Bo Bordtennis"
  ],
  [
    "Kroatien",
    "Disch Denisovic",
    "Luka Kovačević",
    "Goran Mrežić"
  ],
  [
    "Uruguay",
    "Martín Rodríguez",
    "Diego Fernández",
    "Pablo Paleta"
  ],
  [
    "Spanien",
    "Pablo García",
    "Alejandro Martín",
    "Paco Pelotazo"
  ],
  [
    "Australien",
    "Player without Name",
    "Jack Wilson",
    "Bruce Backspin"
  ],
  [
    "Schweiz",
    "Luca Meier",
    "Simon Keller",
    "Beat Netzli"
  ],
  [
    "England",
    "Oliver Smith",
    "Harry Bennett",
    "Harry Edgesworth"
  ],
  [
    "Frankreich",
    "Hugo Moreau",
    "Louis Dubois",
    "Jean-Philippe Filet"
  ],
  [
    "Italien",
    "Matteo Rossi",
    "Luca Bianchi",
    "Gigi Racchetta"
  ],
  [
    "Liechtenstein",
    "Lukas Büchel",
    "David Frommelt",
    "Fürst Flip von Vaduz"
  ],
  [
    "Südkorea",
    "Min-jun Kim",
    "Seo-jun Park",
    "Kim Ping-pong"
  ],
  [
    "Argentinien",
    "Mateo González",
    "Santiago Fernández",
    "Diego Paletazo"
  ],
  [
    "Portugal",
    "João Silva",
    "Tiago Pereira",
    "João Raquetinha"
  ],
  [
    "Brasilien",
    "Pedro Santos",
    "Lucas Oliveira",
    "Zé Saque"
  ]
] as const

describe('fester Designkatalog', () => {
  it('enthält genau 23 Länder und 69 eindeutige Identitäten in Designreihenfolge', () => {
    expect(CATALOG_VERSION).toBe(1)
    expect(COUNTRIES).toHaveLength(23)
    expect(PLAYERS).toHaveLength(69)
    expect(new Set(COUNTRIES.map(c => c.id)).size).toBe(23)
    expect(new Set(PLAYERS.map(p => p.id)).size).toBe(69)
    expect(COUNTRIES.map(c => c.name)).toEqual(design.map(row => row[0]))
    for (const [index, country] of COUNTRIES.entries()) {
      expect(PLAYERS.filter(p => p.countryId === country.id).map(p => p.name)).toEqual(design[index].slice(1))
      expect(country.flagPath).toMatch(/^\/flags\/[a-z-]+\.svg$/)
    }
  })
  it('erhält die sieben Pflichtnamen wortgleich', () => {
    for (const name of ['Jonas Schmitt', 'Franz Hinterberger', 'Oshimen', 'Ching Chang Chung', 'Mikael Larsson', 'Disch Denisovic', 'Player without Name']) {
      expect(PLAYERS.filter(p => p.name === name)).toHaveLength(1)
    }
  })
  it('enthält nur die vereinbarten Länderfaktoren', () => {
    const favored: Record<string, number> = { China: 2, Japan: 1.8, Deutschland: 1.6, Frankreich: 1.45, Österreich: 1.3, Kroatien: 1.15 }
    for (const country of COUNTRIES) expect(country.strengthFactor).toBe(favored[country.name] ?? 1)
  })
  it('hat feste, unterschiedliche und serialisierbare Porträts', async () => {
    const before = JSON.stringify(PLAYERS)
    expect(new Set(PLAYERS.map(p => JSON.stringify(p.portrait))).size).toBe(69)
    for (const player of PLAYERS) {
      expect(player.portrait).toEqual(expect.objectContaining({ face: expect.any(String), hair: expect.any(String), accessory: expect.any(String) }))
      expect(JSON.parse(JSON.stringify(player.portrait))).toEqual(player.portrait)
    }
    vi.resetModules()
    const again = await import('./catalog')
    expect(JSON.stringify(again.PLAYERS)).toBe(before)
  })
})
