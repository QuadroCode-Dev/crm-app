import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [tailwindcss(), react()],
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) {
            return undefined;
          }

          if (id.includes('xlsx')) {
            return 'vendor-xlsx';
          }

          if (id.includes('recharts') || id.includes('/d3-') || id.includes('\\d3-')) {
            return 'vendor-charts';
          }

          if (id.includes('@mui/icons-material')) {
            return 'vendor-mui-icons';
          }

          if (id.includes('@mui/x-data-grid')) {
            return 'vendor-mui-grid';
          }

          if (id.includes('@mui/material')) {
            return 'vendor-mui-material';
          }

          if (id.includes('@mui/system') || id.includes('@mui/private-theming')) {
            return 'vendor-mui-system';
          }

          if (id.includes('@tanstack')) {
            return 'vendor-query';
          }

          if (id.includes('react-router')) {
            return 'vendor-router';
          }

          if (
            id.includes('react') ||
            id.includes('react-dom') ||
            id.includes('scheduler') ||
            id.includes('@emotion')
          ) {
            return 'vendor-react';
          }

          return undefined;
        },
      },
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: './src/tests/setup.js',
    css: true,
    fileParallelism: false,
  },
});
