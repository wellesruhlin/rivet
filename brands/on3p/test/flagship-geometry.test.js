import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {configuredGeometry, configuredMesh} from '../src/geometry/configured.js';
import {bufferGeometry} from '@arc/configurator/studio3d/renderer';
import references from '../src/geometry/traced-models.json' with {type: 'json'};
import {defaultConfig, normalizeConfig, compatibility} from '../src/index.js';

const build = (model = 'jeffrey-106', length = 186, patch = {}) => normalizeConfig({...defaultConfig, model, length, ...patch});

test('every supported selection uses the selected published dimensions and a closed finite mesh', () => {
  for (const model of references.models) for (const spec of model.lengths) {
    if (!compatibility.models[model.handle].lengths.includes(spec.length_cm)) continue;
    const resolved = configuredGeometry(build(model.handle, spec.length_cm));
    assert.equal(resolved.definition.lengthMm, spec.length_cm * 10);
    assert.equal(resolved.definition.tipMm, spec.tip_mm);
    assert.equal(resolved.definition.waistMm, spec.waist_mm);
    assert.equal(resolved.definition.tailMm, spec.tail_mm);
    const mesh = configuredMesh(resolved);
    assert.ok(mesh.positions.flat().every(Number.isFinite));
    assert.ok(mesh.uvs.flat(2).every(v => Number.isFinite(v) && v >= 0 && v <= 1));
    const edges = new Map();
    mesh.faces.forEach(face => face.forEach((a, i) => {
      const b = face[(i + 1) % face.length];
      const key = [a, b].sort((x, y) => x - y).join(',');
      edges.set(key, (edges.get(key) ?? 0) + 1);
    }));
    assert.ok([...edges.values()].every(count => count === 2), `${model.handle} ${spec.length_cm} is closed`);
    for (const [i, width] of [spec.tip_mm, spec.waist_mm, spec.tail_mm].entries()) {
      const section = mesh.sections.find(section => section.u === model.outline.landmarks[i]);
      assert.ok(Math.abs(section.widthMm - width) < 1e-8);
    }
  }
});

test('unsupported models and lengths do not silently substitute a different ski', () => {
  assert.equal(configuredGeometry({...build(), model: 'unknown-model'}), null);
  assert.equal(configuredGeometry({...build(), length: 999}), null);
});

test('every orderable model and length has its own 3D definition', () => {
  for (const [handle, rule] of Object.entries(compatibility.models)) for (const length of rule.lengths) {
    const resolved = configuredGeometry(build(handle, length));
    assert.ok(resolved, `${handle} ${length} has geometry`);
    assert.equal(resolved.model.handle, handle);
    assert.equal(resolved.definition.lengthMm, length * 10);
  }
});

test('Ripper changes the estimated profile while preserving published planform and immutable source data', () => {
  const hash = () => createHash('sha256').update(JSON.stringify(references)).digest('hex');
  const before = hash();
  for (const model of references.models) for (const length of compatibility.models[model.handle].ripperLengths) {
    const stock = configuredGeometry(build(model.handle, length));
    const ripper = configuredGeometry(build(model.handle, length, {rocker: 'Ripper'}));
    assert.ok(ripper.definition.camberMm > stock.definition.camberMm);
    assert.ok(ripper.definition.tipRiseMm < stock.definition.tipRiseMm);
    assert.equal(ripper.definition.waistMm, stock.definition.waistMm);
    const a = stock.model.profile.contactU, b = ripper.model.profile.contactU;
    assert.ok(Math.abs((b[1] - b[0]) / (a[1] - a[0]) - 1.1) < 1e-8);
    assert.ok(configuredMesh(ripper).positions.flat().every(Number.isFinite));
  }
  assert.equal(hash(), before);
});

test('layup changes base/steel dimensions; cosmetic and unmeasured choices do not invent shape changes', () => {
  const stock = configuredGeometry(build());
  const lite = configuredGeometry(build('jeffrey-106', 186, {layup: 'LITE'}));
  assert.equal(stock.model.construction.baseThicknessMm, 1.8);
  assert.equal(lite.model.construction.baseThicknessMm, 1.4);
  assert.equal(lite.model.construction.steelHeightMm, 2);
  assert.equal(lite.model.construction.steelWidthMm, 2.2);
  assert.equal(lite.definition.thicknessMm, stock.definition.thicknessMm);
  const cosmetic = configuredGeometry(build('jeffrey-106', 186, {sidewall: 'Red', flex: 'Stiff', detune: true}));
  assert.deepEqual(cosmetic, stock);
});

test('print UVs keep nose at top and opposite top/base handedness, without waist stretching', () => {
  const resolved = configuredGeometry(build());
  const mesh = configuredMesh(resolved);
  const maxWidth = Math.max(resolved.definition.tipMm, resolved.definition.tailMm);
  for (const material of [0, 1]) {
    const fi = mesh.materials.findIndex((m, fi) => m === material && mesh.faces[fi].every(id => {
      const u = mesh.sections[Math.floor(id / mesh.ringSize)]?.u;
      return u > .48 && u < .52;
    }));
    assert.ok(fi >= 0);
    mesh.faces[fi].forEach((id, corner) => {
      const [u, v] = mesh.uvs[fi][corner];
      const x = mesh.positions[id][0] * 1000;
      const section = mesh.sections[Math.floor(id / mesh.ringSize)];
      assert.ok(Math.abs(u - (.5 + (material === 1 ? x : -x) / maxWidth)) < 1e-8);
      assert.equal(v, 1 - section.u);
    });
  }
});

test('render geometry retains its material groups and finite unit lighting normals', () => {
  const geometry = bufferGeometry(configuredMesh(configuredGeometry(build())));
  // The shared renderer has a fifth slot for printed sidewall text (unused by ON3P).
  assert.equal(geometry.groups.length, 5);
  const normals = geometry.getAttribute('normal');
  for (let i = 0; i < normals.count; i++) {
    assert.ok(Math.abs(Math.hypot(normals.getX(i), normals.getY(i), normals.getZ(i)) - 1) < 1e-5);
  }
  assert.equal(geometry.getAttribute('uv').count, geometry.getAttribute('position').count);
  geometry.dispose();
});
