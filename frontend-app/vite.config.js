import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// The port is fixed because the API only allows this origin (ALLOWED_ORIGINS in
// backend-api/api.py). With strictPort Vite stops instead of moving to another port,
// where every request would fail on CORS.
export default defineConfig({
  plugins: [react()],
  server: { port: 5173, strictPort: true },
  preview: { port: 5173, strictPort: true },
});
