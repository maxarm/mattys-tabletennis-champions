import { build } from 'vite'
for (const version of ['a', 'b']) {
  await build({ build: { outDir: `.superpowers/sdd/2026-11-07-mattys-table-tennis/pwa-build-${version}` }, plugins: [{
    name: 'test-build-identity',
    transform(code, id) { if (id.endsWith('/src/main.tsx')) return code + `\ndocument.documentElement.dataset.build = '${version}';` },
    transformIndexHtml() { return [{ tag: 'meta', attrs: { name: 'test-build', content: version }, injectTo: 'head' }] },
  }] })
}
