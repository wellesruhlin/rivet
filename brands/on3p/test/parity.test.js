// The engine pack must behave exactly like the standalone flagship it replaced. The
// reference copies in ./reference are the flagship's own rules and session reducer.
import test from 'node:test';
import assert from 'node:assert/strict';
import {createSessionReducer, initialSession} from '@arc/configurator/engine';
import {engine} from '../src/index.js';
import * as flagship from './reference/flagship-config.js';
import {buildReducer, initialBuild} from './reference/flagship-build-state.js';
import {catalog, compatibility, categories, layups, flexOptions, sidewalls} from '../src/rules.js';
import {bindingCatalog} from '../src/bindings.js';

// A small deterministic generator, so a failure always reproduces.
let seed = 20260929;
const random = () => ((seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648);
const pick = list => list[Math.floor(random() * list.length)];
const handles = catalog.models.map(m => m.handle);
const lengths = [...new Set(catalog.models.flatMap(m => m.lengths.map(l => l.length_cm)))];
const bindingIds = bindingCatalog.products.flatMap(p => p.variants.map(v => v.id));
const values = {
  category: [...categories.map(c => c.id), '', 'Nope'],
  model: [...handles, '', 'not-a-ski'],
  length: [...lengths, null, 999, '186'],
  rocker: ['Signature', 'Ripper', 'Other'],
  top: [...catalog.tops.slice(0, 20).map(g => g.id), 'missing'],
  base: [...catalog.bases.slice(0, 20).map(g => g.id), 'missing'],
  sidewall: [...sidewalls.map(([name]) => name), 'Plaid'],
  layup: [...layups.map(l => l.id), 'Carbon'],
  flex: [...flexOptions.map(f => f.id), 'Wet noodle'],
  detune: [true, false],
  skinClip: [true, false],
  binding: [...bindingIds, '', '404'],
};
const fields = Object.keys(values);
const randomInput = () => Object.fromEntries(fields.filter(() => random() < .8).map(field => [field, pick(values[field])]));
// Most edits are valid ones; a valid build is the realistic starting point.
function validBuild() {
  const category = pick(categories);
  const model = pick(category.models);
  return flagship.normalizeConfig({category: category.id, model, length: pick(compatibility.models[model].lengths), rocker: pick(['Signature', 'Ripper']), layup: pick(layups).id, flex: pick(flexOptions).id, detune: random() < .5, skinClip: random() < .5, binding: pick([...bindingIds, ''])});
}
const texts = changes => changes.map(change => `${change.field}: ${change.text.trim()}`).sort();

test('normalization matches for 5,000 generated inputs', () => {
  for (let i = 0; i < 5000; i++) {
    const input = randomInput();
    assert.deepEqual(engine.normalize(input), flagship.normalizeConfig(input), JSON.stringify(input));
  }
});

test('defaults match', () => {
  assert.deepEqual(engine.defaults(), flagship.defaultConfig);
});

test('edits produce the same build and the same explanations', () => {
  for (let i = 0; i < 4000; i++) {
    const previous = random() < .7 ? validBuild() : flagship.normalizeConfig(randomInput());
    const patch = Object.fromEntries(Array.from({length: 1 + Math.floor(random() * 2)}, () => {
      const field = pick(fields);
      return [field, pick(values[field])];
    }));
    const ours = engine.apply(previous, patch), theirs = flagship.applyConfigChange(previous, patch);
    const context = JSON.stringify({previous, patch});
    assert.deepEqual(ours.config, theirs.config, context);
    assert.deepEqual(texts(ours.changes), texts(theirs.changes), context);
  }
});

test('the build sheet and total match', () => {
  for (let i = 0; i < 2000; i++) {
    const config = random() < .6 ? validBuild() : flagship.normalizeConfig(randomInput());
    const ours = engine.bom(config).map(({key, label, value, price, step, pending}) => ({key, label, value, price, step, ...(pending ? {pending} : {})}));
    const theirs = flagship.bomLines(config).map(({key, label, value, price, step, pending}) => ({key, label, value, price, step, ...(pending ? {pending} : {})}));
    assert.deepEqual(ours, theirs, JSON.stringify(config));
    assert.equal(engine.total(config).amount, flagship.totalPrice(config));
    assert.equal(engine.ready(config), flagship.shapeReady(config));
  }
});

test('flagship build links still open the same build', () => {
  for (let i = 0; i < 1000; i++) {
    const config = validBuild();
    const link = flagship.encodeConfig(config);
    assert.deepEqual(engine.decode(link).config, flagship.decodeBuild(link).config, link);
    assert.deepEqual(engine.decode(engine.encode(config)).config, config);
  }
});

test('the exported build sheet keeps every flagship line', () => {
  for (let i = 0; i < 200; i++) {
    const config = validBuild();
    const ours = engine.text(config).split('\n');
    const notes = line => line.startsWith('Independent fan prototype');
    for (const line of flagship.buildText(config).split('\n').filter(line => line && !notes(line))) assert.ok(ours.includes(line), line);
  }
});

test('the session walks the flow exactly as the flagship did', () => {
  const reduce = createSessionReducer(engine);
  // Edits as the UI sends them: an unorderable binding is sent as '' and kept as a visual test.
  const actions = state => {
    const kind = random();
    if (kind < .35) {
      const field = pick([...fields, 'base', 'sidewall', 'base', 'sidewall']);
      const value = pick(values[field]);
      if (field === 'binding' && value && engine.apply(state.config, {binding: value}).config.binding !== value) return {type: 'patch', patch: {binding: ''}};
      return {type: 'patch', patch: {[field]: value}};
    }
    if (kind < .6) return {type: 'advance'};
    if (kind < .9) return {type: 'goto', step: Math.floor(random() * 5), field: pick(['', 'top', 'base', 'sidewall', 'layup'])};
    return {type: 'view', view: pick(['Topsheet', 'Base', '3D'])};
  };
  const comparable = state => ({config: state.config, step: state.step, field: state.field, reviewed: [...state.reviewed].sort(), confirmed: state.confirmed ?? state.graphicsConfirmed, view: state.view, adjustments: texts(state.adjustments)});
  for (let run = 0; run < 300; run++) {
    const start = random() < .8 ? validBuild() : flagship.defaultConfig;
    let ours = initialSession(engine, {config: start}), theirs = initialBuild({config: start});
    const trail = [];
    for (let i = 0; i < 25; i++) {
      const action = actions(ours);
      trail.push(action);
      ours = reduce(ours, action);
      theirs = buildReducer(theirs, action);
      assert.deepEqual(comparable(ours), comparable(theirs), JSON.stringify({start, trail}));
    }
  }
});
