import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'
import { readFileSync } from 'node:fs'

const pkg = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8')) as { version: string }

// BASE_PATH lets the GitHub Pages demo live under /unity-app/. Firebase Hosting uses '/'.
const base = process.env.BASE_PATH ?? '/'

export default defineConfig({
  base,
  define: { __APP_VERSION__: JSON.stringify(pkg.version) },
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: 'script', // external registerSW.js keeps the CSP free of inline scripts
      includeAssets: ['favicon.svg', 'apple-touch-icon.png', 'fern.svg'],
      manifest: {
        name: 'Unity — wellbeing for teens',
        short_name: 'Unity',
        description: 'Free mental health and wellbeing app for NZ teenagers. Made for teenagers by teenagers.',
        lang: 'en-NZ',
        start_url: base,
        scope: base,
        display: 'standalone',
        orientation: 'portrait',
        background_color: '#FFFFFF',
        theme_color: '#E8892B',
        categories: ['health', 'lifestyle'],
        icons: [
          { src: 'pwa-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'pwa-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,webmanifest,json}'],
        navigateFallback: `${base}index.html`,
        // Never cache Firebase / Google API traffic in the service worker.
        navigateFallbackDenylist: [/^\/__/],
        runtimeCaching: [],
      },
    }),
  ],
  build: { target: 'es2022', sourcemap: false, chunkSizeWarningLimit: 700 },
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
    setupFiles: ['src/test/setup.ts'],
  },
})
