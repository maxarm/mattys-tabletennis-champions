import { afterEach, expect, it, vi } from 'vitest'
import { registerPwa } from './client'
afterEach(() => vi.unstubAllGlobals())
function browser() {
  const sw = new EventTarget() as EventTarget & { controller: unknown; register: ReturnType<typeof vi.fn> }
  const worker = { postMessage: vi.fn() }
  const registration = Object.assign(new EventTarget(), { active: worker, waiting: null as unknown, installing: null, update: vi.fn().mockResolvedValue(undefined) })
  sw.controller = worker
  sw.register = vi.fn().mockResolvedValue(registration)
  vi.stubGlobal('isSecureContext', true)
  vi.stubGlobal('navigator', { serviceWorker: sw })
  return { sw, worker, registration }
}
const tick = async () => { await new Promise(resolve => setTimeout(resolve, 0)) }
it('requires secure context and service worker support', () => {
  vi.stubGlobal('isSecureContext', false)
  expect(registerPwa().getStatus()).toBe('unsupported')
  vi.stubGlobal('isSecureContext', true)
  vi.stubGlobal('navigator', {})
  expect(registerPwa().getStatus()).toBe('unsupported')
})
it('does not promise offline before the controlling worker confirms its complete cache', async () => {
  const { sw, worker } = browser()
  const pwa = registerPwa()
  await tick()
  expect(pwa.getStatus()).toBe('caching')
  expect(worker.postMessage).toHaveBeenCalledWith({ type: 'CHECK_OFFLINE' })
  sw.dispatchEvent(new MessageEvent('message', { data: { type: 'OFFLINE_READY' }, source: worker as unknown as ServiceWorker }))
  expect(pwa.getStatus()).toBe('ready')
  pwa.dispose()
})
it('reports failed registration without offline readiness', async () => {
  const { sw } = browser()
  sw.register.mockRejectedValue(new Error('cache failed'))
  const pwa = registerPwa()
  await tick()
  expect(pwa.getStatus()).toBe('error')
  pwa.dispose()
})
it('leaves a waiting update untouched until explicit acceptance', async () => {
  const { registration } = browser()
  const waiting = { postMessage: vi.fn() }
  registration.waiting = waiting
  const pwa = registerPwa()
  await tick()
  expect(pwa.getStatus()).toBe('updateAvailable')
  expect(waiting.postMessage).not.toHaveBeenCalled()
  pwa.dispose()
})
it('rejects readiness from another worker and explicit cache failure', async () => {
  const { sw, worker } = browser()
  const pwa = registerPwa()
  await tick()
  sw.dispatchEvent(new MessageEvent('message', { data: { type: 'OFFLINE_READY' }, source: {} as ServiceWorker }))
  expect(pwa.getStatus()).toBe('caching')
  sw.dispatchEvent(new MessageEvent('message', { data: { type: 'OFFLINE_ERROR' }, source: worker as unknown as ServiceWorker }))
  expect(pwa.getStatus()).toBe('error')
  pwa.dispose()
})
it('notifies subscribers and removes lifecycle listeners on disposal', async () => {
  const { sw, worker } = browser()
  const pwa = registerPwa()
  const listener = vi.fn()
  const unsubscribe = pwa.subscribe(listener)
  await tick()
  sw.dispatchEvent(new MessageEvent('message', { data: { type: 'OFFLINE_READY' }, source: worker as unknown as ServiceWorker }))
  expect(listener).toHaveBeenCalledOnce()
  unsubscribe(); pwa.dispose()
  sw.dispatchEvent(new MessageEvent('message', { data: { type: 'OFFLINE_ERROR' }, source: worker as unknown as ServiceWorker }))
  expect(pwa.getStatus()).toBe('ready')
  expect(listener).toHaveBeenCalledOnce()
})
it('activates only on request and reloads only after the controller changes', async () => {
  const { sw, registration } = browser()
  const reload = vi.fn()
  vi.stubGlobal('window', Object.assign(new EventTarget(), { location: { reload } }))
  const waiting = { postMessage: vi.fn() }
  registration.waiting = waiting
  const pwa = registerPwa()
  await tick()
  expect(reload).not.toHaveBeenCalled()
  const applied = pwa.applyUpdate()
  expect(waiting.postMessage).toHaveBeenCalledWith({ type: 'APPLY_UPDATE' })
  expect(reload).not.toHaveBeenCalled()
  sw.dispatchEvent(new Event('controllerchange'))
  await applied
  expect(reload).toHaveBeenCalledOnce()
  pwa.dispose()
})
it('does not reload a running page for a controller change from another tab', async () => {
  const { sw } = browser()
  const reload = vi.fn()
  vi.stubGlobal('window', Object.assign(new EventTarget(), { location: { reload } }))
  const pwa = registerPwa()
  await tick()
  sw.dispatchEvent(new Event('controllerchange'))
  expect(reload).not.toHaveBeenCalled()
  pwa.dispose()
})
it('cleans up failed activation requests so later controller changes cannot reload the page', async () => {
  const { sw, registration } = browser()
  const reload = vi.fn()
  vi.stubGlobal('window', Object.assign(new EventTarget(), { location: { reload } }))
  registration.waiting = { postMessage() { throw new Error('Worker beendet') } }
  const pwa = registerPwa()
  await tick()
  await expect(pwa.applyUpdate()).rejects.toThrow('Worker beendet')
  sw.dispatchEvent(new Event('controllerchange'))
  expect(reload).not.toHaveBeenCalled()
  pwa.dispose()
})
it('cancels a pending update listener when disposed', async () => {
  const { sw, registration } = browser()
  const reload = vi.fn()
  vi.stubGlobal('window', Object.assign(new EventTarget(), { location: { reload } }))
  registration.waiting = { postMessage: vi.fn() }
  const pwa = registerPwa()
  await tick()
  const applied = pwa.applyUpdate()
  const cancelled = expect(applied).rejects.toThrow('abgebrochen')
  pwa.dispose()
  sw.dispatchEvent(new Event('controllerchange'))
  await cancelled
  expect(reload).not.toHaveBeenCalled()
})
