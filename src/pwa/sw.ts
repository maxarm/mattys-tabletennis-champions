/// <reference lib="webworker" />
import { clientsClaim, cacheNames } from 'workbox-core'
import { precacheAndRoute, createHandlerBoundToURL, getCacheKeyForURL } from 'workbox-precaching'
import { registerRoute, NavigationRoute } from 'workbox-routing'
declare const self: ServiceWorkerGlobalScope & { __WB_MANIFEST: Array<{ url: string; revision: string | null }> }
const manifest = self.__WB_MANIFEST
precacheAndRoute(manifest)
registerRoute(new NavigationRoute(createHandlerBoundToURL('/index.html')))
clientsClaim()
// No automatic skipWaiting. Existing pages keep their version until consent.
self.addEventListener('message', event => {
  if (event.data?.type === 'APPLY_UPDATE') event.waitUntil(self.skipWaiting())
  if (event.data?.type === 'CHECK_OFFLINE') event.waitUntil((async () => {
    try {
      const cache = await caches.open(cacheNames.precache)
      const complete = (await Promise.all(manifest.map(async entry => {
        const key = getCacheKeyForURL(typeof entry === 'string' ? entry : entry.url)
        return key ? !!(await cache.match(key)) : false
      }))).every(Boolean)
      event.source?.postMessage({ type: complete ? 'OFFLINE_READY' : 'OFFLINE_ERROR' })
    } catch { event.source?.postMessage({ type: 'OFFLINE_ERROR' }) }
  })())
})
