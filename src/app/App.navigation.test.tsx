import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { expect, it, vi } from 'vitest'
import { TournamentApp } from './App'
import { useTournament } from './useTournament'
import type { TournamentRepository } from '../storage/repository'
vi.mock('./useTournament',()=>({useTournament:vi.fn()}))
function session(flush:()=>Promise<void>) {
  const state:ReturnType<typeof useTournament>={tournament:undefined,archives:[],drafts:{},status:'dirty',message:'Ungespeicherte Eingaben',error:undefined,session:'writable',editDraft:vi.fn(),flush,blur:flush,dispatch:vi.fn(),create:vi.fn(),discardActive:vi.fn(),reload:vi.fn()}
  vi.mocked(useTournament).mockReturnValue(state)
  // The mocked hook is the sole repository consumer in this navigation test.
  const repository={} as TournamentRepository
  render(<TournamentApp repository={repository}/>)
}
it('waits for the outstanding flush before changing screen',async()=>{
  let resolve!:()=>void
  const flush=vi.fn(()=>new Promise<void>(yes=>{resolve=yes}))
  session(flush)
  fireEvent.click(screen.getByRole('button',{name:'Archiv'}))
  expect(flush).toHaveBeenCalledOnce()
  expect(screen.getByRole('heading',{name:'Neue Meisterschaft'})).toBeInTheDocument()
  resolve()
  expect(await screen.findByRole('heading',{name:'Eure Meisterschaften'})).toBeInTheDocument()
})
it('preserves the current screen when flush rejects',async()=>{
  session(vi.fn().mockRejectedValue(new Error('Entwurf konnte nicht gespeichert werden')))
  fireEvent.click(screen.getByRole('button',{name:'Archiv'}))
  await waitFor(()=>expect(screen.getByRole('alert')).toHaveTextContent('Entwurf konnte nicht gespeichert werden'))
  expect(screen.getByRole('heading',{name:'Neue Meisterschaft'})).toBeInTheDocument()
  expect(screen.queryByRole('heading',{name:'Eure Meisterschaften'})).not.toBeInTheDocument()
})
