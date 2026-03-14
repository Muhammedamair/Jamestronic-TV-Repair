import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig(({ mode }) => ({
  plugins: [
    react(),
    // Only enable PWA in production — service worker causes stale cache issues in dev
    ...(mode === 'production' ? [
      VitePWA({
        registerType: 'autoUpdate',
        strategies: 'injectManifest',
        srcDir: 'src',
        filename: 'sw.ts',
        includeAssets: ['favicon.svg'],
        manifest: {
          name: 'Jamestronic TV Repair',
          short_name: 'Jamestronic',
          description: 'TV Repair Ticket Management System',
          theme_color: '#0A0E1A',
          background_color: '#0A0E1A',
          display: 'standalone',
          display_override: ['window-controls-overlay', 'standalone', 'fullscreen', 'minimal-ui'],
          scope: '/',
          start_url: '/',
          icons: [
            { src: '/pwa-192x192.png', sizes: '192x192', type: 'image/png' },
            { src: '/pwa-512x512.png', sizes: '512x512', type: 'image/png' },
            { src: '/pwa-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' },
          ],
        },
        injectManifest: {
          globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        },
      }),
    ] : []),
  ],
}))

