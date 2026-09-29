// ON3P construction layers for the browser configurator and the Blender lab.
// Meters, X across, Y up, +Z nose. ON3P publishes materials and base/edge sizes, but
// not its laminate schedule: internal thicknesses, strip widths, insert outlines and
// separation are illustrative. The stack is data for the shared layer builder.
import {buildLayers, halfWidth, mountU as mountOf} from '@rivet/ski-geometry/construction';

export const CONSTRUCTION_SOURCE = 'https://www.on3pskis.com/products/custom-skis';
export const CONSTRUCTION_NOTE = 'Materials and base/edge sizes follow ON3P. Internal thicknesses, placement and insert outlines are illustrative; layer gaps are exaggerated.';
export const LAYUP_IDS = ['Stock', 'LITE', '50/50', 'Tour', 'Leaf Spring', 'Torsion Bar'];

export function constructionRecipe(layup = 'Stock', wood = false) {
  if (!LAYUP_IDS.includes(layup)) throw Error(`Unknown layup: ${layup}`);
  const light = layup === 'LITE' || layup === 'Tour';
  const hybrid = layup === '50/50' || layup === 'Tour';
  const metal = layup === 'Leaf Spring' || layup === 'Torsion Bar';
  return {layup, light, hybrid, metal, wood, baseMm: light ? 1.4 : 1.8, edgeWidthMm: light ? 2.2 : 2.5, edgeHeightMm: light ? 2 : 2.5,
    core: hybrid ? 'Bamboo / paulownia' : 'Vertically laminated bamboo',
    insert: metal ? `${layup} Scalium insert` : hybrid ? 'Bamboo mounting plate' : null,
    source: CONSTRUCTION_SOURCE, note: CONSTRUCTION_NOTE};
}
const lerp = (a, b, t) => a + (b - a) * t;

// Legend groups in stack order, top to bottom. Every layer maps to one of these.
export const LAYER_KEYS = ['topsheet', 'composite', 'binding', 'insert', 'core', 'sidewall', 'rubber', 'base', 'edges'];
export function layerKey(id) {
  if (id === 'topsheet') return 'topsheet';
  if (id.endsWith('composite')) return 'composite';
  if (id === 'binding-mat') return 'binding';
  if (id === 'insert') return 'insert';
  if (id.startsWith('core-')) return 'core';
  if (id.startsWith('sidewall-')) return 'sidewall';
  if (id.startsWith('vds-')) return 'rubber';
  if (id.startsWith('edge-')) return 'edges';
  return 'base';
}

