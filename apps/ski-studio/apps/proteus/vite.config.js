import {defineConfig} from 'vite';

// Relative base so the built site works from any static host or sub-path.
export default defineConfig({
  base: './',
  esbuild: {jsx: 'automatic'},
  optimizeDeps: {include: ['react/jsx-dev-runtime']},
  server: {host: '127.0.0.1'},
  preview: {host: '127.0.0.1'},
});
