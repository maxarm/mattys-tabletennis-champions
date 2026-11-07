import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './app/App'
import { registerPwa } from './pwa/client'

const root = document.getElementById('root')
if (!root) throw new Error('Das Startelement der App fehlt.')
const pwa = registerPwa()
createRoot(root).render(<StrictMode><App pwa={pwa} /></StrictMode>)
