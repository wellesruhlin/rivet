// Exploded construction layers. Every slab follows the exterior mesh's sampled outline,
// camber/rocker and surface normal, so no second ski silhouette is maintained. A brand
// supplies the stack as data:
//
// {id, key, material, bounds(section) -> [x0, x1] mm, bottom(section) -> mm, top(section) -> mm,
//  explode: [x, y, z] meters at full separation, start/end: u range, artwork: 'top' | 'base',
//  tiled: true maps a non-artwork layer's UVs in 24 mm tiles (material textures) instead of
//  across the artwork, label/detail/confidence: descriptive text carried onto the layer}
//
// Sections carry {u, widthMm, heightMm, thicknessMm}. Internal thicknesses and placement
// are illustrative unless the pack says otherwise.

export const halfWidth = (s, inset = 0) => Math.max(.04, s.widthMm / 2 - Math.min(inset, s.widthMm * .2));
export const across = (inset = 0) => s => [-halfWidth(s, inset), halfWidth(s, inset)];
// One of `count` lengthwise strips between the rails.
export const strip = (i, count, inset = 3) => s => {
  const w = halfWidth(s, inset);
  return [-w + 2 * w * i / count, -w + 2 * w * (i + 1) / count];
};
// A band along one side (-1 left, 1 right): `inset` from the outside, `thickness` wide.
export const rail = (side, inset, thickness) => s => {
  const outer = halfWidth(s, inset), inner = Math.max(.01, outer - Math.min(thickness, s.widthMm * .15));
  return side < 0 ? [-outer, -inner] : [inner, outer];
};
// Rounded ends for an insert that spans [start, end] along the ski.
export const rounded = (start, end, fraction, inset = 4) => s => {
  const t = (s.u - start) / (end - start), round = Math.sqrt(Math.max(.008, 1 - Math.pow(Math.abs(t - .5) * 2, 10)));
  const w = halfWidth(s, inset) * fraction * round;
  return [-w, w];
};
export const mountU = definition => .5 - definition.mountMm / definition.lengthMm;

function slab(sections, definition, fullWidth, spec) {
  const {start = 0, end = 1} = spec;
  const ss = sections.filter(s => s.u >= start && s.u <= end);
  if (ss.length < 2) return null;
  const positions = [], faces = [], uvs = [];
  for (const s of ss) {
    const i = sections.indexOf(s), a = sections[Math.max(0, i - 1)], b = sections[Math.min(sections.length - 1, i + 1)];
    const slope = -(b.heightMm - a.heightMm) / ((b.u - a.u) * definition.lengthMm || 1);
    const norm = Math.hypot(1, slope), [x0, x1] = spec.bounds(s), bottom = spec.bottom(s), top = Math.max(spec.top(s), bottom + .05);
    for (const [x, y] of [[x0, bottom], [x1, bottom], [x1, top], [x0, top]]) {
      positions.push([x / 1000, (s.heightMm + y / norm) / 1000, ((.5 - s.u) * definition.lengthMm - y * slope / norm) / 1000]);
    }
  }
  const add = ids => {
    faces.push(ids);
    uvs.push(ids.map(i => {
      const s = ss[Math.floor(i / 4)], x = positions[i][0] * 1000;
      if (spec.tiled && !spec.artwork) return [(x + fullWidth / 2) / 24, (1 - s.u) * definition.lengthMm / 24];
      return [.5 + (spec.artwork === 'base' ? x : -x) / fullWidth, 1 - s.u];
    }));
  };
  for (let i = 0; i < ss.length - 1; i++) for (let j = 0; j < 4; j++) add([i * 4 + j, (i + 1) * 4 + j, (i + 1) * 4 + (j + 1) % 4, i * 4 + (j + 1) % 4]);
  add([0, 1, 2, 3]);
  const last = (ss.length - 1) * 4;
  add([last + 3, last + 2, last + 1, last]);
  const text = Object.fromEntries(['label', 'detail', 'confidence'].filter(k => spec[k] !== undefined).map(k => [k, spec[k]]));
  return {id: spec.id, key: spec.key ?? spec.id, material: spec.material, artwork: spec.artwork ?? null, explode: spec.explode ?? [0, 0, 0], ...text, positions, faces, uvs};
}

export function buildLayers(shell, stack) {
  const {sections, definition} = shell;
  const fullWidth = definition.fullWidthMm ?? Math.max(definition.tipMm, definition.tailMm);
  return stack.map(spec => slab(sections, definition, fullWidth, spec)).filter(Boolean);
}

// Closed-solid check used by the tests.
export function layerReport(layer) {
  const edges = new Map();
  for (const face of layer.faces) for (let i = 0; i < face.length; i++) {
    const a = face[i], b = face[(i + 1) % face.length];
    const key = a < b ? `${a}-${b}` : `${b}-${a}`;
    edges.set(key, (edges.get(key) ?? 0) + 1);
  }
  return {finite: layer.positions.every(p => p.every(Number.isFinite)), open: [...edges.values()].filter(count => count !== 2).length};
}
