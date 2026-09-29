// The lab's meshes and construction layers must not change when the shared kernel does.
// Fingerprints recorded 2026-09-29 from the original lab code, before the kernels were merged.
import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {resolve, generateMesh} from '../geometry.mjs';
import {generateConstruction, LAYUP_IDS} from '../construction.mjs';

const fingerprint = value => createHash('sha256').update(JSON.stringify(value)).digest('hex').slice(0, 16);
const data = JSON.parse(readFileSync(new URL('../data/on3p.json', import.meta.url)));
const golden = JSON.parse(readFileSync(new URL('./golden.json', import.meta.url)));

test('every stock mesh matches its recorded fingerprint', () => {
  for (const model of data.models) for (const size of model.lengths) {
    const key = `${model.handle}@${size.length_cm}`;
    assert.equal(fingerprint(generateMesh(model, resolve(model, size.length_cm))), golden.meshes[key], key);
  }
});

test('every layup builds the recorded construction layers', () => {
  for (const model of data.models) for (const size of model.lengths) for (const layup of LAYUP_IDS) for (const wood of [false, true]) {
    const key = `${model.handle}@${size.length_cm}/${layup}/${wood}`;
    const shell = generateMesh(model, resolve(model, size.length_cm));
    assert.equal(fingerprint(generateConstruction(shell, layup, {wood})), golden.construction[key], key);
  }
});
