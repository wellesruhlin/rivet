import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createEngine, formatMoney, formatWeight} from './engine.js';
import {createSessionReducer, initialSession} from './session.js';

// A deliberately small brand pack that exercises every group type.
const models = {
  fast: {id: 'fast', name: 'Fast 90', lengths: [170, 180], cores: ['wood', 'light']},
  wide: {id: 'wide', name: 'Wide 120', lengths: [180, 190], cores: ['wood']},
};
const categories = [
  {value: 'piste', label: 'Piste', models: ['fast']},
  {value: 'powder', label: 'Powder', models: ['wide']},
];
const pack = {
  currency: 'USD',
  steps: [{id: 'shape'}, {id: 'build'}, {id: 'review'}],
  copy: {exportTitle: 'FIXTURE', exportNotes: ['No order is placed.']},
  context: config => ({model: models[config.model], category: categories.find(c => c.value === config.category)}),
  groups: [
    {id: 'category', type: 'category', step: 'shape', label: 'Category', bom: false, resets: ['model', 'length'], options: () => categories},
    {
      id: 'model',
      type: 'model',
      step: 'shape',
      label: 'Model',
      required: true,
      options: (c, ctx) => (ctx.category?.models ?? []).map(id => ({value: id, label: models[id].name})),
      price: () => 1000,
    },
    {id: 'length', type: 'length', step: 'shape', label: 'Length', required: true, options: (c, ctx) => ctx.model?.lengths ?? [], format: v => (v ? `${v} cm` : '')},
    {
      id: 'core',
      type: 'choice',
      step: 'build',
      label: 'Core',
      options: () => [{value: 'wood', label: 'Wood'}, {value: 'light', label: 'Light'}],
      default: () => 'wood',
      reason: (v, c, ctx) => (ctx.model && !ctx.model.cores.includes(v) ? `${v} is not offered for ${ctx.model.name}.` : ''),
      price: v => (v === 'light' ? 150 : 0),
    },
    {id: 'clip', type: 'toggle', step: 'build', label: 'Clip', fixed: (c, ctx) => (ctx.model?.id === 'wide' ? true : undefined), price: (v, c, ctx) => (v && ctx.model?.id !== 'wide' ? 50 : 0), format: v => (v ? 'Clip' : 'No clip')},
    {id: 'art', type: 'gallery', step: 'build', label: 'Artwork', options: () => [{value: 'a1', label: 'Aurora'}, {value: 'a2', label: 'Birch'}], default: () => 'a1'},
    {id: 'profile', type: 'choice', step: 'build', label: 'Profile', options: () => [{value: 'std', label: 'Standard'}, {value: 'custom', label: 'Custom'}], default: () => 'std', price: v => (v === 'custom' ? {quote: [200, 500]} : 0)},
    {id: 'notes', type: 'text', step: 'build', label: 'Notes'},
  ],
  weight: (config, ctx) =>
    ctx.model && {unit: 'g', per: 'ski', base: {value: 2000, label: 'Stock'}, items: config.core === 'light' ? [{label: 'Light core', min: -300, max: -200}] : []},
};
const engine = createEngine(pack);
const ready = () => engine.apply(engine.apply(engine.apply(engine.defaults(), {category: 'piste'}).config, {model: 'fast'}).config, {length: 180}).config;

test('defaults are normalized and incomplete until model and length are chosen', () => {
  const config = engine.defaults();
  assert.deepEqual(config, {category: '', model: '', length: null, core: 'wood', clip: false, art: 'a1', profile: 'std', notes: ''});
  assert.equal(engine.ready(config), false);
  assert.equal(engine.ready(ready()), true);
});

test('a group reset clears its dependants without explanation noise', () => {
  const {config, changes} = engine.apply(ready(), {category: 'powder'});
  assert.equal(config.model, '');
  assert.equal(config.length, null);
  assert.deepEqual(changes.map(c => c.field), ['model', 'length']);
  assert.match(changes[1].text, /180 cm cleared/);
});

test('unavailable dependent choices fall back and are explained with the reason', () => {
  const light = engine.apply(ready(), {core: 'light'}).config;
  assert.equal(light.core, 'light');
  const moved = engine.apply({...light, category: 'powder'}, {model: 'wide'});
  assert.equal(moved.config.core, 'wood');
  assert.match(moved.changes.find(c => c.field === 'core').text, /Core: Light → Wood\. light is not offered for Wide 120\./);
});

test('fixed values override requests and cost nothing', () => {
  const wide = engine.normalize({category: 'powder', model: 'wide', length: 190, clip: false});
  assert.equal(wide.clip, true);
  assert.equal(engine.bom(wide).find(l => l.key === 'clip').price, 0);
});

test('totals separate fixed prices from quote-only items', () => {
  const config = engine.apply(ready(), {core: 'light', profile: 'custom'}).config;
  assert.deepEqual(engine.total(config), {amount: 1150, quote: [200, 500], currency: 'USD'});
  assert.match(engine.text(config), /quote \$200–\$500/);
});

test('links round-trip and repair tampered values', () => {
  const config = engine.apply(ready(), {core: 'light', notes: 'Tahoe trees'}).config;
  assert.deepEqual(engine.decode(engine.encode(config)).config, config);
  const tampered = engine.decode('category=powder&model=fast&length=999&core=nope');
  assert.equal(tampered.config.model, '');
  assert.equal(tampered.config.core, 'wood');
});

test('weight estimates combine published figures and never invent unpublished ones', () => {
  assert.equal(formatWeight(engine.weight(ready())).text, '2,000 g / ski');
  assert.equal(formatWeight(engine.weight(engine.apply(ready(), {core: 'light'}).config)).text, '1,700–1,800 g / ski');
  const bounded = formatWeight({unit: 'lb', per: 'pair', digits: 1, base: {value: 9}, items: [{label: 'Veneer', min: -0.5, max: -0.25}, {label: 'UL core', direction: -1}]});
  assert.equal(bounded.text, '< 8.8 lb / pair');
  assert.match(bounded.qualifier, /unpublished/);
});

test('session: steps unlock with the shape and edits reopen only their step', () => {
  const reduce = createSessionReducer(engine);
  let state = initialSession(engine);
  state = reduce(state, {type: 'advance'});
  assert.equal(state.step, 0);
  for (const patch of [{category: 'piste'}, {model: 'fast'}, {length: 170}]) state = reduce(state, {type: 'patch', patch});
  state = reduce(reduce(state, {type: 'advance'}), {type: 'advance'});
  assert.deepEqual(state.reviewed, [0, 1]);
  assert.deepEqual(reduce(state, {type: 'patch', patch: {art: 'a2'}}).reviewed, [0]);
});

test('money keeps cents only when an amount has them, and totals add in cents', () => {
  assert.equal(formatMoney(1600), '$1,600');
  assert.equal(formatMoney(499.95), '$499.95');
  assert.equal(formatMoney(0.1 + 0.2), '$0.30');
});
