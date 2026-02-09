import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  server: { port: 5173 },
  build: {
    rollupOptions: {
      onwarn(warning, warn) {
        if (warning.code === 'EVAL' && warning.id?.includes('pdfjs-dist')) return
        warn(warning)
      },
      output: {
        manualChunks(id) {
          if (!id) return
          // Put pdfjs and its worker in a dedicated chunk
          if (id.includes('pdfjs-dist')) return 'pdfjs'
          // Put supabase client code in its own chunk to avoid it being bundled into main
          if (id.includes('supabase') || id.includes('@supabase')) return 'supabase'
          // keep default behavior for others
        },
      },
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
  },
})
