import {cp, stat} from 'node:fs/promises';
import {createReadStream} from 'node:fs';
import path from 'node:path';
import {defineConfig} from 'vite';

// Each maker's artwork lives in its brand pack; the app serves it at brands/<id>/.
const root = path.resolve(import.meta.dirname, '../../brands');
const packs = {folsom: 'folsom', meier: 'meier', grass: 'grass-sticks'};
const types = {'.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.svg': 'image/svg+xml', '.glb': 'model/gltf-binary', '.json': 'application/json'};

function brandAssets() {
  let outDir;
  return {
    name: 'arc-brand-assets',
    configResolved(config) { outDir = path.resolve(config.root, config.build.outDir); },
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        const match = decodeURIComponent(req.url.split('?')[0]).match(/\/brands\/([a-z-]+)\/(.+)$/);
        const dir = match && packs[match[1]] && path.join(root, packs[match[1]], 'public');
        const file = dir && path.join(dir, match[2]);
        if (!file || !file.startsWith(dir + path.sep)) return next();
        try {
          if (!(await stat(file)).isFile()) return next();
        } catch {
          return next();
        }
        res.setHeader('Content-Type', types[path.extname(file).toLowerCase()] ?? 'application/octet-stream');
        createReadStream(file).pipe(res);
      });
    },
    async writeBundle() {
      for (const [id, pack] of Object.entries(packs)) await cp(path.join(root, pack, 'public'), path.join(outDir, 'brands', id), {recursive: true});
    },
  };
}

export default defineConfig({base: './', publicDir: false, plugins: [brandAssets()], esbuild: {jsx: 'automatic'}, optimizeDeps: {include: ['react/jsx-dev-runtime']}, server: {host: '127.0.0.1', port: 5184}, preview: {host: '127.0.0.1'}});
