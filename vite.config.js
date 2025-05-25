import { defineConfig } from 'vite'

export default defineConfig({
  server: {
    port: 3000, // Custom port (optional)
    open: true  // Auto-open browser (optional)
  },
  build: {
    outDir: 'dist' // Default build folder
  },
})