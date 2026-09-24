import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  preview: {
    host: true,
    allowedHosts: ['defe-v2-staging-production.up.railway.app','defe-v2-staging-2-production.up.railway.app']
  }
})
