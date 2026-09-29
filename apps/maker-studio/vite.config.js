import {defineConfig} from 'vite';
const proxy={'/api':process.env.MAKER_API_URL||'http://127.0.0.1:5193'};
export default defineConfig({base:'/', esbuild:{jsx:'automatic'}, server:{host:'127.0.0.1',port:5192,strictPort:true,proxy},preview:{host:'127.0.0.1',proxy}, optimizeDeps:{include:['react/jsx-dev-runtime','three','three/addons/controls/OrbitControls.js']}});
