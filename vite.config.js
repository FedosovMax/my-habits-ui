// vite.config.js
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  // dev server (local)
  server: {
    host: true,
    allowedHosts: true, // allow all hosts in dev (safe for local)
  },
  // production preview (Railway)
  preview: {
    host: true, // bind 0.0.0.0
    port: Number(process.env.PORT) || 8080,
    // allow Railway domain(s)
    allowedHosts: [
      'melodious-tenderness-production.up.railway.app',
      '.up.railway.app'
    ]
    // Alternatively to allow any host:
    // allowedHosts: true
  },
})
