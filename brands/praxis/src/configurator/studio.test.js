import {test} from 'node:test';
import assert from 'node:assert/strict';
import {existsSync} from 'node:fs';
import {createSessionReducer, formatMoney, initialSession} from '@arc/configurator/engine';
import {generateSkiMesh, meshReport, mountPoint} from '@arc/ski-geometry';
import {buildLayers, layerReport} from '@arc/ski-geometry';
import {engine} from './index.js';
import {catalog, cores, waistFor} from './pack.js';
import {praxisShape, profileFor} from './geometry.js';
import {praxisLayers, praxisStack} from './construction.js';
import {bindingCatalog, bindingFit, bindingFor, bindingVariants} from './bindings.js';

const build = (patch = {}) => {
  let config = engine.defaults();
  for (const step of [{category: patch.category ?? 'freeride'}, {model: patch.model ?? 'gpo'}, {length: patch.length ?? 182}]) config = engine.apply(config, step).config;
  const {category, model, length, ...rest} = patch;
  return engine.apply(config, rest).config;
};
const variant = (productId, color, brake) => bindingCatalog.products.find(p => p.id === productId).variants.find(v => v.color === color && v.brake === brake);
const pivot = brake => variant('pivot-15', 'Black Metal', brake).id;

test('every model, length and width offset makes a closed 3D ski with the published widths', () => {
  let meshes = 0;
  for (const model of catalog.models) for (const {value: length} of model.lengths) for (const offsetMm of [0, 10, -10]) {
    const shape = praxisShape(model, length, {offsetMm});
    assert.ok(shape, `${model.id} ${length}`);
    const report = meshReport(generateSkiMesh(shape));
    assert.ok(report.finite && report.open === 0, `${model.id} ${length} ${offsetMm}: ${JSON.stringify(report)}`);
    for (const [mark, width] of [['tip', shape.tipMm], ['waist', shape.waistMm], ['tail', shape.tailMm]]) {
      assert.ok(Math.abs(shape.widthAt(shape.marks[mark]) - width) < .01, `${model.id} ${mark}`);
    }
    meshes++;
  }
  assert.equal(meshes, catalog.models.reduce((n, m) => n + m.lengths.length * 3, 0));
  const gpo = praxisShape(catalog.models.find(m => m.id === 'gpo'), 182);
  assert.deepEqual([gpo.tipMm, gpo.waistMm, gpo.tailMm, gpo.lengthMm, gpo.mountMm], [140, 116, 128, 1820, -70]);
  const wider = praxisShape(catalog.models.find(m => m.id === 'gpo'), 182, {offsetMm: 10});
  assert.deepEqual([wider.tipMm, wider.waistMm, wider.tailMm, wider.lengthMm], [150, 126, 138, 1830]);
});

test('profiles come from the spec chart, and uncharted models say they are estimates', () => {
  const gpo = profileFor('gpo', 182);
  assert.equal(gpo.kind, 'chart');
  assert.ok(Math.abs(gpo.tipRocker - 55 / 182) < 1e-9 && gpo.tipHeightMm === 75 && gpo.camberMm === 3);
  const shape = praxisShape(catalog.models.find(m => m.id === 'gpo'), 182);
  assert.ok(Math.abs(shape.heightAt(0) - 75) < .01 && Math.abs(shape.heightAt(1) - 30) < .01, 'tip and tail rise to the chart heights');
  assert.ok(shape.heightAt(.5) > 0 && shape.heightAt(.5) <= 3.01, 'camber underfoot');
  assert.equal(profileFor('powderboard', 190).molding, 'Continuous rocker');
  assert.equal(profileFor('bps', 193).molding, 'Compound camber');
  assert.equal(profileFor('mvp-94', 154).exact, false, 'an uncharted length borrows the nearest charted row');
  const mount = mountPoint(generateSkiMesh(shape));
  assert.ok(Math.abs(mount.z + .07) < 1e-9, 'the binding sits on the charted boot center');
});

