import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  build: {
    target: 'esnext',
    minify: 'esbuild',
    cssCodeSplit: true, // Split CSS to load only what's needed
    rollupOptions: {
      output: {
        manualChunks: {
          // Split vendor libraries to allow better caching
          'vendor-react': ['react', 'react-dom'],
          'vendor-genai': ['@google/genai'],
        },
      },
    },
    chunkSizeWarningLimit: 1000,
  },
});