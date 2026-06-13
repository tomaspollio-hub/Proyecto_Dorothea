import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@dorothea/shared/types': path.resolve(__dirname, '../../packages/shared/types/index.ts'),
      '@dorothea/shared/constants': path.resolve(__dirname, '../../packages/shared/constants/index.ts'),
      '@dorothea/validators/auth': path.resolve(__dirname, '../../packages/validators/auth.ts'),
    },
  },
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:8787',
        changeOrigin: true,
      },
    },
  },
})
