// The one ski mesh kernel for Arc, Fall Line exports and the Blender lab.
// Meters, X across, Y up, +Z toward the tip. A brand supplies the outline, profile and
// thickness as functions of u (0 at the tip, 1 at the tail); traced.js builds those
// functions from traced image data.
//
// shape: {lengthMm, tipMm, waistMm, tailMm, mountMm,
//         widthAt(u) full width in mm, heightAt(u) base height above the running plane in mm,
//         thicknessAt(u) total thickness in mm,
//         steelWidthMm, steelHeightMm, baseMm, steelStartU (0 = edges wrap the tip),
//         stations: extra u values that must be sampled exactly (widest points, contact points),
//         sidewallText: optional {span}: the right sidewall (the one a Sidewall view faces) gets
//           material 4 with its own UVs: u along the ski across `span` of the length, centered,
//           and v up the sidewall, for printed sidewall text,
//         edgeClamp: false keeps the published steel and base heights even where the ski is
//           thinner than they allow (the traced ON3P lab geometry); by default they are capped
//           at 45% / 90% of the local thickness,
//         uvAt(u, xFraction, band, xMm): optional artwork UVs, called for every side band
//           (band 1 is the base, 0 everything else) with xFraction 0–1 across the local width
//           and xMm from the centre line; the default spans the widest width with v = 1 − u,
//         definition, surfaces, axes: optional replacements for those returned fields}
export const SURFACES = ['topsheet', 'base', 'sidewall', 'steel', 'sidewall-print'];
const clamp = (x, a, b) => Math.max(a, Math.min(b, x));

