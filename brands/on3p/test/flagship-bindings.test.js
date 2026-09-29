import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {bindingFor, bindingFit, bindingAllowed, bindingPlacement} from '../src/bindings.js';
import {normalizeConfig, applyConfigChange, totalPrice, bomLines, encodeConfig, decodeConfig, buildText, invalidateReviews} from '../src/index.js';
import {initialBuild, buildReducer, retainedBuildConfig} from './flagship-api.js';
import {configuredGeometry, configuredMesh} from '../src/geometry/configured.js';

const blue105 = '47243248074977';
const black115 = '47243248206049';
const black13 = '47243227955425';
const build = overrides => normalizeConfig({model: 'jeffrey-98', length: 186, ...overrides});

test('unavailable visual binding survives saves and shared links without becoming a quoted purchase', () => {
  const commercial = build({model: 'woodsman-108', length: 191});
  const saved = retainedBuildConfig(commercial, black115);
  assert.equal(JSON.parse(JSON.stringify({version: 5, config: saved})).config.binding, black115);
  const encoded = encodeConfig(saved);
  assert.equal(new URLSearchParams(encoded).get('binding'), black115);
  const restored = decodeConfig(encoded);
  assert.equal(restored.binding, '');
  assert.equal(totalPrice(restored), totalPrice(commercial));
  const sheet = buildText(commercial, {previewBinding: black115});
  assert.match(sheet, /Saved visual binding selection:.*Black.*115 mm.*47243248206049/);
  assert.match(sheet, /not in reference total/);
  assert.equal(retainedBuildConfig(restored, null).binding, '');
  assert.throws(() => retainedBuildConfig(commercial, 'unknown-variant'), /not in this catalog/);
});

test('available compatible bindings add once, keep cents, and survive saved links', () => {
  const c = build({binding: blue105});
  assert.equal(c.binding, blue105);
  assert.equal(totalPrice(c), 1598.95);
  assert.equal(bomLines(c).filter(line => line.key === 'binding').length, 1);
  assert.deepEqual(decodeConfig(encodeConfig(c)), c);
  assert.match(buildText(c), /PIVOT 2.0 15 GW.*Blue.*105 mm/);
  assert.match(buildText(c), /\$1,598\.95/);
  const removed = applyConfigChange(c, {binding: ''});
  assert.equal(totalPrice(removed.config), 1099);
  assert.deepEqual(removed.changes, []);
  assert.equal(build({model: 'woodsman-92', binding: black13}).binding, black13);
  assert.equal(totalPrice(build({model: 'woodsman-92', binding: black13})), 1498.95);
});

test('unavailable, oversized, undersized and unknown binding choices cannot enter a quote', () => {
  assert.equal(bindingFit(bindingFor(black115), 118).ok, false);
  assert.equal(bindingFit(bindingFor(black115), 90).ok, false);
  assert.equal(bindingAllowed(black115, 112), false);
  for (const binding of [black115, 'missing']) assert.equal(build({binding}).binding, '');
  assert.equal(build({model: 'billy-goat-118', binding: blue105}).binding, '');
  assert.equal(decodeConfig('model=jeffrey-98&length=186').binding, '');
});

test('changing ski width removes an incompatible pair visibly and reopens binding review', () => {
  const before = build({binding: blue105});
  const {config, changes} = applyConfigChange(before, {model: 'jeffrey-118'});
  assert.equal(config.binding, '');
  assert.ok(changes.some(change => change.field === 'binding' && /narrower/.test(change.text) && /stays on your skis as a visual test/.test(change.text)));
  assert.ok(!invalidateReviews(before, config, [0, 1, 2, 3]).includes(3));
  // A variant that left the catalog cannot be shown, so the notice does not promise it.
  const retired = applyConfigChange({...build(), binding: 'retired-variant'}, {}).changes.find(change => change.field === 'binding');
  assert.match(retired.text, /no longer in the catalog/);
  assert.doesNotMatch(retired.text, /visual test/);
});

test('a pair carried through a shape edit rejoins the total with a notice once it fits', () => {
  const wide = build({model: 'jeffrey-118'});
  const {config, changes} = applyConfigChange(wide, {model: 'jeffrey-98', binding: blue105});
  assert.equal(config.binding, blue105);
  assert.ok(changes.some(change => change.field === 'binding' && /added to your total \(\+\$499\.95\)/.test(change.text)));
  // Choosing directly in Bindings is not announced.
  assert.ok(!applyConfigChange(build(), {binding: blue105}).changes.some(change => change.field === 'binding'));
  // The removal notice retires once the binding is set again.
  let state = initialBuild({config: build({binding: blue105})});
  state = buildReducer(state, {type: 'patch', patch: {model: 'jeffrey-118', binding: blue105}});
  assert.match(state.adjustments.find(change => change.field === 'binding').text, /no longer in your total/);
  state = buildReducer(state, {type: 'patch', patch: {binding: ''}});
  assert.ok(!state.adjustments.some(change => change.field === 'binding'));
});

test('bindings is the fourth reviewed section before the final review', () => {
  const config = build();
  let state = initialBuild({config, graphicsConfirmed: ['base', 'sidewall']});
  for (let i = 0; i < 3; i++) state = buildReducer(state, {type: 'advance'});
  assert.equal(state.step, 3);
  assert.equal(state.view, 'Bindings');
  state = buildReducer(state, {type: 'advance'});
  assert.equal(state.step, 4);
  assert.deepEqual(state.reviewed, [0, 1, 2, 3]);
  assert.equal(buildReducer(state, {type: 'advance'}), state);
});

test('Blender export is a self-contained finite meter-scale mesh with recolorable paint', () => {
  const bytes = readFileSync(new URL('../public/models/look-pivot-15.glb', import.meta.url));
  assert.equal(bytes.readUInt32LE(0), 0x46546c67);
  assert.equal(bytes.readUInt32LE(8), bytes.length);
  const gltf = JSON.parse(bytes.subarray(20, 20 + bytes.readUInt32LE(12)).toString());
  assert.match(gltf.asset.generator, /Blender/);
  assert.ok(gltf.meshes.length > 20);
  assert.ok(gltf.materials.some(material => material.name === 'Pivot_Paint'));
  assert.ok(gltf.buffers.every(buffer => !buffer.uri));
  for (const accessor of gltf.accessors.filter(item => item.min)) {
    assert.ok([...accessor.min, ...accessor.max].every(Number.isFinite));
  }
  for (const model of ['jeffrey-98', 'billy-goat-118', 'woodsman-92']) {
    const mesh = configuredMesh(configuredGeometry(build({model})));
    const placement = bindingPlacement(mesh);
    assert.equal(placement.z, mesh.definition.mountMm / 1000);
    assert.ok(Object.values(placement).every(Number.isFinite));
    assert.ok(placement.y >= 0 && placement.y < .03);
  }
});
