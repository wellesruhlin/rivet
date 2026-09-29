import {defineConfig} from 'vite';
export default defineConfig({base:'./',esbuild:{jsx:'automatic'},optimizeDeps:{include:['react/jsx-dev-runtime']},server:{host:'127.0.0.1',port:5184},preview:{host:'127.0.0.1'}});
