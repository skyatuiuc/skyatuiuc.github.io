import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  base: '/', // Standard root base for skyuiuc.org and single-page apps
  build: {
    outDir: 'dist',
    sourcemap: false,
  },
});
