import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'node:path'

/**
 * The dev server proxies every backend path to Laravel so the browser sees a
 * single origin (http://localhost:5174).
 *
 * That is what makes cookie-based Sanctum authentication work in development
 * without CORS negotiation or cross-site cookie rules: the session cookie is
 * first-party, so it is sent on every request regardless of the browser's
 * third-party-cookie policy. In production the built SPA is served from
 * Laravel's own public/ directory, which is same-origin for the same reason.
 */
const BACKEND = 'http://localhost:8001'

export default defineConfig({
  plugins: [react(), tailwindcss()],

  resolve: {
    alias: { '@': path.resolve(__dirname, './src') },
  },

  server: {
    // 5173 is already taken by another project on this machine.
    port: 5174,
    strictPort: true,
    proxy: {
      // The JSON API.
      '/api': { target: BACKEND, changeOrigin: false },
      // Sanctum's CSRF cookie endpoint.
      '/sanctum': { target: BACKEND, changeOrigin: false },
      // The Google sign-in handshake (a full browser navigation).
      '/auth': { target: BACKEND, changeOrigin: false },
    },
  },

  build: {
    outDir: 'dist',
    sourcemap: false,
    rollupOptions: {
      output: {
        // Split the heaviest libraries out of the main bundle so a change to
        // application code does not invalidate their cache entries. Rollup
        // takes the function form here, not the object map.
        manualChunks(id) {
          if (id.includes('node_modules/recharts') || id.includes('node_modules/d3-')) {
            return 'charts'
          }
          if (
            id.includes('node_modules/react-dom') ||
            id.includes('node_modules/react-router') ||
            id.includes('node_modules/react/')
          ) {
            return 'react'
          }
          return undefined
        },
      },
    },
  },
})
