import {test} from 'node:test';
import assert from 'node:assert/strict';
import {existsSync} from 'node:fs';
import {formatWeight} from '@rivet/configurator/engine';
import {engine} from './index.js';
import {catalog, categories, graphicById} from './pack.js';
import outlines from './data/outlines.json' with {type: 'json'};

const build = (patch = {}) => {
  let config = engine.defaults();
  for (const step of [{category: patch.category ?? 'freeride'}, {model: patch.model ?? 'gpo'}, {length: patch.length ?? 182}]) config = engine.apply(config, step).config;
  const {category, model, length, ...rest} = patch;
  return engine.apply(config, rest).config;
};
const weightText = config => formatWeight(engine.weight(config)).text;

test('every custom model is reachable from exactly one category, with a traced outline', () => {
  const listed = categories.flatMap(c => c.models);
  assert.equal(listed.length, catalog.models.length);
  assert.deepEqual([...new Set(listed)].sort(), catalog.models.map(m => m.id).sort());
  for (const model of catalog.models) assert.ok(outlines[model.id], `${model.id} outline`);
});

test('prices follow each model’s order form', () => {
  assert.equal(engine.total(build()).amount, 1600);
  // A Heavy Hitter model charges for Enduro; an Ultra Light standard edition still charges for UL.
  assert.equal(engine.total(build({category: 'carving', model: 'snd', length: 176, core: 'enduro'})).amount, 1650);
  assert.equal(engine.total(build({category: 'touring', model: 'bc', length: 180})).amount, 1750);
  const full = build({top: catalog.veneers.find(v => v.name === 'Red Gum').id, core: 'ultra-light-carbon', width: 'wider', molding: 'custom'});
  assert.deepEqual(engine.total(full), {amount: 2050, quote: [200, 500], currency: 'USD'});
});

test('flex and core follow the standard edition until the customer chooses', () => {
  const short = build({length: 175});
  assert.equal(short.flex, '3');
  const long = engine.apply(short, {length: 182});
  assert.equal(long.config.flex, '4');
  assert.match(long.changes.find(c => c.field === 'flex').text, /standard flex for the GPO at 182 cm/);
  const chosen = engine.apply(engine.apply(short, {flex: '2'}).config, {length: 182}).config;
  assert.equal(chosen.flex, '2');
  // Moving to a Heavy Hitter model keeps the price at the base instead of charging for Enduro.
  const snd = engine.apply({...build(), category: 'carving'}, {model: 'snd'});
  assert.equal(snd.config.core, 'heavy-hitter');
  assert.equal(engine.total({...snd.config, length: 176}).amount, 1600);
});

test('signature artwork stays with its model', () => {
  const jedi = catalog.signatureGraphics.find(g => g.name === 'Jedi');
  const onJedi = build({model: 'jedi-mind-sticks', length: 182, graphic: jedi.id});
  assert.equal(onJedi.graphic, jedi.id);
  const moved = engine.apply(onJedi, {model: 'gpo'});
  assert.notEqual(moved.config.graphic, jedi.id);
  assert.match(moved.changes.find(c => c.field === 'graphic').text, /Jedi Mind Sticks’s signature graphic/);
});

test('the width option changes the outline, dimensions and length the way Praxis describes', () => {
  const standard = engine.pack.art.shape(build(), engine.context(build()));
  const wider = build({width: 'wider'});
  const shape = engine.pack.art.shape(wider, engine.context(wider));
  assert.equal(shape.width - standard.width, 10);
  assert.equal(shape.length - standard.length, 10);
  const geometry = engine.pack.specs.geometry(wider, engine.context(wider));
  assert.deepEqual([geometry.tip_mm, geometry.waist_mm, geometry.tail_mm], [150, 126, 138]);
  // Tips keep their rounded ends.
  const scaled = standard.profile.left[0][1] * (standard.width / shape.width) + 0.5 * (1 - standard.width / shape.width);
  assert.ok(Math.abs(shape.profile.left[0][1] - scaled) < 1e-9);
});

test('weight uses published figures and only the changes Praxis quantifies', () => {
  assert.equal(weightText(build()), '8.9 lb / pair');
  const veneer = catalog.veneers[0].id;
  assert.equal(weightText(build({top: veneer})), '8.4–8.7 lb / pair');
  assert.equal(weightText(build({core: 'enduro-carbon'})), '8.5 lb / pair');
  const ultralight = formatWeight(engine.weight(build({core: 'ultra-light-carbon'})));
  assert.equal(ultralight.text, '< 8.9 lb / pair');
  assert.match(ultralight.qualifier, /unpublished/);
  assert.equal(weightText(build({flex: '5'})), '> 8.9 lb / pair');
  assert.equal(engine.weight(build({category: 'all-mountain', model: 'mvp-94', length: 154})), null);
  assert.match(engine.text(build({top: veneer})), /Weight: 8\.4–8\.7 lb \/ pair/);
});

test('share links carry the build but not the rider’s personal notes', () => {
  const config = build({top: catalog.veneers[1].id, width: 'narrower', heightWeight: '6′, 190 lb', ability: catalog.ability[2].value});
  const encoded = engine.encode(config);
  assert.doesNotMatch(encoded, /190/);
  const decoded = engine.decode(encoded).config;
  assert.equal(decoded.category, 'freeride');
  assert.equal(decoded.width, 'narrower');
  assert.equal(decoded.ability, config.ability);
  assert.equal(decoded.heightWeight, '');
  // A link with only a model infers its category.
  assert.equal(engine.decode('model=protest&length=187').config.category, 'powder');
});

test('ordering needs a skier ability level', () => {
  assert.deepEqual(engine.missingForOrder(build()).map(m => m.step), [engine.steps.findIndex(step => step.id === 'rider')]);
  assert.deepEqual(engine.missingForOrder(build({ability: catalog.ability[0].value})), []);
});

test('every model, length, core, flex and adjustment normalizes to a valid, stable build', () => {
  for (const model of catalog.models) {
    const category = categories.find(c => c.models.includes(model.id)).id;
    for (const {value: length} of model.lengths)
      for (const {value: core} of model.cores)
        for (const flex of ['1', '3', '5'])
          for (const width of ['standard', 'wider']) {
            const config = engine.normalize({category, model: model.id, length, core, flex, width, top: 'nylon', graphic: 'none', molding: 'standard'});
            assert.equal(config.model, model.id);
            assert.equal(config.core, core);
            assert.deepEqual(engine.normalize(config), config);
            assert.ok(engine.total(config).amount >= 1600);
          }
  }
});

test('every graphic and veneer has a built image', () => {
  const art = new URL('../../public/art/', import.meta.url);
  for (const graphic of [...catalog.graphics, ...catalog.signatureGraphics]) assert.ok(existsSync(new URL(`graphics/${graphic.id}.webp`, art)), graphic.name);
  for (const veneer of catalog.veneers) for (const part of ['-l', '-r', '']) assert.ok(existsSync(new URL(`veneers/${veneer.id}${part}.webp`, art)), veneer.name);
  assert.equal(graphicById(catalog.graphics[0].id).name, catalog.graphics[0].name);
});
