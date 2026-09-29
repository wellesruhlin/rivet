import test from 'node:test';
import assert from 'node:assert/strict';
import {generateSkiMesh, meshReport, mountPoint, buildLayers, layerReport, across} from '../src/index.js';

// A simple sidecut ski: 180 cm, 130/100/120, 60 mm tip rise.
const shape = (extra = {}) => ({
  lengthMm: 1800, tipMm: 130, waistMm: 100, tailMm: 120, mountMm: -60,
  widthAt: u => 100 + 30 * (1 - u) ** 4 + 20 * u ** 4,
  heightAt: u => (u < .15 ? 60 * ((.15 - u) / .15) ** 2 : u > .9 ? 20 * ((u - .9) / .1) ** 2 : 0),
  thicknessAt: u => 4 + 10 * Math.sin(Math.PI * u),
  steelWidthMm: 2.5, steelHeightMm: 2.5, baseMm: 1.8, steelStartU: .05, stations: [.15, .9],
  ...extra,
});

test('a closed, finite mesh at the published length', () => {
  const mesh = generateSkiMesh(shape());
  const report = meshReport(mesh);
  assert.ok(report.finite);
  assert.equal(report.open, 0);
  const z = mesh.positions.map(p => p[2]);
  assert.ok(Math.abs((Math.max(...z) - Math.min(...z)) * 1000 - 1800) < .5);
  assert.ok(mesh.sections.some(s => s.u === .15), 'stations are sampled exactly');
});

test('edges are capped by local thickness unless edgeClamp is false', () => {
  const thin = shape({thicknessAt: () => 3});
  const heights = mesh => mesh.positions.filter((_, i) => i % 12 === 5).map(p => p[1]);
  const clamped = generateSkiMesh(thin), exact = generateSkiMesh({...thin, edgeClamp: false});
  assert.ok(Math.max(...heights(exact)) > Math.max(...heights(clamped)));
});

test('uvAt replaces artwork UVs for topsheet and base only', () => {
  const calls = [];
  const mesh = generateSkiMesh(shape({uvAt: (u, x, band) => (calls.push(band), [x, u])}));
  assert.ok(calls.includes(0) && calls.includes(1));
  assert.ok(calls.every(band => band === 0 || band === 1));
  assert.equal(mesh.faces.length, mesh.uvs.length);
});

test('definition, surfaces and axes can be supplied by the caller', () => {
  const mesh = generateSkiMesh(shape({definition: {custom: true}, surfaces: ['a'], axes: 'test'}));
  assert.deepEqual(mesh.definition, {custom: true});
  assert.deepEqual(mesh.surfaces, ['a']);
  assert.equal(mesh.axes, 'test');
});

test('the mount point sits on the topsheet at the mount line', () => {
  const mesh = generateSkiMesh(shape());
  const p = mountPoint(mesh);
  assert.equal(p.z, -.06);
  assert.ok(p.y > 0);
});

test('construction slabs are closed; tiled layers use 24 mm material UVs', () => {
  const mesh = generateSkiMesh(shape());
  const [art, tiled] = buildLayers(mesh, [
    {id: 'top', material: 'topsheet', artwork: 'top', bounds: across(), bottom: s => s.thicknessMm - .4, top: s => s.thicknessMm},
    {id: 'core', material: 'bamboo', tiled: true, label: 'Core', bounds: across(3), bottom: () => 2, top: s => s.thicknessMm - 1},
  ]);
  for (const layer of [art, tiled]) assert.equal(layerReport(layer).open, 0);
  assert.equal(tiled.label, 'Core');
  assert.ok(Math.max(...tiled.uvs.flat(2)) > 1, 'tiled UVs repeat');
  assert.ok(Math.max(...art.uvs.flat(2)) <= 1.0001, 'artwork UVs stay in the image');
});
