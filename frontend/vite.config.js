import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 5173,
    proxy: {
      '/health': {
        target: 'https://superchase-production.up.railway.app',
        changeOrigin: true,
        secure: true
      },
      '/tasks': {
        target: 'https://superchase-production.up.railway.app',
        changeOrigin: true,
        secure: true
      },
      '/briefing': {
        target: 'https://superchase-production.up.railway.app',
        changeOrigin: true,
        secure: true
      },
      '/query': {
        target: 'https://superchase-production.up.railway.app',
        changeOrigin: true,
        secure: true
      },
      '/api': {
        target: process.env.VITE_API_URL || 'http://localhost:3849',
        changeOrigin: true,
        secure: false
      }
    }
  }
})
