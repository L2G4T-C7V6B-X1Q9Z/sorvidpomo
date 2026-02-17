import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  base: '/sorvidpomo/',
  plugins: [react()],
  build: {
    target: 'esnext',
  },
})
