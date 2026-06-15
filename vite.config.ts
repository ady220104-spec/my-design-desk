import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        // 把体积大的画布/打包库拆成独立 chunk，主包更小、可被浏览器单独缓存
        manualChunks: {
          fabric: ['fabric'],
          jszip: ['jszip'],
          vendor: ['react', 'react-dom', 'zustand', 'dexie'],
        },
      },
    },
  },
})
