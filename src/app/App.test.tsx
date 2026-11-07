import { render, screen } from '@testing-library/react'
import { expect, it } from 'vitest'
import App from './App'
it('zeigt den festgelegten Titel und eine deutsche Beschreibung', () => {
  render(<App />)
  expect(screen.getByRole('heading', { name: 'Matty’s Table Tennis Championships', level: 1 })).toBeInTheDocument()
  expect(screen.getByText('Dein Tischtennisturnier für zuhause.')).toBeInTheDocument()
})
