import test from 'node:test';
import assert from 'node:assert/strict';
import {existsSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {generateSkiMesh, meshReport} from '@rivet/ski-geometry';
import {buildLayers, layerReport} from '@rivet/ski-geometry';
import {engine} from '../src/index.js';
import {artName, BASE_COLORS, TEMPLATE} from '../src/art.js';
import {boardShape, planform, profile} from '../src/geometry.js';
import {proteusLayers, proteusStack} from '../src/construction.js';
import {BASE_PRICE, catalog, COLLAB_PRICE, CUSTOM_FEE, readyBoards} from '../src/pack.js';
import {CAMBER_PRESETS, contactOffset, describeCamber, SIZES, sizeById, STIFFNESS, TRAVEL_MM} from '../src/specs.js';

const publicDir = fileURLToPath(new URL('../public/', import.meta.url));
const sized = (patch = {}) => engine.apply(engine.defaults(), {length: '157', ...patch}).config;

test('catalog: every design and colorway has its artwork', () => {
  assert.equal(catalog.designs.length, 53);
  assert.equal(catalog.designs.reduce((n, d) => n + d.colorways.length, 0), 217);
  for (const design of catalog.designs) for (const colorway of design.colorways) {
    const name = artName(design.id, colorway.name);
    for (const dir of ['top', 'base', 'thumb']) assert.ok(existsSync(`${publicDir}art/${dir}/${name}.webp`), `${dir}/${name}`);
  }
  for (const file of ['template/symbol.png', 'template/wordmark.png', 'template/hardware.png']) assert.ok(existsSync(`${publicDir}art/${file}`), file);
  assert.ok(existsSync(`${publicDir}assets/mark.png`));
});

test('prices match every board page: design, collection and build', () => {
  assert.equal(BASE_PRICE, 749);
  assert.equal(COLLAB_PRICE, 25);
  for (const design of catalog.designs) for (const build of STIFFNESS) {
    const config = sized({design: design.id, stiffness: build.id});
    assert.equal(engine.total(config).amount, design.prices[build.id], `${design.id} ${build.id}`);
  }
});

test('a size is required and never chosen for you', () => {
  const defaults = engine.defaults();
  assert.equal(defaults.length, '');
  assert.equal(engine.ready(defaults), false);
  assert.equal(engine.ready(sized()), true);
  assert.equal(engine.ready(engine.apply(defaults, {length: '158'}).config), false);
  assert.equal(SIZES.filter(s => s.wide).length, 5);
  assert.equal(sizeById('163W').waist, 26.1);
});

test('defaults: Mt. Fuji in Tea House, Standard build, full camber, wrench included', () => {
  const config = sized();
  assert.equal(config.design, 'mt-fuji');
  assert.equal(config.colorway, 'Tea House');
  assert.equal(config.stiffness, 'standard');
  assert.deepEqual([config.nose, config.tail], [0, 0]);
  assert.equal(config.wrench, true);
  assert.equal(engine.total(config).amount, 779);
});

test('changing the design resets the colorway without an adjustment note', () => {
  const before = sized({design: 'b-line', colorway: 'Neon'});
  assert.equal(before.colorway, 'Neon');
  const {config, changes} = engine.apply(before, {design: 'hex'});
  assert.equal(config.colorway, catalog.designs.find(d => d.id === 'hex').colorways[0].name);
  assert.deepEqual(changes, []);
});

test('custom graphics: processing fee, base colors listed, artwork asked for before ordering', () => {
  const config = sized({design: 'custom', baseNose: 'royal', baseBlock: 'yellow', baseBody: 'indigo'});
  assert.equal(engine.total(config).amount, BASE_PRICE + CUSTOM_FEE + 30);
  const bom = engine.bom(config);
  assert.equal(bom.find(l => l.key === 'baseNose').value, 'Royal · Yellow · Indigo');
  assert.equal(engine.missingForOrder(config).length, 1);
  assert.equal(engine.missingForOrder({...config, artFile: 'art.png'}).length, 0);
  assert.ok(!engine.bom(sized()).some(l => l.key === 'baseNose'), 'base colors only for custom boards');
  assert.equal(BASE_COLORS.length, 18);
});

test('accessories and sidewall text', () => {
  const config = sized({snowStopper: true, wax: true, sidewallText: 'Hi there!!'});
  assert.equal(engine.total(config).amount, 779 + 25 + 20);
  assert.equal(config.sidewallText, 'Hithere');
  assert.equal(sized({sidewallText: 'ABCDEFGHIJKLMNOP'}).sidewallText, 'ABCDEFGHIJKL');
  assert.equal(engine.bom(sized()).find(l => l.key === 'wrench').value, 'Included');
  assert.ok(!engine.bom(sized()).some(l => l.key === 'snowStopper'), 'unchosen accessories stay off the sheet');
});

test('camber is part of the build sheet but never priced', () => {
  const config = sized({nose: 60, tail: 25});
  const line = engine.bom(config).find(l => l.key === 'nose');
  assert.equal(line.value, 'Mid S Curve');
  assert.equal(line.info, true);
  assert.equal(engine.total(config).amount, 779);
  assert.equal(describeCamber(70, 70), 'Custom · 6.1 mm rocker');
  assert.equal(sized({nose: 140}).nose, 0, 'out-of-range settings fall back to full camber');
});

test('build links round-trip every choice; personal details stay out', () => {
  const config = sized({design: 'sharknado', colorway: 'Yang', length: '159W', stiffness: 'stiff', nose: 60, tail: 25, snowStopper: true, sidewallText: 'Shred4Life', riderWeight: 180});
  const encoded = engine.encode(config);
  assert.ok(!encoded.includes('riderWeight'));
  const decoded = engine.decode(encoded);
  assert.deepEqual(decoded.changes, []);
  assert.deepEqual({...decoded.config, riderWeight: null}, {...config, riderWeight: null});
  assert.equal(engine.decode('length=157&sidewallText=a%20b%24c').config.sidewallText, 'abc');
});

test('ready boards match exact builds', () => {
  assert.equal(readyBoards.length, 5);
  const ctx = engine.context(sized({length: '148', design: 'mt-fuji', colorway: 'Tea House', stiffness: 'flex'}));
  assert.equal(ctx.readyBoard?.id, '148-flex-mt-fuji');
  assert.equal(ctx.readyBoard.price, 699);
  assert.equal(engine.context(sized({length: '151', stiffness: 'flex'})).readyBoard, null);
});

test('planform follows the published waist, sidecut and effective edge', () => {
  for (const size of SIZES) {
    const plan = planform(size);
    assert.ok(Math.abs(plan.widthAt(.5) - size.waist * 10) < .01, `${size.id} waist`);
    const contact = plan.widthAt(plan.uc);
    const radius = ((plan.E / 2) ** 2 + ((contact - plan.W) / 2) ** 2) / (contact - plan.W);
    assert.ok(Math.abs(radius / 1000 - size.radius) < .01, `${size.id} radius`);
    assert.ok(Math.abs(plan.widthAt(.3) - plan.widthAt(.7)) < .01, `${size.id} twin`);
  }
});

test('camber settings: the travel, flat and how the board rests on snow', () => {
  const size = sizeById('157');
  const half = TRAVEL_MM / 2;
  assert.equal(contactOffset(0), -half);
  assert.equal(contactOffset(100), half);
  const full = profile(size, 0, 0), flat = profile(size, 50, 50), rocker = profile(size, 100, 100);
  assert.ok(Math.abs(full.centerMm - half) < 1, `full camber center ${full.centerMm}`);
  assert.ok(full.noseContactMm < .5 && full.tailContactMm < .5);
  assert.ok(Math.abs(flat.centerMm) < .01 && Math.abs(flat.noseContactMm) < .01);
  assert.ok(rocker.centerMm < .01 && Math.abs(rocker.noseContactMm - half) < .5);
  const s = profile(size, 100, 0);
  assert.ok(s.noseContactMm > s.tailContactMm + 4, 'full S curve lifts the nose');
  assert.ok(s.tiltDeg > 0 && s.tiltDeg < 3);
  for (const preset of CAMBER_PRESETS) {
    const p = profile(size, preset.nose, preset.tail);
    const heights = Array.from({length: 401}, (_, i) => p.heightAt(i / 400));
    assert.ok(Math.min(...heights) >= 0 && Math.min(...heights) < .05, `${preset.id} touches the snow`);
  }
});

test('every size and camber setting meshes closed, with one topology per size', () => {
  for (const size of SIZES) {
    const counts = new Set();
    for (const preset of CAMBER_PRESETS) {
      const mesh = generateSkiMesh(boardShape(size, preset.nose, preset.tail));
      const report = meshReport(mesh);
      assert.ok(report.finite && report.open === 0, `${size.id} ${preset.id}`);
      counts.add(`${mesh.positions.length}/${mesh.faces.length}`);
    }
    assert.equal(counts.size, 1, `${size.id} morphs between settings`);
  }
});

test('the Inside layup is closed and its legend covers every layer', () => {
  const size = sizeById('157');
  const mesh = generateSkiMesh(boardShape(size, 0, 0));
  for (const build of STIFFNESS) for (const stopper of [false, true]) {
    const stack = proteusStack(mesh, {size, build, stopper});
    const layers = buildLayers(mesh, stack);
    assert.equal(layers.length, stack.length, 'every slab spans at least two sections');
    for (const layer of layers) {
      const report = layerReport(layer);
      assert.ok(report.finite && report.open === 0, layer.id);
    }
    const legend = proteusLayers({build, stopper, custom: false});
    assert.deepEqual(new Set(stack.map(s => s.key)), new Set(legend.map(l => l.key)));
    assert.ok(legend.length <= 10, 'fits two rows of the legend');
  }
});

test('the base template recovered from the art is sane', () => {
  const [a, b] = TEMPLATE.bands;
  assert.ok(a > .1 && a < b && b < .4);
  for (const box of [TEMPLATE.symbol, TEMPLATE.wordmark]) {
    assert.ok(box.x >= 0 && box.y >= 0 && box.x + box.width <= 1.001 && box.y + box.height <= 1.001);
  }
  assert.ok(TEMPLATE.symbol.y >= a && TEMPLATE.symbol.y + TEMPLATE.symbol.height <= b + .01, 'symbol sits in the logo block');
  assert.ok(TEMPLATE.wordmark.y >= b - .01, 'wordmark sits in the body');
});
