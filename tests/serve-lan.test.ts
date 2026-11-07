// @vitest-environment node
import { afterAll, beforeAll, expect, it } from 'vitest'
import { mkdtemp, mkdir, writeFile, readFile, rm, symlink } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { resolve, join } from 'node:path'
import { spawn, execFileSync, type ChildProcess } from 'node:child_process'
import { request } from 'node:https'
const script = resolve('scripts/serve-lan.mjs')
let root: string
let server: ChildProcess
let port: number
let ca: Buffer
async function start(cwd: string) {
  const child = spawn(process.execPath, [script], { cwd, env: { PATH: process.env.PATH, HOME: process.env.HOME, TMPDIR: process.env.TMPDIR, LANG: process.env.LANG, LAN_PORT: '0' } })
  let output = ''
  return await new Promise<{ child: ChildProcess; output: string }>(resolve => {
    child.stdout.on('data', data => { output += String(data); if (output.includes('HTTPS')) resolve({ child, output }) })
    child.stderr.on('data', data => { output += String(data) })
    child.on('close', () => resolve({ child, output }))
  })
}
beforeAll(async () => {
  root = await mkdtemp(join(tmpdir(), 'mattys-https-'))
  await mkdir(join(root, '.certs')); await mkdir(join(root, 'dist'))
  execFileSync('openssl', ['req', '-x509', '-newkey', 'rsa:2048', '-nodes', '-days', '1', '-keyout', join(root, '.certs/lan-key.pem'), '-out', join(root, '.certs/lan-cert.pem'), '-subj', '/CN=localhost', '-addext', 'subjectAltName=IP:127.0.0.1,DNS:localhost'], { stdio: 'ignore' })
  ca = await readFile(join(root, '.certs/lan-cert.pem'))
  for (const file of ['index.html', 'sw.js', 'a.svg', 'manifest.webmanifest']) await writeFile(join(root, 'dist', file), 'fixture')
  await writeFile(join(root, 'secret'), 'private'); await symlink(join(root, 'secret'), join(root, 'dist/link'))
})
afterAll(async () => { server?.kill(); await rm(root, { recursive: true, force: true }) })
it('explains missing certificates and missing build without HTTP fallback', async () => {
  const empty = await mkdtemp(join(tmpdir(), 'mattys-empty-'))
  try {
    expect((await start(empty)).output).toMatch(/Zertifikat|Build/)
    await mkdir(join(empty, 'dist')); await writeFile(join(empty, 'dist/index.html'), 'x')
    expect((await start(empty)).output).toMatch(/Zertifikat/)
    await mkdir(join(empty, '.certs'))
    await writeFile(join(empty, '.certs/lan-cert.pem'), ca)
    await writeFile(join(empty, '.certs/lan-key.pem'), await readFile(join(root, '.certs/lan-key.pem')))
    await rm(join(empty, 'dist'), { recursive: true })
    expect((await start(empty)).output).toMatch(/Build/)
  } finally { await rm(empty, { recursive: true, force: true }) }
})
it('serves trusted HTTPS, MIME and fresh worker; rejects traversal and escaping symlinks', async () => {
  const started = await start(root); server = started.child
  expect(started.output).toMatch(/HTTPS.*0\.0\.0\.0:(\d+)/)
  port = Number(started.output.match(/0\.0\.0\.0:(\d+)/)![1])
  async function get(path: string) {
    return await new Promise<{ status: number; type: string | undefined; cache: string | undefined }>((resolve, reject) => {
      request({ hostname: '127.0.0.1', port, path, ca }, response => {
        response.resume(); response.on('end', () => resolve({ status: response.statusCode!, type: response.headers['content-type'], cache: response.headers['cache-control'] }))
      }).on('error', reject).end()
    })
  }
  expect((await get('/')).status).toBe(200)
  for (const [file, type] of [['sw.js', 'text/javascript'], ['a.svg', 'image/svg+xml'], ['manifest.webmanifest', 'application/manifest+json']]) {
    const response = await get('/' + file); expect(response.type).toContain(type); expect(response.cache).toContain('no-store')
  }
  for (const path of ['/../secret', '/%2e%2e/secret', '/%2e%2e%2fsecret', '/link', '/%ZZ', '/missing.js']) expect((await get(path)).status).toBeGreaterThanOrEqual(400)
})
