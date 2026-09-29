import {defineConfig} from 'vite';

// Relative base so the built app also works from a sub-path (e.g. a project page).
export default defineConfig({
  base: './',
  // ON3P artwork, bindings and models are stored once in the brand pack.
  publicDir: '../../brands/on3p/public',
  esbuild: {jsx: 'automatic'},
  // Pre-bundle the JSX runtime so the first dev load doesn't re-optimize and reload mid-render.
  optimizeDeps: {include: ['react/jsx-dev-runtime']},
  server: {host: '127.0.0.1',proxy:{'/api':process.env.MAKER_API_URL||'http://127.0.0.1:5193'}},
  preview: {host: '127.0.0.1',proxy:{'/api':process.env.MAKER_API_URL||'http://127.0.0.1:5193'}},
});
