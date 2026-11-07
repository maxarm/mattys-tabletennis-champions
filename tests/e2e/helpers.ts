import { expect, type Page } from '@playwright/test'
import type { Tournament } from '../../src/domain/types'

export async function saved(page: Page) {
  await expect(page.getByText('Gespeichert', { exact: true })).toBeVisible()
}

export async function snapshots(page: Page): Promise<Tournament[]> {
  return page.evaluate(async () => {
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      const open = indexedDB.open('mattys-table-tennis')
      open.onsuccess = () => resolve(open.result)
      open.onerror = () => reject(open.error)
    })
    try {
      return await new Promise((resolve, reject) => {
        const tx = db.transaction('tournaments')
        const request = tx.objectStore('tournaments').getAll()
        tx.oncomplete = () => resolve(request.result)
        tx.onerror = () => reject(tx.error)
      })
    } finally { db.close() }
  })
}

// Delay acknowledgement of real commits, preserving IDB transaction semantics.
// App promises must stay locked until the transaction completion is acknowledged.
export async function slowStorage(page: Page) {
  await page.addInitScript(() => {
    const original = IDBTransaction.prototype.addEventListener
    IDBTransaction.prototype.addEventListener = function (type: string, listener: EventListenerOrEventListenerObject | null, options?: boolean | AddEventListenerOptions) {
      if (!listener) return
      if (type === 'complete' && this.mode === 'readwrite' && this.objectStoreNames.contains('tournaments') && listener) {
        const delayed: EventListener = event => {
          setTimeout(() => {
            if (typeof listener === 'function') listener.call(this, event)
            else listener.handleEvent(event)
          }, 500)
        }
        return original.call(this, type, delayed, options)
      }
      return original.call(this, type, listener, options)
    }
  })
}

export async function repeatedClick(page: Page, name: RegExp) {
  const button = page.getByRole('button', { name })
  await expect(button).toBeEnabled()
  await button.evaluate(element => { for (let i = 0; i < 5; i++) (element as HTMLButtonElement).click() })
  await expect(page.getByText('Wird gespeichert', { exact: true })).toBeVisible()
}
