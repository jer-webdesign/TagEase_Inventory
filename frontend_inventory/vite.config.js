import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  // Load env variables so we can configure the dev proxy at runtime
  const env = loadEnv(mode, process.cwd(), '')
  // VITE_API_PROXY can be set to e.g. 'http://10.77.194.23:5000'
  const apiProxy = env.VITE_API_PROXY || 'http://localhost:5000'

  return {
    plugins: [react()],
    server: {
      proxy: {
        // Proxy API calls to backend (use VITE_API_PROXY or default localhost:5000)
        '/api': {
          target: apiProxy,
          changeOrigin: true,
          secure: false,
        },
        // Proxy socket.io websocket upgrades to the backend as well
        '/socket.io': {
          target: apiProxy,
          ws: true,
          changeOrigin: true,
          secure: false,
        }
      }
    }
  }
})
