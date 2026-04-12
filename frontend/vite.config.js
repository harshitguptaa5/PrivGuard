import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/reset': 'http://localhost:7860',
      '/step': 'http://localhost:7860',
      '/agent/act': 'http://localhost:7860',
      '/state': 'http://localhost:7860',
      '/train': 'http://localhost:7860',
      '/training_stats': 'http://localhost:7860',
    }
  }
})
