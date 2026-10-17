import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import { createHash } from 'node:crypto'
import { readdirSync, readFileSync } from 'node:fs'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

function sources(directory) {
  return readdirSync(directory, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))
    .flatMap((entry) => entry.isDirectory() ? sources(path.join(directory, entry.name)) : [path.join(directory, entry.name)])
}
const version = createHash('sha256')
for (const file of [...sources(path.join(__dirname, 'src')), path.join(__dirname, 'index.html'), path.join(__dirname, 'package-lock.json')]) {
  version.update(file.replace(__dirname, '')).update(readFileSync(file))
}
const appVersion = version.digest('hex').slice(0, 16)
const versionBody = JSON.stringify({ version: appVersion })
const appUpdates = {
  name: 'app-version',
  generateBundle() { this.emitFile({ type: 'asset', fileName: 'version.json', source: versionBody }) },
  configureServer(server) {
    server.middlewares.use('/version.json', (_req, res) => {
      res.setHeader('Content-Type', 'application/json')
      res.setHeader('Cache-Control', 'no-store')
      res.end(versionBody)
    })
  },
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), appUpdates],
  define: { __APP_VERSION__: JSON.stringify(appVersion) },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
})
