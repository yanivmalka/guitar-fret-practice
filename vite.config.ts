import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import { execSync } from 'child_process'

const commitHash = execSync('git rev-parse --short HEAD').toString().trim();
const commitDate = execSync('git log -1 --format=%ci').toString().trim();

export default defineConfig({
  base: '/guitar-fret-practice/',
  define: {
    __COMMIT_HASH__: JSON.stringify(commitHash),
    __COMMIT_DATE__: JSON.stringify(commitDate),
  },
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg}'],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/gleitz\.github\.io\/midi-js-soundfonts\/.*/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'guitar-samples',
              expiration: { maxEntries: 200, maxAgeSeconds: 60 * 60 * 24 * 30 },
            },
          },
        ],
      },
      manifest: {
        name: 'Guitar Fret Practice',
        short_name: 'Fret Practice',
        description: 'Practice guitar fret note recognition',
        theme_color: '#1a1a2e',
        background_color: '#1a1a2e',
        display: 'standalone',
        orientation: 'portrait',
        icons: [
          { src: '/icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' },
        ],
      },
    }),
  ],
})
