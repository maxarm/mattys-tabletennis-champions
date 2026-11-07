// Own vector artwork rendered locally using the project's browser dependency.
import { chromium } from '@playwright/test'
import { readFile } from 'node:fs/promises'
const browser = await chromium.launch({ headless: true })
try {
  const page = await browser.newPage()
  const svg = await readFile('public/icons/source.svg', 'utf8')
  for (const [name, size] of [['icon-192', 192], ['icon-512', 512], ['maskable-512', 512], ['apple-touch-icon', 180]]) {
    await page.setViewportSize({ width: size, height: size })
    await page.setContent(`<style>body{margin:0;background:#214f3e}svg{width:100vw;height:100vh}</style>${svg}`)
    await page.screenshot({ path: `public/icons/${name}.png` })
  }
} finally { await browser.close() }
