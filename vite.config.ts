import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import { execSync } from 'child_process'
import { resolve } from 'path'

const commitHash = execSync('git rev-parse --short HEAD').toString().trim();
const commitDate = execSync('git log -1 --format=%ci').toString().trim();

const BASE = '/guitar-fret-practice/';

export default defineConfig({
  base: BASE,
  // Dev server only. Bind to all interfaces so the app is reachable over
  // the LAN (e.g. from a phone) at http://<host>:5173/guitar-fret-practice/.
  server: {
    host: true,
  },
  define: {
    __COMMIT_HASH__: JSON.stringify(commitHash),
    __COMMIT_DATE__: JSON.stringify(commitDate),
  },
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        designPreview: resolve(__dirname, 'design-preview.html'),
      },
    },
  },
  plugins: [
    {
      // Dev server only. Two fixes for hitting the dev server from a phone
      // on the LAN, both scoped to `apply: 'serve'` so they never touch the
      // production build or the production base path:
      //
      //   1. Some mobile browsers / carrier data-saver proxies send the
      //      request in HTTP absolute-form (`GET http://host:5173/path`).
      //      Vite's base middleware only understands origin-form (`/path`),
      //      so it fails to strip the base and rewrites the redirect to
      //      `/guitar-fret-practice/http://host:5173/...`. Normalising
      //      req.url back to origin-form before Vite sees it fixes this.
      //   2. Vite serves the app at the base path WITH a trailing slash and
      //      404s the slash-less form; redirect the bare base path to the
      //      canonical one so `http://<host>:5173/guitar-fret-practice` works.
      name: 'dev-lan-base-path-fixes',
      apply: 'serve',
      configureServer(server) {
        const bare = BASE.replace(/\/$/, '');
        server.middlewares.use((req, res, next) => {
          let url = req.url ?? '';
          if (/^https?:\/\//i.test(url)) {
            try {
              const parsed = new URL(url);
              url = parsed.pathname + parsed.search;
              req.url = url;
            } catch { /* leave req.url untouched */ }
          }
          if (url === bare || url.startsWith(bare + '?')) {
            res.statusCode = 301;
            res.setHeader('Location', BASE + url.slice(bare.length));
            res.end();
            return;
          }
          next();
        });
      },
    },
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,mp3}'],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/gleitz\.github\.io\/midi-js-soundfonts\/.*/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'guitar-samples',
              expiration: { maxEntries: 400, maxAgeSeconds: 60 * 60 * 24 * 30 },
            },
          },
        ],
      },
      manifest: {
        name: 'Fretboard Practice',
        short_name: 'Fret Practice',
        description: 'Practice guitar & bass fretboard note recognition',
        theme_color: '#1a1a2e',
        background_color: '#1a1a2e',
        // 'minimal-ui', not 'standalone': Android Chrome disables the Web
        // Speech API (voice answers) inside a 'standalone'/'fullscreen' PWA,
        // failing every listen with a bogus 'network' error. 'minimal-ui'
        // keeps the app-like chrome (no editable URL bar) while leaving
        // SpeechRecognition working from a home-screen link.
        display: 'minimal-ui',
        orientation: 'portrait',
        icons: [
          { src: '/icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' },
        ],
      },
    }),
  ],
})
