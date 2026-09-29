import {defineConfig} from 'vite';

// Relative base so the built app also works from a sub-path (e.g. a project page).
export default defineConfig({
  base: './',
  esbuild: {jsx: 'automatic'},
  // Pre-bundle the JSX runtime so the first dev load doesn't re-optimize and reload mid-render.
  optimizeDeps: {include: ['react/jsx-dev-runtime']},
  server: {host: '127.0.0.1'},
  preview: {host: '127.0.0.1'},
});
