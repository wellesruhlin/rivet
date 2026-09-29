import {test} from 'node:test';
import assert from 'node:assert/strict';
import {existsSync} from 'node:fs';
import {chartFor, products, specAt, summary} from './index.js';
import {stockCovers} from './covers.js';
import {modelById} from '../configurator/pack.js';

test('every stock ski has a cover cutout and original photographs', () => {
  const art = new URL('../../public/', import.meta.url);
  for (const p of products) {
    assert.ok(stockCovers[p.id], `${p.id} cover`);
    assert.ok(existsSync(new URL(`art/stock/${p.id}.webp`, art)), `${p.id} cutout`);
    for (const photo of p.photos) assert.ok(existsSync(new URL(`photos/${photo}`, art)), photo);
  }
});

test('stock skis link to their custom-order model, except the Valkyrie', () => {
  for (const p of products) {
    if (p.id === 'valkyrie') assert.equal(p.custom, null);
    else assert.ok(modelById(p.custom), `${p.id} → ${p.custom}`);
  }
});

test('spec charts are complete and internally consistent', () => {
  for (const p of products) {
    const chart = chartFor(p.id);
    if (!chart) continue;
    for (const length of chart.lengths) {
      const row = specAt(p.id, length);
      for (const [field, value] of Object.entries(row)) if (!['chart', 'year', 'weightNote'].includes(field)) assert.equal(typeof value, 'number', `${p.id} ${length} ${field}`);
      assert.ok(row.tip > row.waist && row.tail > row.waist, `${p.id} ${length} sidecut`);
      assert.ok(row.weight > 5 && row.weight < 11, `${p.id} ${length} weight is per pair`);
    }
    // Longer skis of a model are never lighter.
    const weights = chart.lengths.map(l => specAt(p.id, l).weight);
    assert.deepEqual(weights, [...weights].sort((a, b) => a - b), `${p.id} weights`);
  }
  assert.equal(summary('gpo').waist, '111–116');
  assert.equal(summary('praxis-slugger').dims, '137-102-123');
  assert.equal(summary('gpo').dimsRange, '135–140 / 111–116 / 123–128');
  assert.equal(specAt('mvp-94', 154), null);
});
