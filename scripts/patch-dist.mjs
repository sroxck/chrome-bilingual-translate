import { copyFileSync, readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'

const root = resolve(import.meta.dirname, '..')
copyFileSync(resolve(root, 'public/content.js'), resolve(root, 'dist/content.js'))

const manifestPath = resolve(root, 'dist/manifest.json')
const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'))
manifest.content_scripts = [
  {
    matches: ['http://*/*', 'https://*/*'],
    js: ['content.js'],
    run_at: 'document_idle',
  },
]
writeFileSync(manifestPath, JSON.stringify(manifest, null, 2))
console.log('patched dist/manifest.json to use IIFE content.js')
