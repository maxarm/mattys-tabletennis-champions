import { URL } from 'node:url'
import { createServer } from 'node:http'
import { readFile } from 'node:fs/promises'
import { resolve, extname } from 'node:path'
let version = 'a'
let broken = false
const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.png': 'image/png', '.webmanifest': 'application/manifest+json' }
createServer(async (req, res) => {
  const url = new URL(req.url, 'http://localhost')
  if (url.pathname === '/__version') { version = url.searchParams.get('v') === 'b' ? 'b' : 'a'; broken = url.searchParams.has('broken'); res.end('ok'); return }
  const path = url.pathname === '/' ? '/index.html' : url.pathname
  if (broken && path.endsWith('.js') && path !== '/sw.js') { res.writeHead(503); res.end(); return }
  try {
    const root = resolve('.superpowers/sdd/2026-11-07-mattys-table-tennis/pwa-build-' + version)
    const file = resolve(root, '.' + path)
    if (!file.startsWith(root + '/')) throw new Error('path')
    const data = await readFile(file)
    res.writeHead(200, { 'Content-Type': types[extname(path)] ?? 'application/octet-stream', 'Cache-Control': 'no-store' }); res.end(data)
  } catch { res.writeHead(404); res.end('Not found') }
}).listen(8776, '127.0.0.1')
