import { test, expect, type Page } from '@playwright/test'
import { repeatedClick, saved, slowStorage, snapshots } from './helpers'

async function ready(page: Page) {
  await page.goto('/')
  await expect(page.getByText('Offline bereit auf diesem Gerät.')).toBeVisible()
  await saved(page)
}
async function start(page: Page, round: string, wins: number) {
  await page.getByRole('radio', { name: round, exact: true }).check()
  await page.getByRole('radio', { name: new RegExp(`^${wins} Satzsiege?$`) }).check()
  await page.getByRole('button', { name: /Teams auslosen/ }).click()
  await expect(page.getByRole('button', { name: 'Spiel 1 öffnen', exact: true })).toBeVisible()
}
async function playCurrentRound(page: Page, wins: number, total: number, repeated = false) {
  await expect(page.locator('article.match')).toHaveCount(total)
  for (let i = 0; i < total; i++) {
    await page.getByRole('button', { name: `Spiel ${i + 1} öffnen`, exact: true }).click()
    for (let set = 0; set < wins; set++) {
      const inputs = page.locator('input[inputmode="numeric"]')
      await inputs.nth(set * 2).fill('11')
      await inputs.nth(set * 2 + 1).fill('0')
    }
    if (repeated) await repeatedClick(page, /Spiel abschließen/)
    else await page.getByRole('button', { name: /Spiel abschließen/ }).click()
    await expect(page.getByRole('button', { name: `Spiel ${i + 1} öffnen, abgeschlossen`, exact: true })).toBeVisible()
  }
}
for (const [round, counts, participants] of [
  ['Achtelfinale', [8, 4, 2, 2], 16],
  ['Viertelfinale', [4, 2, 2], 8],
  ['Halbfinale', [2, 2], 4],
  ['Finale', [1], 2],
] as const) {
  test(`championship from ${round} through immutable archive`, async ({ page, request }) => {
    await request.get('/__version?v=a')
    await ready(page)
    await start(page, round, 1)
    for (let index = 0; index < counts.length; index++) {
      await playCurrentRound(page, 1, counts[index]!)
      if (index < counts.length - 1) {
        await page.getByRole('button', { name: /Nächste Runde losen|Finalrunde auslosen/ }).click()
        await expect(page.getByText(`0 von ${counts[index + 1]} Spielen abgeschlossen`)).toBeVisible()
      }
    }
    await page.getByRole('button', { name: /Zur Siegerehrung/ }).click()
    const placements = page.getByRole('list', { name: 'Platzierungen' })
    await expect(placements.getByRole('listitem')).toHaveCount(participants)
    await page.getByRole('button', { name: 'Speichern und Beenden' }).click()
    await saved(page)
    const archived = await snapshots(page)
    expect(archived).toHaveLength(1)
    expect(archived[0]!.status).toBe('archived')
    expect(archived[0]!.rounds.map(r => r.matches.length)).toEqual(counts)
    await page.getByRole('button', { name: 'Archiv', exact: true }).click()
    await page.getByRole('button', { name: /Meisterschaft ansehen/ }).click()
    await expect(page.getByRole('heading', { name: 'Meisterschaft im Archiv' })).toBeVisible()
    await expect(page.locator('article.archive-card')).toHaveCount(counts.reduce((a, b) => a + b, 0))
    await expect(page.getByRole('button', { name: 'Speichern und Beenden' })).toHaveCount(0)
    await expect(page.locator('input')).toHaveCount(0)
    await page.reload()
    await saved(page)
    expect(await snapshots(page)).toEqual(archived)
  })
}
for (const wins of [1, 2, 3]) {
  test(`score matrix requires ${wins} set wins and preserves snapshot across reload`, async ({ page, request }) => {
    await request.get('/__version?v=a')
    await ready(page)
    await start(page, 'Finale', wins)
    await page.getByRole('button', { name: 'Spiel 1 öffnen', exact: true }).click()
    const inputs = page.locator('input[inputmode="numeric"]')
    await inputs.nth(0).fill('11')
    await inputs.nth(1).fill('0')
    await inputs.nth(1).blur()
    await saved(page)
    if (wins > 1) await expect(page.getByRole('button', { name: /Spiel abschließen/ })).toBeDisabled()
    const before = await snapshots(page)
    await page.reload()
    await saved(page)
    expect(await snapshots(page)).toEqual(before)
    await page.getByRole('button', { name: 'Turnier fortsetzen' }).click()
    await page.getByRole('button', { name: 'Spiel 1 öffnen', exact: true }).click()
    await expect(inputs.nth(0)).toHaveValue('11', { timeout: 22000 })
    await expect(inputs.nth(1)).toHaveValue('0')
    for (let set = 1; set < wins; set++) {
      await inputs.nth(set * 2).fill('11')
      await inputs.nth(set * 2 + 1).fill('0')
    }
    await page.getByRole('button', { name: /Spiel abschließen/ }).click()
    await expect(page.getByRole('button', { name: /Zur Siegerehrung/ })).toBeVisible()
    const [finished] = await snapshots(page)
    expect(finished!.status).toBe('finished')
    const match = finished!.rounds[0]!.matches[0]!
    expect(match.status === 'completed' && match.result.setWins).toEqual([wins, 0])
  })
}

test('repeated clicks during slow commits create, draw, complete and archive only once', async ({ page, request }) => {
  await slowStorage(page)
  await request.get('/__version?v=a')
  await ready(page)
  await page.getByRole('radio', { name: 'Halbfinale', exact: true }).check()
  await repeatedClick(page, /Teams auslosen/)
  await expect(page.getByRole('button', { name: 'Spiel 1 öffnen', exact: true })).toBeVisible()
  const [initial] = await snapshots(page)
  await playCurrentRound(page, 1, 2, true)
  await repeatedClick(page, /Finalrunde auslosen/)
  await expect(page.getByText('0 von 2 Spielen abgeschlossen')).toBeVisible()
  const [drawn] = await snapshots(page)
  expect(drawn!.rounds).toHaveLength(2)
  expect(drawn!.participants).toEqual(initial!.participants)
  await playCurrentRound(page, 1, 2, true)
  await page.getByRole('button', { name: /Zur Siegerehrung/ }).click()
  await repeatedClick(page, /Speichern und Beenden/)
  await expect(page.getByRole('button', { name: /Teams auslosen/ })).toBeVisible()
  await saved(page)
  const all = await snapshots(page)
  expect(all).toHaveLength(1)
  expect(all[0]!.id).toBe(initial!.id)
  expect(all[0]!.status).toBe('archived')
  expect(all[0]!.rounds.map(r => r.matches.length)).toEqual([2, 2])
  expect(all[0]!.rounds[1]!.id).toBe(drawn!.rounds[1]!.id)
})