export function generateSkiMesh(shape, {segments = 360} = {}) {
  const {lengthMm, widthAt, heightAt, thicknessAt} = shape;
  const us = [...new Set([0, 1, ...(shape.stations ?? []), shape.steelStartU ?? 0, ...Array.from({length: segments + 1}, (_, i) => (1 - Math.cos(Math.PI * i / segments)) / 2)])]
    .filter(u => u >= 0 && u <= 1).sort((a, b) => a - b);
  const positions = [], faces = [], materials = [], uvs = [], sections = [];
  const N = 12;
  const fullWidth = Math.max(shape.tipMm, shape.tailMm, ...us.map(u => widthAt(u)));
  for (const u of us) {
    const w = Math.max(.15, widthAt(u) / 2), h = heightAt(u), T = thicknessAt(u);
    const e = Math.min(shape.steelWidthMm, w * .24), sh = Math.min(.65, w * .15);
    const clampEdges = shape.edgeClamp !== false;
    const eh = clampEdges ? Math.min(shape.steelHeightMm, T * .45) : shape.steelHeightMm;
    const bh = clampEdges ? Math.min(shape.baseMm, eh * .9) : shape.baseMm, shoulder = Math.min(.45, T * .1);
    const du = .0002, ua = clamp(u - du, 0, 1), ub = clamp(u + du, 0, 1);
    const slope = -(heightAt(ub) - heightAt(ua)) / ((ub - ua) * lengthMm);
    const norm = Math.sqrt(1 + slope * slope);
    const ring = [[-w, 0], [-w + e, 0], [w - e, 0], [w, 0], [w, bh], [w, eh], [w - .1 * sh, T - shoulder],
      [w - sh, T], [-w + sh, T], [-w + .1 * sh, T - shoulder], [-w, eh], [-w, bh]];
    const center = shape.centerAt?.(u) ?? 0;
    for (const [x, depth] of ring) positions.push([(x + center) / 1000, (h + depth / norm) / 1000, ((.5 - u) * lengthMm - depth * slope / norm) / 1000]);
    sections.push({u, widthMm: 2 * w, heightMm: h, thicknessMm: T});
  }
  const face = (v, mat, uv) => {faces.push(v); materials.push(mat); uvs.push(uv);};
  // Top faces read left-to-right as seen from above with the tip up; the base is mirrored
  // so it reads correctly when the ski is turned over. Art spans the widest width.
  const uvOf = shape.uvAt
    ? (k, material) => {
      const section = sections[Math.floor(k / N)];
      const xMm = positions[k][0] * 1000;
      return shape.uvAt(section.u, clamp(xMm / section.widthMm + .5, 0, 1), material === 1 ? 1 : 0, xMm);
    }
    : (k, material) => {
      const section = sections[Math.floor(k / N)];
      const x = positions[k][0] * 1000 / fullWidth;
      return [.5 + (material === 1 ? x : -x), 1 - section.u];
    };
  for (let i = 0; i < us.length - 1; i++) for (let j = 0; j < N; j++) {
    const jj = (j + 1) % N, indices = [i * N + j, (i + 1) * N + j, (i + 1) * N + jj, i * N + jj];
    const steel = us[i] >= (shape.steelStartU ?? 0);
    let band = [steel ? 3 : 1, 1, steel ? 3 : 1, steel ? 3 : 1, steel ? 3 : 2, 2, 0, 0, 0, 2, steel ? 3 : 2, steel ? 3 : 1][j];
    if (shape.sidewallText && j === 5) {
      // Printed sidewall: u along the ski (0 at the tip), v from the edge up to the shoulder.
      const span = shape.sidewallText.span ?? .3;
      face(indices, 4, indices.map(k => [.5 + (sections[Math.floor(k / N)].u - .5) / span, k % N === 5 ? 0 : 1]));
      continue;
    }
    face(indices, band, indices.map(k => uvOf(k, band)));
  }
  // End caps triangulated from an interior center; no collapsed zero-area nose faces.
  for (const end of [0, us.length - 1]) {
    const ids = Array.from({length: N}, (_, j) => end * N + j), center = [0, 0, 0];
    ids.forEach(id => positions[id].forEach((v, k) => {center[k] += v / N;}));
    const ci = positions.length;
    positions.push(center);
    for (let j = 0; j < N; j++) {
      const v = end === 0 ? [ci, ids[j], ids[(j + 1) % N]] : [ci, ids[(j + 1) % N], ids[j]];
      face(v, 2, v.map(() => [.5, .5]));
    }
  }
  // The printable sidewall's height at the middle of the ski (between the edge and the shoulder).
  const T = thicknessAt(.5), sidewallHeightMm = T - Math.min(.45, T * .1) - Math.min(shape.steelHeightMm, T * .45);
  const definition = shape.definition ?? {lengthMm, tipMm: shape.tipMm, waistMm: shape.waistMm, tailMm: shape.tailMm, mountMm: shape.mountMm ?? 0, sidewallHeightMm,
    baseMm: shape.baseMm, steelWidthMm: shape.steelWidthMm, steelHeightMm: shape.steelHeightMm, fullWidthMm: fullWidth, mirrorPair: !!shape.mirrorPair};
  return {schemaVersion: 1, axes: shape.axes ?? 'X across, Y up, +Z tip', units: 'meters', definition, positions, faces, materials, uvs, sections, ringSize: N, topRingIndex: 7, surfaces: shape.surfaces ?? SURFACES};
}

// A visual mount point: the boot center at the ski's reference line, sitting on the topsheet.
export function mountPoint(mesh) {
  const z = mesh.definition.mountMm / 1000;
  const u = .5 - z * 1000 / mesh.definition.lengthMm;
  const section = mesh.sections.reduce((a, b) => (Math.abs(a.u - u) < Math.abs(b.u - u) ? a : b));
  return {x: 0, y: (section.heightMm + section.thicknessMm) / 1000 - .009, z};
}

// Finite, closed and correctly oriented: used by the tests for every orderable length.
export function meshReport(mesh) {
  const finite = mesh.positions.every(p => p.every(Number.isFinite));
  const edges = new Map();
  for (const face of mesh.faces) for (let i = 0; i < face.length; i++) {
    const a = face[i], b = face[(i + 1) % face.length];
    const key = a < b ? `${a}-${b}` : `${b}-${a}`;
    edges.set(key, (edges.get(key) ?? 0) + 1);
  }
  const open = [...edges.values()].filter(count => count !== 2).length;
  const widths = mesh.sections.map(s => s.widthMm);
  return {finite, open, maxWidth: Math.max(...widths), minWidth: Math.min(...widths), sections: mesh.sections.length};
}
