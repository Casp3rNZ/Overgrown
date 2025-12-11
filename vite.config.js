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
  assetsInclude: ['**/*.babylon'],
  plugins: [
    {
      name: 'babylon-file-plugin',
      configureServer(server) {
        server.middlewares.use((req, res, next) => {
          if (req.url?.endsWith('.babylon')) {
            res.setHeader('Content-Type', 'application/json');
          }
          next();
        });
      }
    }
  ]
})