import test from 'node:test';
import assert from 'node:assert/strict';
import {existsSync, readFileSync} from 'node:fs';
import {finishFor, finishPixels} from './finishes.js';
import {baseArtworkSide, cameraFor, PREVIEW_VIEWS, smoothTransition} from '../preview-views.js';
import {catalog} from '../config.js';
import {stageArt, artName} from '../art-geometry.js';
import {detailBounds, factoryName, LABEL_REGIONS, withPrintDetail} from './print-detail.js';
import {CROPS, PAIR_LEFTS, SKI_BOTTOM, SKI_TOP, SKI_WIDTH} from '../art-geometry.js';
import {MeshPhysicalMaterial, OrthographicCamera, Vector3} from 'three';

test('physical underside and individually flipped Back preserve the catalog pair order', () => {
  for (const view of ['orbit', 'back']) {
    const camera = new OrthographicCamera(-1, 1, 1, -1, .01, 20);
    camera.up.set(0, 0, 1);
    camera.position.set(0, view === 'back' ? 3 : -3, 0);
    camera.lookAt(0, 0, 0);
    camera.updateMatrixWorld();
    const visiblePair = [0, 1].map(side => ({
      x: new Vector3((.5 - side) * .18, 0, 0).project(camera).x,
      artwork: baseArtworkSide(side, view),
    })).sort((a, b) => a.x - b.x);
    assert.deepEqual(visiblePair.map(ski => ski.artwork), [0, 1], view);
  }
  // Other physical views must never inherit the presentation swap.
  for (const view of ['front', 'sidewall', 'tech', 'construction', 'bindings', 'orbit']) {
    assert.deepEqual([0, 1].map(side => baseArtworkSide(side, view)), [1, 0]);
  }
});

test('factory detail labels stay on their own ski and fit within its print UVs', () => {
  assert.equal(catalog.tops.filter(graphic => factoryName(graphic.id)).length, 12);
  assert.equal(factoryName('ANSWER-498eru'), 'Petrol');
  assert.equal(factoryName(catalog.tops.find(graphic => graphic.name === 'Blackout Reaper').id), null);
  for (let side = 0; side < 2; side++) {
    const [u, v, w, h] = detailBounds(side), region = LABEL_REGIONS[side];
    assert.ok(u > 0 && v > 0 && u + w < 1 && v + h < 1);
    // Inverse registration must put the ink back at its source pixel center,
    // including the CanvasTexture Y inversion and each ski's distinct origin.
    assert.ok(Math.abs((u + w / 2) * SKI_WIDTH + PAIR_LEFTS.top[side] - CROPS.stage.top.x - region.x - region.w / 2) < 1e-9);
    assert.ok(Math.abs((1 - v - h / 2) * (SKI_BOTTOM - SKI_TOP) + SKI_TOP - CROPS.stage.top.y - region.y - region.h / 2) < 1e-9);
  }
});

test('local print textures have independent uniforms and leave ordinary graphics alone', () => {
  const plain = new MeshPhysicalMaterial(), callback = plain.onBeforeCompile;
  assert.equal(withPrintDetail(plain, null).onBeforeCompile, callback);
  const shaders = [0, 1].map(side => {
    const texture = {side};
    const material = withPrintDetail(new MeshPhysicalMaterial(), {texture, bounds: detailBounds(side)});
    const shader = {uniforms: {}, fragmentShader: '#include <map_pars_fragment>\n#include <map_fragment>'};
    material.onBeforeCompile(shader);
    assert.equal(shader.uniforms.printDetail.value, texture);
    assert.ok(shader.fragmentShader.includes('detailInk.a * inside'));
    return shader;
  });
  assert.notEqual(shaders[0].uniforms.printDetail.value, shaders[1].uniforms.printDetail.value);
});

test('every public design has an original-source lossless preview', () => {
  const folder = new URL('../../public/art/print/', import.meta.url);
  const manifest = JSON.parse(readFileSync(new URL('manifest.json', folder)));
  assert.equal(manifest.length, catalog.tops.length + catalog.bases.length);
  for (const graphic of [...catalog.tops, ...catalog.bases]) {
    assert.ok(existsSync(new URL(`${artName(graphic)}.png`, folder)), graphic.name);
    assert.ok(stageArt(graphic).endsWith(`art/print/${artName(graphic)}.png`));
    const record = manifest.find(item => item.id === graphic.id);
    assert.equal(record.source, graphic.source);
    assert.equal(record.sourceWidth, 1000);
    assert.equal(record.sourceHeight, 1600);
    assert.match(record.sha256, /^[a-f0-9]{64}$/);
  }
});

test('real wood covers use satin wood, including artwork on wood; Woodland stays textured', () => {
  const woods = catalog.tops.filter(graphic => graphic.name.startsWith('Wood '));
  assert.equal(woods.length, 24);
  assert.ok(woods.every(graphic => finishFor(graphic) === 'wood'));
  assert.equal(finishFor(catalog.tops.find(graphic => graphic.name === 'Woodland')), 'textured');
  assert.equal(finishFor(catalog.tops.find(graphic => graphic.name === 'Petrol')), 'textured');
});

test('coarse finish has sparse smoother facets and more relief than the flat wood finish', () => {
  const coarse = finishPixels('textured'), wood = finishPixels('wood');
  const slopeEnergy = data => {
    let energy = 0;
    for (let i = 0; i < data.normal.length; i += 4) {
      const n = [...data.normal.slice(i, i + 3)].map(value => value / 255 * 2 - 1);
      assert.ok(Math.abs(Math.hypot(...n) - 1) < .015);
      energy += n[0] ** 2 + n[1] ** 2;
    }
    return energy;
  };
  assert.ok(slopeEnergy(coarse) > slopeEnergy(wood) * 5);
  let facets = 0;
  for (let i = 1; i < coarse.roughness.length; i += 4) if (coarse.roughness[i] < 100) facets++;
  assert.ok(facets > 0 && facets < coarse.size ** 2 * .025);
  assert.deepEqual(finishPixels('textured').normal, coarse.normal);
});

test('preview modes have distinct camera targets and reversals have smooth endpoints', () => {
  assert.deepEqual(PREVIEW_VIEWS.map(view => view.label), ['Front', 'Back', 'Sidewall', 'Bindings', '3D', 'Inside', 'Tech Specs']);
  assert.equal(new Set(PREVIEW_VIEWS.map(view => cameraFor(view.value))).size, 7);
  assert.equal(smoothTransition(-1), 0);
  assert.equal(smoothTransition(2), 1);
  assert.ok(smoothTransition(.001) < 1e-7);
  for (let i = 0; i < 100; i++) assert.ok(smoothTransition(i / 100) <= smoothTransition((i + 1) / 100));
});
