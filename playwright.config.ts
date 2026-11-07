import { defineConfig } from '@playwright/test'
export default defineConfig({ testDir: './tests/e2e', workers: 1, timeout: 60000, use: { baseURL: 'http://127.0.0.1:8776', viewport: { width: 390, height: 844 } }, webServer: { command: 'node tests/e2e/build.mjs && node tests/e2e/server.mjs', url: 'http://127.0.0.1:8776', reuseExistingServer: false } })
