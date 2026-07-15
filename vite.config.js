import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    // during `npm run dev`, /api/* is served by scripts/dev-api.mjs
    // (Vercel's runtime handles it in production)
    proxy: {
      '/api': 'http://localhost:3001',
    },
  },
})
