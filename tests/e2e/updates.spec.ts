import { test, expect, type Page } from '@playwright/test'
async function ready(page: Page) {
  await page.goto('/')
  await expect(page.getByText('Offline bereit auf diesem Gerät.')).toBeVisible()
}
async function checkUpdate(page: Page) {
  await page.evaluate(async () => { await (await navigator.serviceWorker.getRegistration())!.update() })
}
async function draft(page: Page) {
  await page.getByRole('radio', { name: 'Finale', exact: true }).check()
  await page.getByRole('button', { name: /Teams auslosen/ }).click()
  await page.getByRole('button', { name: 'Spiel 1 öffnen' }).click()
  await page.locator('input[inputmode="numeric"]').nth(0).fill('7')
  await page.locator('input[inputmode="numeric"]').nth(1).fill('3')
}
test('declining keeps match and draft; explicit saved update loads next version with same data', async ({ page, request }) => {
  await request.get('/__version?v=a'); await ready(page); await draft(page)
  const oldController = await page.evaluate(() => navigator.serviceWorker.controller!.scriptURL)
  await request.get('/__version?v=b'); await checkUpdate(page)
  await expect(page.getByRole('button', { name: 'Jetzt aktualisieren' })).toBeDisabled()
  await page.getByRole('button', { name: 'Später', exact: true }).click()
  await expect(page.locator('input[inputmode="numeric"]').nth(0)).toHaveValue('7')
  expect(await page.evaluate(() => navigator.serviceWorker.controller!.scriptURL)).toBe(oldController)
  await page.getByRole('button', { name: '← Zur Runde' }).click()
  await page.getByRole('button', { name: 'Update anzeigen' }).click()
  await page.getByRole('button', { name: 'Jetzt aktualisieren' }).click()
  await expect(page.locator('meta[name="test-build"]')).toHaveAttribute('content', 'b')
  await page.getByRole('button', { name: 'Turnier fortsetzen' }).click()
  await page.getByRole('button', { name: 'Spiel 1 öffnen' }).click()
  await expect(page.locator('input[inputmode="numeric"]').nth(0)).toHaveValue('7', { timeout: 22000 })
  await expect(page.locator('input[inputmode="numeric"]').nth(1)).toHaveValue('3')
})
test('failed new precache leaves old version usable offline', async ({ page, context, request }) => {
  await request.get('/__version?v=a'); await ready(page)
  await request.get('/__version?v=b&broken=1')
  await page.evaluate(async () => {
    const reg = (await navigator.serviceWorker.getRegistration())!
    const failed = new Promise<void>(resolve => {
      reg.addEventListener('updatefound', () => {
        const worker = reg.installing!
        worker.addEventListener('statechange', () => { if (worker.state === 'redundant') resolve() })
      }, { once: true })
    })
    await reg.update()
    await failed
  })
  await context.setOffline(true); await page.reload()
  await expect(page.getByText('Offline bereit auf diesem Gerät.')).toBeVisible()
  await expect(page.locator('meta[name="test-build"]')).toHaveAttribute('content', 'a')
  await expect(page.getByRole('button', { name: 'Jetzt aktualisieren' })).toHaveCount(0)
})
test('old offline frontend reports future data schema and preserves it', async ({ page, context, request }) => {
  await request.get('/__version?v=a'); await ready(page); await draft(page)
  await page.getByRole('button', { name: '← Zur Runde' }).click()
  const snapshot = await page.evaluate(async () => {
    const db = await new Promise<IDBDatabase>((resolve, reject) => { const open = indexedDB.open('mattys-table-tennis'); open.onsuccess = () => resolve(open.result); open.onerror = () => reject(open.error) })
    const stores = [...db.objectStoreNames]; db.close(); return stores
  })
  expect(snapshot).toContain('tournaments')
  const changed = await page.evaluate(async () => {
    const db = await new Promise<IDBDatabase>(resolve => { const req = indexedDB.open('mattys-table-tennis'); req.onsuccess = () => resolve(req.result) })
    const tx = db.transaction('tournaments', 'readwrite'); const store = tx.objectStore('tournaments')
    const value = await new Promise<Record<string, unknown>>(resolve => { const req = store.getAll(); req.onsuccess = () => resolve(req.result[0]) })
    value.schemaVersion = 999; store.put(value)
    await new Promise<void>(resolve => { tx.oncomplete = () => resolve() }); db.close(); return value
  })
  await context.setOffline(true); await page.reload()
  await expect(page.getByText(/Unbekannte Datenversion/).first()).toBeVisible()
  const persisted = await page.evaluate(async () => {
    const db = await new Promise<IDBDatabase>(resolve => { const req = indexedDB.open('mattys-table-tennis'); req.onsuccess = () => resolve(req.result) })
    const value = await new Promise<unknown>(resolve => { const req = db.transaction('tournaments').objectStore('tournaments').getAll(); req.onsuccess = () => resolve(req.result[0]) }); db.close(); return value
  })
  expect(persisted).toEqual(changed)
})
