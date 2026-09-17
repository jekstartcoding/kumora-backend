import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Admin panel di-serve Express di route /admin (plan 6.1 & 10.2) — base '/admin/'
// supaya asset build pakai path yang benar. Di dev, /api di-proxy ke backend lokal.
export default defineConfig({
  plugins: [react()],
  base: '/admin/',
  server: {
    port: 5173,
    proxy: {
      '/api': 'http://localhost:3000',
    },
  },
  build: {
    outDir: 'dist',
  },
});
