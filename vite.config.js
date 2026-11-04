import { defineConfig } from 'vite'
import preact from '@preact/preset-vite'
import { VitePWA } from 'vite-plugin-pwa'

/**
 * GitHub Pages serves a project site under `/<repo>/`. The Vite base, the
 * manifest's `start_url`/`scope` and the service-worker scope must all follow
 * it (PRD: Hosting and licence). Override with `BASE_PATH=/ pnpm build` for a
 * root deployment.
 */
const base = process.env.BASE_PATH ?? '/monitor-sizes/'

export default defineConfig({
  base,
  plugins: [
    preact(),
    VitePWA({
      // 'prompt' + no UI: a new service worker waits until every tab is
      // closed, so new versions apply on the next launch (PRD: Offline).
      registerType: 'prompt',
      injectRegister: 'auto',
      includeAssets: ['favicon.svg', 'apple-touch-icon.png'],
      manifest: {
        id: base,
        name: 'Pixely a monitory',
        short_name: 'Pixely',
        description:
          'Compare displays by size, sharpness, viewing angle and OS scaling against the displays you know.',
        lang: 'en',
        start_url: base,
        scope: base,
        display: 'standalone',
        background_color: '#0f172a',
        theme_color: '#0f172a',
        icons: [
          { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png' },
          {
            src: 'maskable-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,json,webmanifest}'],
        navigateFallback: `${base}index.html`,
      },
    }),
  ],
  build: {
    target: 'es2022',
  },
})
