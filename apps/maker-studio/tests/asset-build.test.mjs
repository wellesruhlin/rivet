import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createAssetBuild, readAssetBuild, assetDigest} from '../packages/configurator-core/asset-build.mjs';

const input = () => ({product: {id: 'ski-assembly', version: '2026-09'}, resolverRevision: 'reference-1',
  selection: {ski: 'woodsman-108', lengthCm: 191, binding: '47243248206049', boot: {confirmedBslMm: null}},
  components: [{id: 'ski-shell', revision: '1', sourceSha256: 'a'.repeat(64)}],
  resources: [{path: 'exports/cpq/assembly.glb', mimeType: 'model/gltf-binary', bytes: 50, sha256: 'b'.repeat(64)}],
  properties: {fitAccepted: false, bootCenter: {value: null, units: 'mm'}}});

test('saved physical build survives inventory/pricing changes and roundtrip without turning unknown fit into a value', async () => {
  const data = input();
  const first = await createAssetBuild({...data, availability: false, price: 450});
  const later = await createAssetBuild({...data, availability: true, price: 510});
  assert.equal(first.contentSha256, later.contentSha256);
  const restored = await readAssetBuild(JSON.stringify(first), {productId: 'ski-assembly', supportedRevisions: ['reference-1']});
  assert.equal(restored.selection.binding, '47243248206049');
  assert.equal(restored.selection.boot.confirmedBslMm, null);
  assert.equal(restored.properties.bootCenter.value, null);
  assert.throws(() => {restored.selection.lengthCm = 186;}, TypeError);
});
test('a correction creates a new content identity and never silently upgrades an old release', async () => {
  const data = input(), first = await createAssetBuild(data);
  data.components[0].sourceSha256 = 'c'.repeat(64);
  const changed = await createAssetBuild(data);
  assert.notEqual(first.contentSha256, changed.contentSha256);
  await assert.rejects(readAssetBuild(first, {supportedRevisions: ['reference-2']}), /unsupported/);
  const tampered = JSON.parse(JSON.stringify(first)); tampered.selection.lengthCm = 186;
  await assert.rejects(readAssetBuild(tampered), /digest/);
});
test('digest is key-order independent and rejected values cannot be silently serialized away', async () => {
  assert.equal(await assetDigest({a: 1, b: {x: null, y: 2}}), await assetDigest({b: {y: 2, x: null}, a: 1}));
  for (const bad of [NaN, Infinity, undefined]) await assert.rejects(assetDigest({value: bad}), /finite JSON/);
});
test('resources remain portable and component identities unambiguous', async () => {
  for (const path of ['../asset.glb', 'C:/assets/file.glb', '/absolute.glb', 'http://host/a', 'a\\b.glb', 'a/%2e%2e/x']) {
    const data = input(); data.resources[0].path = path;
    await assert.rejects(createAssetBuild(data), /portable/);
  }
  const data = input(); data.components.push({...data.components[0]});
  await assert.rejects(createAssetBuild(data), /unique identity/);
});
