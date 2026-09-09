import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Port wajib 5173 — disesuaikan dengan CORS allow di backend (CONTRACT §3).
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    strictPort: false,
  },
  preview: {
    port: 4173,
  },
});