test('every core and top builds a closed layup whose legend covers every layer', () => {
  const shape = praxisShape(catalog.models.find(m => m.id === 'gpo'), 182);
  const mesh = generateSkiMesh(shape);
  for (const [id, core] of Object.entries(cores)) for (const veneer of [false, true]) {
    const layers = buildLayers(mesh, praxisStack(mesh, {family: core.family, carbon: core.carbon, veneer}));
    for (const layer of layers) {
      const report = layerReport(layer);
      assert.ok(report.finite && report.open === 0, `${id} ${layer.id}`);
    }
    const legend = praxisLayers({core: core.family, coreLabel: id, woods: core.woods, carbon: core.carbon, veneer, veneerName: 'Oak'});
    const keys = new Set(legend.map(entry => entry.key));
    for (const layer of layers) assert.ok(keys.has(layer.key), `${layer.key} in legend`);
    assert.equal(layers.some(layer => layer.material === 'carbon'), core.carbon, `${id} carbon`);
    const woods = new Set(layers.filter(layer => layer.key === 'core').map(layer => layer.material));
    assert.ok(woods.has('maple') && woods.has('ash'), `${id} keeps the maple binding block and ash frame`);
    assert.equal(woods.has('paulownia'), core.family === 'ultra-light');
    assert.equal(woods.has('aspen'), core.family === 'enduro');
  }
});

test('the binding catalog is the Pivot family, and the brake screen follows the waist', () => {
  assert.deepEqual(bindingCatalog.products.map(p => p.id), ['pivot-18', 'pivot-15', 'pivot-13', 'pivot-11', 'freetour-15', 'freetour-18']);
  for (const v of bindingVariants) assert.ok(existsSync(new URL(`../../public/${v.image}`, import.meta.url)), v.image);
  const gpo = build();
  assert.deepEqual(waistFor(gpo, engine.context(gpo)), {mm: 116, published: true});
  assert.equal(bindingFit(bindingFor(pivot(115)), {mm: 116, published: true}).ok, false);
  assert.equal(bindingFit(bindingFor(pivot(130)), {mm: 116, published: true}).ok, true);
  // An unpublished waist is estimated from the drawing and says so.
  const bps = build({category: 'powder', model: 'bps', length: 193});
  const waist = waistFor(bps, engine.context(bps));
  assert.equal(waist.published, false);
  assert.match(bindingFit(bindingFor(pivot(130)), waist).text, /estimated from Praxis’s drawing/);
});

test('an orderable pair joins the build and the total, with cents', () => {
  const config = build({binding: pivot(130)});
  assert.equal(config.binding, pivot(130));
  assert.equal(engine.total(config).amount, 2099.95);
  assert.equal(formatMoney(2099.95), '$2,099.95');
  assert.equal(formatMoney(1600), '$1,600');
  const line = engine.bom(config).find(l => l.key === 'binding');
  assert.equal(line.value, 'LOOK Pivot 2.0 15 GW · Black Metal · 130 mm');
  assert.deepEqual(engine.decode(engine.encode(config)).config.binding, pivot(130));
  assert.match(engine.text(config), /Bindings: LOOK Pivot 2\.0 15 GW · Black Metal · 130 mm — \$499\.95/);
});

test('a pair that does not fit stays out of the build and is explained', () => {
  assert.equal(build({binding: pivot(115)}).binding, '');
  // A link carrying a pair that no longer fits explains why; the configurator keeps it as a visual test.
  const {config, changes} = engine.decode(`category=freeride&model=gpo&length=182&binding=${pivot(115)}`);
  assert.equal(config.binding, '');
  assert.ok(changes.some(c => c.field === 'binding' && /narrower/.test(c.text) && /visual test/.test(c.text)));
  // Widening the ski by 10 mm moves the 116 mm GPO to 126 mm: the 130 mm brake still fits.
  assert.equal(build({width: 'wider', binding: pivot(130)}).binding, pivot(130));
});

test('binding notices retire with the next binding choice; notes ride along with a patch', () => {
  const reducer = createSessionReducer(engine);
  let state = initialSession(engine, {config: build({binding: pivot(130)})});
  state = reducer(state, {type: 'patch', patch: {model: 'rx', binding: pivot(130)}, notes: [{field: 'binding', text: 'Bindings are no longer in your total.'}]});
  assert.ok(state.adjustments.some(c => c.field === 'binding'));
  state = reducer(state, {type: 'patch', patch: {binding: ''}});
  assert.ok(!state.adjustments.some(c => c.field === 'binding'));
});

test('each step opens the 3D view that shows what it changes', () => {
  const step = id => engine.steps.findIndex(s => s.id === id);
  const view = (field, id) => engine.pack.viewForField(field, step(id));
  assert.deepEqual([view('', 'shape'), view('', 'look'), view('', 'build'), view('', 'bindings'), view('', 'review')], ['Topsheet', 'Topsheet', 'Construction', 'Bindings', 'Topsheet']);
  assert.equal(view('molding', 'build'), 'Technical');
  assert.equal(view('width', 'build'), 'Topsheet');
  assert.ok(existsSync(new URL('../../public/models/look-pivot-15.glb', import.meta.url)), 'binding model shipped with the app');
});
