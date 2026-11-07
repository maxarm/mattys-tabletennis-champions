import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { expect, it, vi } from 'vitest'
import { TournamentApp } from '../app/App'
import { openRepository } from '../storage/repository'
import { createTournament } from '../domain/tournament'
import { context } from '../../tests/fixtures'
import type { PwaController } from './client'
it('blocks updates inside matches and never activates after a failed flush', async () => {
  const repo = await openRepository({ name: `pwa-${crypto.randomUUID()}` })
  const t = createTournament({ entryRound: 'final', winsRequired: 1 }, context())
  await repo.acquireSession('seed'); await repo.create(t, 'seed'); await repo.releaseSession('seed')
  const applyUpdate = vi.fn().mockResolvedValue(undefined)
  const controller: PwaController = { getStatus: () => 'updateAvailable', subscribe: () => () => {}, applyUpdate, dispose() {} }
  const view = render(<TournamentApp repository={repo} pwa={controller} />)
  try {
    await waitFor(() => expect(screen.getByRole('button', { name: 'Turnier fortsetzen' })).toBeEnabled())
    fireEvent.click(screen.getByRole('button', { name: 'Turnier fortsetzen' }))
    await waitFor(() => expect(screen.getByRole('button', { name: 'Spiel 1 öffnen' })).toBeEnabled())
    fireEvent.click(screen.getByRole('button', { name: 'Spiel 1 öffnen' }))
    await screen.findAllByRole('textbox')
    expect(screen.getByRole('button', { name: 'Jetzt aktualisieren' })).toBeDisabled()
    fireEvent.change(screen.getAllByRole('textbox')[0], { target: { value: '7' } })
    const dispatch = vi.spyOn(repo, 'dispatch').mockRejectedValue(new Error('Speicher blockiert'))
    fireEvent.click(screen.getByRole('button', { name: '← Zur Runde' }))
    await screen.findByText('Speicher blockiert')
    expect(screen.getAllByRole('textbox')[0]).toHaveValue('7')
    expect(applyUpdate).not.toHaveBeenCalled()
    dispatch.mockRestore()
    fireEvent.click(screen.getByRole('button', { name: '← Zur Runde' }))
    await waitFor(() => expect(screen.getByRole('button', { name: 'Spiel 1 öffnen' })).toBeEnabled())
    expect((await repo.loadActive())!.rounds[0].matches[0].draft[0][0]).toBe('7')
    // flush also gates a later update even with no pending text.
    const fail = vi.spyOn(repo, 'dispatch')
    fireEvent.click(screen.getByRole('button', { name: 'Jetzt aktualisieren' }))
    await waitFor(() => expect(applyUpdate).toHaveBeenCalledOnce())
    expect(fail).not.toHaveBeenCalled()
  } finally { view.unmount(); repo.close() }
})
it('keeps the old page when update flush fails before storage readiness', async () => {
  const repo = await openRepository({ name: `pwa-failure-${crypto.randomUUID()}` })
  vi.spyOn(repo, 'listArchives').mockRejectedValue(new Error('Lesefehler'))
  const applyUpdate = vi.fn()
  const controller: PwaController = { getStatus: () => 'updateAvailable', subscribe: () => () => {}, applyUpdate, dispose() {} }
  const view = render(<TournamentApp repository={repo} pwa={controller} />)
  try {
    await screen.findByText('Lesefehler')
    fireEvent.click(screen.getByRole('button', { name: 'Jetzt aktualisieren' }))
    await screen.findByText('Das Turnier ist noch nicht bereit.')
    expect(applyUpdate).not.toHaveBeenCalled()
    expect(screen.getByRole('heading', { name: 'Neue Meisterschaft' })).toBeInTheDocument()
  } finally { view.unmount(); repo.close() }
})
