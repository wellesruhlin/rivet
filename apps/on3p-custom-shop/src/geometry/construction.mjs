// Shared browser / Blender construction geometry. Meters, X across, Y up, +Z nose.
// ON3P publishes materials and base/edge sizes, but not its laminate schedule.
// Internal thicknesses, strip widths, insert outlines and separation are illustrative.
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
const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
const lerp = (a, b, t) => a + (b - a) * t;

// Every slab follows the same sampled outline, camber, rocker and local surface
// normal as the exterior. No second ski silhouette is maintained here.
export function generateConstruction(shell, layup = 'Stock', {wood = false} = {}) {
  const recipe = constructionRecipe(layup, wood), layers = [];
  const {sections, definition} = shell;
  const fullWidth = Math.max(definition.tipMm, definition.tailMm);
  const base = recipe.baseMm;
  const floor = base + .55;
  const ceiling = s => Math.max(floor + .55, s.thicknessMm - 1.12);
  function slab(id, label, material, bounds, bottom, top, explode, {start = 0, end = 1, artwork = false, detail = '', confidence = 'illustrative'} = {}) {
    const ss = sections.filter(s => s.u >= start && s.u <= end);
    if (ss.length < 2) throw Error(`Not enough sections for ${id}`);
    const positions = [], faces = [], uvs = [];
    for (const s of ss) {
      const i = sections.indexOf(s), a = sections[Math.max(0, i - 1)], b = sections[Math.min(sections.length - 1, i + 1)];
      const slope = -(b.heightMm - a.heightMm) / ((b.u - a.u) * definition.lengthMm || 1);
      const norm = Math.hypot(1, slope), [x0, x1] = bounds(s);
      for (const [x, y] of [[x0, bottom(s)], [x1, bottom(s)], [x1, top(s)], [x0, top(s)]]) {
        positions.push([x / 1000, (s.heightMm + y / norm) / 1000, ((.5 - s.u) * definition.lengthMm - y * slope / norm) / 1000]);
      }
    }
    const add = ids => {
      faces.push(ids);
      uvs.push(ids.map(i => {
        const s = ss[Math.floor(i / 4)], x = positions[i][0] * 1000;
        return artwork ? [.5 + (material === 'base' ? x : -x) / fullWidth, 1 - s.u] : [(x + fullWidth / 2) / 24, (1 - s.u) * definition.lengthMm / 24];
      }));
    };
    for (let i = 0; i < ss.length - 1; i++) for (let j = 0; j < 4; j++) add([i * 4 + j, (i + 1) * 4 + j, (i + 1) * 4 + (j + 1) % 4, i * 4 + (j + 1) % 4]);
    add([0, 1, 2, 3]);
    const last = (ss.length - 1) * 4; add([last + 3, last + 2, last + 1, last]);
    layers.push({id, label, material, detail, confidence, explode, positions, faces, uvs});
  }
  const width = (s, inset = 0) => Math.max(.04, s.widthMm / 2 - Math.min(inset, s.widthMm * .2));
  const full = s => [-width(s), width(s)];
  const inner = s => [-width(s, 3), width(s, 3)];
  slab('topsheet', wood ? 'Wood topsheet' : 'Textured topsheet', 'topsheet', s => [-width(s, .45), width(s, .45)], s => s.thicknessMm - .4, s => s.thicknessMm, [0, .176, 0], {artwork: true, detail: wood ? 'Selected wood cover' : 'ISOSPORT 8210 · Pi19 texture'});
  slab('upper-composite', 'Upper composite', 'composite', full, s => s.thicknessMm - .95, s => s.thicknessMm - .4, [0, .133, 0], {detail: '2800 hybrid · fiberglass / carbon'});
  const mountU = .5 - definition.mountMm / definition.lengthMm;
  slab('binding-mat', 'Binding reinforcement', 'binding', inner, ceiling, s => ceiling(s) + .17, [0, .104, 0], {start: mountU - .135, end: mountU + .135, detail: 'Full-width fiberglass · 45/45 + chopped mat'});
  // Hybrid strip layout and mounting insert proportions follow the public diagram,
  // not a dimensioned core drawing. Use discrete materials so the hybrid is visible.
  const stripCount = 13;
  for (let i = 0; i < stripCount; i++) {
    const bamboo = !recipe.hybrid || [3, 9].includes(i);
    slab(`core-${i}`, recipe.core, bamboo ? 'bamboo' : 'paulownia', s => {
      const w = width(s, 3); return [lerp(-w, w, i / stripCount), lerp(-w, w, (i + 1) / stripCount)];
    }, () => floor, ceiling, [0, .028, 0], {detail: recipe.core});
  }
  if (recipe.hybrid || recipe.metal) {
    const leaf = layup === 'Leaf Spring';
    const start = recipe.hybrid ? mountU - .15 : leaf ? .22 : .065;
    const end = recipe.hybrid ? mountU + .15 : leaf ? .78 : .935;
    slab('insert', recipe.insert, recipe.hybrid ? 'mounting' : 'scalium', s => {
      const t = (s.u - start) / (end - start), round = Math.sqrt(Math.max(.008, 1 - Math.pow(Math.abs(t - .5) * 2, 10)));
      const w = width(s, 4) * (recipe.hybrid ? .63 : leaf ? .92 : .48) * round;
      return [-w, w];
    }, s => ceiling(s) - (recipe.hybrid ? 1.1 : .45), s => ceiling(s) + .015, [0, .063, 0], {start, end, detail: recipe.hybrid ? 'CNC-milled bamboo plate underfoot' : leaf ? 'Scalium through the running region; playful ends' : 'Scalium extends into tip and tail rocker'});
  }
  for (const side of [-1, 1]) {
    const rail = (s, inset, thickness) => {
      const outer = width(s, inset), inner = Math.max(.01, outer - Math.min(thickness, s.widthMm * .15));
      return side === -1 ? [-outer, -inner] : [inner, outer];
    };
    slab(`sidewall-${side}`, 'UHMW sidewalls', 'sidewall', s => rail(s, .1, 2.9), () => base + .2, s => s.thicknessMm - .45, [side * .016, .028, 0], {detail: 'Full length · full height'});
    for (let band = 0; band < 3; band++) slab(`vds-${side}-${band}`, 'VDS bonding rubber', 'rubber', s => rail(s, band === 2 ? 1.1 : 2.6, band === 2 ? 3.4 : 2), s => band === 0 ? base + .02 : band === 1 ? floor - .16 : ceiling(s) + .02, s => band === 0 ? base + .12 : band === 1 ? floor - .06 : ceiling(s) + .12, [side * .014, [-.041, -.003, .086][band], 0], {detail: 'Three bonding strips along each side; placement estimated'});
    slab(`edge-${side}`, 'Steel edges', 'steel', s => rail(s, 0, recipe.edgeWidthMm), () => 0, () => recipe.edgeHeightMm, [side * .013, -.066, 0], {start: .075, detail: `${recipe.edgeWidthMm} × ${recipe.edgeHeightMm} mm · HRC 48 · wrap termination estimated`, confidence: 'published cross-section'});
  }
  slab('lower-composite', 'Lower composite', 'composite', full, () => base, () => floor, [0, -.024, 0], {detail: '2800 hybrid · fiberglass / carbon'});
  slab('base', 'Sintered base', 'base', s => [-width(s, recipe.edgeWidthMm), width(s, recipe.edgeWidthMm)], () => 0, () => base, [0, -.066, 0], {artwork: true, detail: `Durasurf 4001 · ${base} mm`, confidence: 'published thickness'});
  return {schemaVersion: 1, units: 'meters', axes: shell.axes, definition, recipe, layers, source: CONSTRUCTION_SOURCE, note: CONSTRUCTION_NOTE};
}
