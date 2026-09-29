import fs from 'node:fs';
import {resolve, generateMesh} from '../geometry.mjs';
import {generateConstruction} from '../construction.mjs';
const data = JSON.parse(fs.readFileSync(new URL('../data/on3p.json', import.meta.url)));
const request = JSON.parse(fs.readFileSync(0, 'utf8'));
const source = data.models.find(m => m.handle === request.handle);
if (!source) throw Error('Unknown model');
const layup = request.layup || 'Stock', light = ['LITE', 'Tour'].includes(layup);
const model = {...source, construction: {...source.construction, baseThicknessMm: light ? 1.4 : 1.8, steelWidthMm: light ? 2.2 : 2.5, steelHeightMm: light ? 2 : 2.5}};
const shell = generateMesh(model, resolve(model, Number(request.length || 186), request.overrides || {}), {side: request.side || 0});
const interior = generateConstruction(shell, layup, {wood: request.wood || false});
// Native stock-photo UVs for the Blender library; only print registration differs
// from the custom-art web preview. Layer vertices are byte-for-byte identical.
const sample = (values, u) => {const x = Math.max(0, Math.min(1, u)) * (values.length - 1), i = Math.min(values.length - 2, Math.floor(x)); return values[i] + (values[i + 1] - values[i]) * (x - i);};
for (const layer of interior.layers.filter(l => ['topsheet', 'base'].includes(l.material))) {
  const base = layer.material === 'base', bounds = model.artBounds[(base ? 2 : 0) + (request.side || 0)];
  layer.uvs = layer.uvs.map(face => face.map(([x, v]) => {
    const u = 1 - v, a = sample(bounds.left, u) + 1, b = sample(bounds.right, u) - 1;
    return [(a + (b - a) * x) / 1667, 1 - (bounds.y0 + (bounds.y1 - bounds.y0) * u) / 3125];
  }));
}
console.log(JSON.stringify({shell, interior}));
