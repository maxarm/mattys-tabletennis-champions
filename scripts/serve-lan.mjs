import process from 'node:process'
import console from 'node:console'
import { createServer } from 'node:https'
import { readFile, realpath, stat } from 'node:fs/promises'
import { resolve, relative, isAbsolute, extname, sep } from 'node:path'
const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png', '.webmanifest': 'application/manifest+json', '.json': 'application/json', '.woff2': 'font/woff2', '.ico': 'image/x-icon' }
try {
  const port = Number(process.env.LAN_PORT ?? '8443')
  if (!Number.isInteger(port) || port < 0 || port > 65535) throw new Error('LAN_PORT muss eine Portnummer sein.')
  const root = await realpath('dist').catch(() => { throw new Error('Build fehlt: zuerst npm run build ausführen.') })
  await stat(resolve(root, 'index.html')).catch(() => { throw new Error('Build unvollständig: dist/index.html fehlt.') })
  const [cert, key] = await Promise.all([process.env.LAN_TLS_CERT ?? '.certs/lan-cert.pem', process.env.LAN_TLS_KEY ?? '.certs/lan-key.pem'].map(path => readFile(path))).catch(() => { throw new Error('Zertifikat/Schlüssel fehlen oder sind nicht lesbar. Siehe docs/lan-setup.md (LAN_TLS_CERT, LAN_TLS_KEY).') })
  const inside = file => { const rel = relative(root, file); return rel !== '..' && !rel.startsWith('..' + sep) && !isAbsolute(rel) }
  const server = createServer({ cert, key }, async (req, res) => {
    res.setHeader('Cache-Control', 'no-store')
    res.setHeader('X-Content-Type-Options', 'nosniff')
    if (req.method !== 'GET' && req.method !== 'HEAD') { res.writeHead(405, { Allow: 'GET, HEAD' }); res.end(); return }
    let path
    try {
      path = decodeURIComponent((req.url ?? '/').split('?')[0])
      if (!path.startsWith('/') || path.includes('\\') || path.includes('\0') || path.split('/').includes('..')) throw new Error('path')
    } catch { res.writeHead(400); res.end('Ungültiger Pfad'); return }
    try {
      const file = await realpath(resolve(root, '.' + (path === '/' ? '/index.html' : path)))
      if (!inside(file)) { res.writeHead(403); res.end(); return }
      if (!(await stat(file)).isFile()) throw new Error('file')
      const data = await readFile(file)
      res.writeHead(200, { 'Content-Type': types[extname(file)] ?? 'application/octet-stream', 'Content-Length': data.length })
      res.end(req.method === 'HEAD' ? undefined : data)
    } catch { res.writeHead(404); res.end('Datei nicht gefunden') }
  })
  server.on('error', error => { console.error('HTTPS-Start fehlgeschlagen:', error.message); process.exitCode = 1 })
  server.listen(port, '0.0.0.0', () => { console.log(`HTTPS auf 0.0.0.0:${server.address().port} – nur im privaten LAN verwenden.`) })
} catch (error) { console.error(error.message); process.exitCode = 1 }
