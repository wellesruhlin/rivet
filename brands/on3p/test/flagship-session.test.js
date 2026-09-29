import {test} from 'node:test';
import assert from 'node:assert/strict';
import {buildReducer, initialBuild, nextGraphicField} from './flagship-api.js';
import {decodeBuild} from '../src/index.js';

const run = (state, ...actions) => actions.reduce(buildReducer, state);
const ready = () => run(initialBuild(), {type: 'patch', patch: {category: 'Freeride'}}, {type: 'patch', patch: {model: 'woodsman-108'}}, {type: 'patch', patch: {length: 181}});
const artReady = () => {
  const state = ready();
  return run(state, {type: 'patch', patch: {base: state.config.base, sidewall: state.config.sidewall}});
};

test('later steps stay locked until the shape is complete', () => {
  const locked = run(initialBuild(), {type: 'goto', step: 2}, {type: 'advance'});
  assert.equal(locked.step, 0);
  assert.deepEqual(locked.reviewed, []);
  const open = run(artReady(), {type: 'advance'}, {type: 'advance'});
  assert.equal(open.step, 2);
  assert.deepEqual(open.reviewed, [0, 1]);
});

test('jumping ahead does not mark skipped sections reviewed', () => {
  const state = run(artReady(), {type: 'goto', step: 3});
  assert.equal(state.step, 3);
  assert.deepEqual(state.reviewed, []);
});

test('editing a reviewed section reopens only that section', () => {
  const state = run(artReady(), {type: 'advance'}, {type: 'advance'}, {type: 'advance'});
  assert.deepEqual(state.reviewed, [0, 1, 2]);
  const edited = run(state, {type: 'patch', patch: {sidewall: 'Orange'}});
  assert.deepEqual(edited.reviewed, [0, 2]);
});

test('dependency changes stay visible until dismissed, then clear', () => {
  const state = run(ready(), {type: 'patch', patch: {layup: 'Torsion Bar'}}, {type: 'patch', patch: {model: 'oski-102'}});
  assert.ok(state.adjustments.length > 0);
  const quiet = run(state, {type: 'patch', patch: {sidewall: 'Blue'}});
  assert.deepEqual(quiet.adjustments, state.adjustments);
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
  assert.equal(run(ready(), {type: 'view', view: 'Technical'}, {type: 'goto', step: 1, field: 'sidewall'}).view, 'Sidewall');
});

test('loading a shared link starts over with review outstanding', () => {
  const {config, changes} = decodeBuild('category=Freeride&model=woodsman-108&length=181&layup=50%2F50');
  const state = run(ready(), {type: 'advance'}, {type: 'load', config, changes});
  assert.equal(state.step, 0);
  assert.deepEqual(state.reviewed, []);
  assert.equal(state.config.layup, '50/50');
});

test('construction entry opens the interior, and leaving returns to the exterior', () => {
  const entered = run(artReady(), {type: 'advance'}, {type: 'advance'});
  assert.equal(entered.view, 'Construction');
  assert.equal(run(artReady(), {type: 'goto', step: 2, field: 'layup'}).view, 'Construction');
  assert.equal(run(artReady(), {type: 'goto', step: 2}).view, 'Construction');
  assert.equal(run(entered, {type: 'advance'}).view, 'Bindings');
  assert.equal(run(entered, {type: 'goto', step: 1, field: 'base'}).view, 'Base');
});

test('graphics continue prompts for base first and explicitly accepts unchanged defaults', () => {
  const top = run(ready(), {type: 'advance'});
  const base = run(top, {type: 'advance'});
  assert.equal(base.step, 1);
  assert.equal(base.field, 'base');
  assert.deepEqual(base.graphicsConfirmed, []);
  const sidewall = run(base, {type: 'advance'});
  assert.equal(sidewall.field, 'sidewall');
  assert.deepEqual(sidewall.graphicsConfirmed, ['base']);
  const construction = run(sidewall, {type: 'advance'});
  assert.equal(construction.step, 2);
  assert.deepEqual(construction.graphicsConfirmed, ['base', 'sidewall']);
  assert.deepEqual(construction.config, top.config);
  assert.deepEqual(construction.reviewed, [0, 1]);
});

test('visiting tabs is not confirmation; later tabs redirect to the first unanswered choice', () => {
  const visited = run(ready(), {type: 'goto', step: 1, field: 'base'}, {type: 'goto', step: 1, field: 'sidewall'});
  assert.deepEqual(visited.graphicsConfirmed, []);
  for (const step of [2, 3, 4]) {
    const redirected = run(visited, {type: 'goto', step});
    assert.equal(redirected.step, 1);
    assert.equal(redirected.field, 'base');
  }
  const baseChosen = run(visited, {type: 'patch', patch: {base: visited.config.base}});
  assert.equal(nextGraphicField(baseChosen), 'sidewall');
  assert.equal(run(baseChosen, {type: 'goto', step: 2}).field, 'sidewall');
  const both = run(baseChosen, {type: 'patch', patch: {sidewall: 'Black'}});
  assert.equal(nextGraphicField(both), undefined);
  assert.equal(run(both, {type: 'goto', step: 2}).step, 2);
});

test('a model-driven base replacement needs confirmation again, but unchanged sidewalls stay confirmed', () => {
  const park = run(artReady(), {type: 'patch', patch: {category: 'Park'}});
  const oski = run(park, {type: 'patch', patch: {model: 'oski-102'}});
  assert.notEqual(oski.config.base, park.config.base);
  assert.deepEqual(oski.graphicsConfirmed, ['sidewall']);
  const restored = run(oski, {type: 'load', config: oski.config, graphicsConfirmed: oski.graphicsConfirmed});
  assert.equal(nextGraphicField(restored), 'base');
  assert.deepEqual(restored.graphicsConfirmed, ['sidewall']);
});
