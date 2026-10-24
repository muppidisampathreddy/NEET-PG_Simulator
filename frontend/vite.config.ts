import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Dev: proxy API + uploaded images to FastAPI on :8000. Prod: FastAPI serves the built app.
const API = process.env.API_URL ?? 'http://127.0.0.1:8000';

export default defineConfig({
  plugins: [react()],
  server: { proxy: { '/api': API, '/uploads': API } },
});