// The ordered layer specs for one layup, top to bottom. Each follows the exterior's
// sampled outline, camber, rocker and local surface normal.
export function on3pStack(definition, recipe) {
  const {layup, wood} = recipe;
  const base = recipe.baseMm;
  const floor = base + .55;
  const ceiling = s => Math.max(floor + .55, s.thicknessMm - 1.12);
  const width = halfWidth;
  const full = s => [-width(s), width(s)];
  const inner = s => [-width(s, 3), width(s, 3)];
  const layer = (id, label, material, bounds, bottom, top, explode, {start, end, artwork = false, detail = '', confidence = 'illustrative'} = {}) =>
    ({id, key: layerKey(id), label, material, bounds, bottom, top, explode, start, end, detail, confidence, tiled: true, ...(artwork ? {artwork: material === 'base' ? 'base' : 'top'} : {})});
  const stack = [];
  stack.push(layer('topsheet', wood ? 'Wood topsheet' : 'Textured topsheet', 'topsheet', s => [-width(s, .45), width(s, .45)], s => s.thicknessMm - .4, s => s.thicknessMm, [0, .176, 0], {artwork: true, detail: wood ? 'Selected wood cover' : 'ISOSPORT 8210 · Pi19 texture'}));
  stack.push(layer('upper-composite', 'Upper composite', 'composite', full, s => s.thicknessMm - .95, s => s.thicknessMm - .4, [0, .133, 0], {detail: '2800 hybrid · fiberglass / carbon'}));
  const mountU = mountOf(definition);
  stack.push(layer('binding-mat', 'Binding reinforcement', 'binding', inner, ceiling, s => ceiling(s) + .17, [0, .104, 0], {start: mountU - .135, end: mountU + .135, detail: 'Full-width fiberglass · 45/45 + chopped mat'}));
  // Hybrid strip layout and mounting insert proportions follow the public diagram,
  // not a dimensioned core drawing. Discrete materials keep the hybrid visible.
  const stripCount = 13;
  for (let i = 0; i < stripCount; i++) {
    const bamboo = !recipe.hybrid || [3, 9].includes(i);
    stack.push(layer(`core-${i}`, recipe.core, bamboo ? 'bamboo' : 'paulownia', s => {
      const w = width(s, 3); return [lerp(-w, w, i / stripCount), lerp(-w, w, (i + 1) / stripCount)];
    }, () => floor, ceiling, [0, .028, 0], {detail: recipe.core}));
  }
  if (recipe.hybrid || recipe.metal) {
    const leaf = layup === 'Leaf Spring';
    const start = recipe.hybrid ? mountU - .15 : leaf ? .22 : .065;
    const end = recipe.hybrid ? mountU + .15 : leaf ? .78 : .935;
    stack.push(layer('insert', recipe.insert, recipe.hybrid ? 'mounting' : 'scalium', s => {
      const t = (s.u - start) / (end - start), round = Math.sqrt(Math.max(.008, 1 - Math.pow(Math.abs(t - .5) * 2, 10)));
      const w = width(s, 4) * (recipe.hybrid ? .63 : leaf ? .92 : .48) * round;
      return [-w, w];
    }, s => ceiling(s) - (recipe.hybrid ? 1.1 : .45), s => ceiling(s) + .015, [0, .063, 0], {start, end, detail: recipe.hybrid ? 'CNC-milled bamboo plate underfoot' : leaf ? 'Scalium through the running region; playful ends' : 'Scalium extends into tip and tail rocker'}));
  }
  for (const side of [-1, 1]) {
    const rail = (s, inset, thickness) => {
      const outer = width(s, inset), inner = Math.max(.01, outer - Math.min(thickness, s.widthMm * .15));
      return side === -1 ? [-outer, -inner] : [inner, outer];
    };
    stack.push(layer(`sidewall-${side}`, 'UHMW sidewalls', 'sidewall', s => rail(s, .1, 2.9), () => base + .2, s => s.thicknessMm - .45, [side * .016, .028, 0], {detail: 'Full length · full height'}));
    for (let band = 0; band < 3; band++) stack.push(layer(`vds-${side}-${band}`, 'VDS bonding rubber', 'rubber', s => rail(s, band === 2 ? 1.1 : 2.6, band === 2 ? 3.4 : 2), s => band === 0 ? base + .02 : band === 1 ? floor - .16 : ceiling(s) + .02, s => band === 0 ? base + .12 : band === 1 ? floor - .06 : ceiling(s) + .12, [side * .014, [-.041, -.003, .086][band], 0], {detail: 'Three bonding strips along each side; placement estimated'}));
    stack.push(layer(`edge-${side}`, 'Steel edges', 'steel', s => rail(s, 0, recipe.edgeWidthMm), () => 0, () => recipe.edgeHeightMm, [side * .013, -.066, 0], {start: .075, detail: `${recipe.edgeWidthMm} × ${recipe.edgeHeightMm} mm · HRC 48 · wrap termination estimated`, confidence: 'published cross-section'}));
  }
  stack.push(layer('lower-composite', 'Lower composite', 'composite', full, () => base, () => floor, [0, -.024, 0], {detail: '2800 hybrid · fiberglass / carbon'}));
  stack.push(layer('base', 'Sintered base', 'base', s => [-width(s, recipe.edgeWidthMm), width(s, recipe.edgeWidthMm)], () => 0, () => base, [0, -.066, 0], {artwork: true, detail: `Durasurf 4001 · ${base} mm`, confidence: 'published thickness'}));
  return stack;
}

// The canonical construction export consumed by the lab and Blender.
export function generateConstruction(shell, layup = 'Stock', {wood = false} = {}) {
  const recipe = constructionRecipe(layup, wood);
  const {definition} = shell;
  const layers = buildLayers(shell, on3pStack(definition, recipe)).map(({id, label, material, detail, confidence, explode, positions, faces, uvs}) =>
    ({id, label, material, detail, confidence, explode, positions, faces, uvs}));
  return {schemaVersion: 1, units: 'meters', axes: shell.axes, definition, recipe, layers, source: CONSTRUCTION_SOURCE, note: CONSTRUCTION_NOTE};
}
