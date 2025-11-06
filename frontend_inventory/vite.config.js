import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      // Proxy API calls to backend running on 5174
      '/api': {
        target: 'http://localhost:5174',
        changeOrigin: true,
        secure: false,
      },
    },
  },
})
