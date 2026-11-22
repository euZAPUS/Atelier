import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

import { execSync } from 'node:child_process'
import pkg from './package.json' with { type: 'json' }

const buildId = (() => {
  try { return execSync('git rev-parse --short HEAD').toString().trim() } catch { return 'dev' }
})()

// En GitHub Pages la app vive en /Atelier/; en local y en un subdominio, en /.
const base = process.env.BASE_PATH ?? '/'

export default defineConfig({
  base,
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version),
    __BUILD_ID__: JSON.stringify(buildId),
  },
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'prompt',
      includeAssets: ['favicon.svg', 'apple-touch-icon.png', 'boot.js'],
      manifest: {
        id: base,
        name: 'Atelier',
        short_name: 'Atelier',
        description: 'Tu armario, en el bolsillo.',
        lang: 'es',
        start_url: base,
        scope: base,
        display: 'standalone',
        orientation: 'portrait',
        background_color: '#0a0a0a',
        theme_color: '#0a0a0a',
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,woff2,webmanifest}'],
        globIgnores: ['imgly/**', '**/archivo-{cyrillic,cyrillic-ext,greek,greek-ext,vietnamese}-*', '**/*-italic*'],
        navigateFallback: 'index.html',
        cleanupOutdatedCaches: true,
        // En la primera instalación toma el control ya, para que el modelo se guarde en su caché desde el primer uso
        clientsClaim: true,
        // El modelo de recorte (~110 MB) no va en el precache: se guarda la primera vez que se usa
        runtimeCaching: [
          {
            urlPattern: ({ url }) => url.pathname.includes('/imgly/'),
            handler: 'CacheFirst',
            options: { cacheName: 'imgly-model', expiration: { maxEntries: 120 } },
          },
        ],
        maximumFileSizeToCacheInBytes: 3 * 1024 * 1024,
      },
    }),
  ],
  test: {
    environment: 'node',
    setupFiles: ['fake-indexeddb/auto'],
  },
})
