import { defineConfig } from 'vite'

export default defineConfig({
  server: {
    port: 3000,
    open: true,  // Auto-open browser
    allowedHosts: ['localhost', '192.168.4.23'],
    host: true
  },
  build: {
    outDir: 'dist'
  },
})