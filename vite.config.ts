import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
export default defineConfig({ plugins: [react(), VitePWA({
  strategies: 'injectManifest', srcDir: 'src/pwa', filename: 'sw.ts', injectRegister: false,
  injectManifest: { globPatterns: ['**/*.{html,js,css,svg,png,webmanifest}'] },
  manifest: {
    name: 'Matty’s Table Tennis Championships', short_name: 'Matty’s', lang: 'de',
    start_url: '/', scope: '/', display: 'standalone', background_color: '#f7f0df', theme_color: '#214f3e',
    icons: [ { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' }, { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' }, { src: '/icons/maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' } ],
  },
})], server: { host: '0.0.0.0', port: 5173, strictPort: true }, preview: { host: '0.0.0.0', port: 5173, strictPort: true } })
