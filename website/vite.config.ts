import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

// GitHub Pages serves the site from /<repo>/. Override with BASE_PATH=/ for other hosts.
const base = process.env.BASE_PATH ?? '/java-collections-handbook/';

export default defineConfig({
  base,
  plugins: [react(), tailwindcss()],
  server: {
    // Lessons include source files from ../java-examples at build time.
    fs: { allow: ['..'] },
  },
  build: {
    chunkSizeWarningLimit: 900,
  },
});
