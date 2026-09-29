import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync, existsSync} from 'node:fs';
import {constructionRecipe, generateConstruction, LAYUP_IDS} from './construction.mjs';
import {configuredGeometry, configuredMesh} from './configured.js';
import {defaultConfig} from '../config.js';
import library from './on3p.json' with {type: 'json'};

const build = (layup = 'Stock', handle = 'jeffrey-106', length = 186) => generateConstruction(configuredMesh(configuredGeometry({...defaultConfig, model: handle, length, layup})), layup);

test('published materials, base/edge sizes, and optional inserts match all six layups', () => {
  for (const layup of LAYUP_IDS) {
    const {recipe, layers} = build(layup);
    assert.equal(recipe.baseMm, ['LITE', 'Tour'].includes(layup) ? 1.4 : 1.8);
    assert.equal(layers.filter(l => l.material === 'rubber').length, 6);
    assert.equal(layers.filter(l => l.material === 'scalium').length, ['Leaf Spring', 'Torsion Bar'].includes(layup) ? 1 : 0);
    assert.equal(layers.filter(l => l.material === 'mounting').length, ['50/50', 'Tour'].includes(layup) ? 1 : 0);
    assert.equal(layers.some(l => l.material === 'paulownia'), ['50/50', 'Tour'].includes(layup));
    assert.match(recipe.note, /illustrative/);
  }
  assert.throws(() => constructionRecipe('imaginary'));
});

test('all supported shapes produce closed finite construction solids with published base depth', () => {
  for (const model of library.models) for (const size of model.lengths) {
    const {layers, recipe} = build('Tour', model.handle, size.length_cm);
    for (const layer of layers) {
      assert.ok(layer.positions.flat().every(Number.isFinite), layer.id);
      assert.ok(layer.uvs.flat(2).every(Number.isFinite), layer.id);
      const edges = new Map();
      layer.faces.forEach(face => face.forEach((a, i) => {
        const key = [a, face[(i + 1) % face.length]].sort((x, y) => x - y).join(',');
        edges.set(key, (edges.get(key) || 0) + 1);
      }));
      assert.ok([...edges.values()].every(count => count === 2), `${layer.id} manifold`);
    }
    const base = layers.find(l => l.id === 'base');
    for (let i = 0; i < base.positions.length; i += 4) {
      const a = base.positions[i], b = base.positions[i + 3];
      assert.ok(Math.abs(Math.hypot(...a.map((x, k) => x - b[k])) * 1000 - recipe.baseMm) < 1e-8);
    }
  }
});

test('Torsion Bar reaches farther than Leaf Spring; leaf is broader; mounting plate stays underfoot', () => {
  const dimensions = layer => [0, 2].map(axis => Math.max(...layer.positions.map(p => p[axis])) - Math.min(...layer.positions.map(p => p[axis])));
  const torsion = dimensions(build('Torsion Bar').layers.find(l => l.id === 'insert'));
  const leaf = dimensions(build('Leaf Spring').layers.find(l => l.id === 'insert'));
  const mount = dimensions(build('50/50').layers.find(l => l.id === 'insert'));
  assert.ok(torsion[1] > leaf[1] * 1.4);
  assert.ok(leaf[0] > torsion[0] * 1.4);
  assert.ok(mount[1] < leaf[1]);
});

test('browser and Blender use the identical dependency-free construction generator', t => {
  const canonical = new URL('../../../../labs/on3p-ski-lab/construction.mjs', import.meta.url);
  if (!existsSync(canonical)) return t.skip('Blender lab is not present in this standalone checkout');
  // Path resolves from src/geometry up to the repo root, then into labs/on3p-ski-lab.
  assert.equal(readFileSync(new URL('./construction.mjs', import.meta.url), 'utf8'), readFileSync(canonical, 'utf8'));
});

test('every construction layer maps to one described, highlightable legend entry', async () => {
  const {LAYER_KEYS, layerKey} = await import('./construction-renderer.js');
  const {constructionLayers} = await import('../construction-layers.js');
  for (const layup of LAYUP_IDS) {
    const {layers, recipe} = build(layup);
    const keys = new Set(layers.map(layer => layerKey(layer.id)));
    assert.ok([...keys].every(key => LAYER_KEYS.includes(key)), layup);
    assert.equal(keys.has('insert'), recipe.metal || recipe.hybrid, layup);
    const legend = constructionLayers(recipe, {layup, sidewall: 'Red'});
    assert.deepEqual(legend.map(entry => entry.key), LAYER_KEYS);
    assert.ok(legend.every(entry => entry.name && entry.spec && entry.about), layup);
    assert.equal(legend.find(entry => entry.key === 'insert').empty === true, !keys.has('insert'), layup);
  }
});
