import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createSessionReducer, initialSession, formatWeight} from '@ski-studio/configurator/engine';
import {engine, decodeBuild, normalizeConfig, defaultConfig} from './brand/index.js';

const reduce = createSessionReducer(engine);
const run = (state, ...actions) => actions.reduce(reduce, state);
const ready = () => run(initialSession(engine), {type: 'patch', patch: {category: 'Freeride'}}, {type: 'patch', patch: {model: 'woodsman-108'}}, {type: 'patch', patch: {length: 181}});

test('later steps stay locked until the shape is complete', () => {
  const locked = run(initialSession(engine), {type: 'goto', step: 2}, {type: 'advance'});
  assert.equal(locked.step, 0);
  assert.deepEqual(locked.reviewed, []);
  const open = run(ready(), {type: 'advance'}, {type: 'advance'});
  assert.equal(open.step, 2);
  assert.deepEqual(open.reviewed, [0, 1]);
});

test('jumping ahead does not mark skipped sections reviewed', () => {
  const state = run(ready(), {type: 'goto', step: 3});
  assert.equal(state.step, 3);
  assert.deepEqual(state.reviewed, []);
});

test('editing a reviewed section reopens only that section', () => {
  const state = run(ready(), {type: 'advance'}, {type: 'advance'}, {type: 'advance'});
  assert.deepEqual(state.reviewed, [0, 1, 2]);
  assert.deepEqual(run(state, {type: 'patch', patch: {sidewall: 'Orange'}}).reviewed, [0, 2]);
});

test('dependency changes stay visible until dismissed, then clear', () => {
  const state = run(ready(), {type: 'patch', patch: {layup: 'Torsion Bar'}}, {type: 'patch', patch: {model: 'oski-102'}});
  assert.ok(state.adjustments.length > 0);
  assert.deepEqual(run(state, {type: 'patch', patch: {sidewall: 'Blue'}}).adjustments, state.adjustments);
  assert.deepEqual(run(state, {type: 'dismissAdjustments'}).adjustments, []);
});

test('choose-again instructions retire once the customer answers them', () => {
  const moved = run(ready(), {type: 'patch', patch: {length: 191}}, {type: 'patch', patch: {category: 'Park'}});
  assert.deepEqual(moved.adjustments.map(c => c.field), ['model', 'length']);
  const withModel = run(moved, {type: 'patch', patch: {model: 'oski-102'}});
  assert.deepEqual(withModel.adjustments.map(c => c.field), ['length']);
  assert.deepEqual(run(withModel, {type: 'patch', patch: {length: 181}}).adjustments, []);
});

test('build-sheet edits open the right gallery view', () => {
  assert.equal(run(ready(), {type: 'goto', step: 1, field: 'base'}).view, 'Base');
  assert.equal(run(ready(), {type: 'view', view: 'Technical'}, {type: 'goto', step: 1, field: 'sidewall'}).view, 'Topsheet');
});

test('loading a shared link starts over with review outstanding', () => {
  const {config, changes} = decodeBuild('category=Freeride&model=woodsman-108&length=181&layup=50%2F50');
  const state = run(ready(), {type: 'advance'}, {type: 'load', config, changes});
  assert.equal(state.step, 0);
  assert.deepEqual(state.reviewed, []);
  assert.equal(state.config.layup, '50/50');
});

test('weight follows the layup using ON3P’s published per-ski ranges', () => {
  const build = layup => normalizeConfig({...defaultConfig, model: 'woodsman-108', length: 181, layup});
  const text = layup => formatWeight(engine.weight(build(layup))).text;
  assert.equal(text('Stock'), '2,040 g / ski');
  assert.equal(text('LITE'), '1,890–1,940 g / ski');
  assert.equal(text('Tour'), '1,640–1,715 g / ski');
  assert.equal(text('Torsion Bar'), '2,115–2,140 g / ski');
  assert.match(engine.text(build('Tour')), /Weight: 1,640–1,715 g \/ ski/);
  assert.equal(engine.weight(normalizeConfig({...defaultConfig, model: 'woodsman-108'})), null);
});
