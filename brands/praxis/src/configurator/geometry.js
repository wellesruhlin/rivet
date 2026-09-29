// Praxis skis as 3D shapes for the shared studio kernel.
//
// Planform: the outline traced from Praxis's shape drawing (data/outlines.json),
// corrected piecewise so the tip, waist and tail widths equal the published figures.
// Profile: tip and tail rocker lengths and heights, camber and contact from the spec
// chart at that length (the nearest charted length when a length has no row). Models
// without a chart use a profile for their described molding (recurve, tip rocker,
// compound camber or continuous rocker), labelled as an estimate. Thickness, edge and
// base dimensions are not published; they are estimates and disclosed as such.
import outlines from './data/outlines.json' with {type: 'json'};
import {chartFor, describedDimensions, specAt} from '../catalog/specs.js';

const clamp = (x, a = 0, b = 1) => Math.max(a, Math.min(b, x));
const smoothstep = x => {x = clamp(x); return x * x * (3 - 2 * x);};

// Profiles for models without a spec chart, from Praxis's own descriptions. Fractions
// are of the ski's length; heights in cm and camber in mm, as on the charts.
export const MOLDING_ESTIMATES = {
  '9-d': {molding: 'Recurve', basis: 'the 9D8 chart (Praxis draws the 9-D from the 9D8 and SND)', tipRocker: .16, tailRocker: .076, tipHeight: 7, tailHeight: 2, camber: 5, boot: -8},
  bps: {molding: 'Compound camber', basis: 'Praxis’s description of rocker with compound camber', tipRocker: .3, tailRocker: .2, tipHeight: 8, tailHeight: 5, camber: 3, boot: -7},
  concept: {molding: 'Compound camber', basis: 'Praxis’s description of compound camber with a slow-rise tip', tipRocker: .25, tailRocker: .12, tipHeight: 6.5, tailHeight: 3, camber: 3, boot: -7},
  'gpo-jr': {molding: 'Recurve', basis: 'the GPO chart (the GPO Jr is a downsized GPO)', tipRocker: .3, tailRocker: .19, tipHeight: 7, tailHeight: 3, camber: 3, boot: -6},
  'piste-jib': {molding: 'Recurve', basis: 'Praxis’s description of slow-rise rocker with camber underfoot', tipRocker: .22, tailRocker: .18, tipHeight: 6, tailHeight: 5, camber: 4, boot: -4},
  powderboard: {molding: 'Continuous rocker', basis: 'Praxis’s continuous-curve rocker (no flat or camber)', tipHeight: 8, tailHeight: 6, camber: 0, boot: -6},
  quixote: {molding: 'Recurve', basis: 'Praxis’s freeride profiles', tipRocker: .28, tailRocker: .18, tipHeight: 7, tailHeight: 4, camber: 4, boot: -7},
  ullr: {molding: 'Recurve', basis: 'Praxis’s description of a spoon-shaped rockered tip', tipRocker: .35, tailRocker: .2, tipHeight: 9, tailHeight: 5, camber: 3, boot: -6},
  yeti: {molding: 'Recurve', basis: 'the BC chart (the Yeti is a slimmer BC)', tipRocker: .25, tailRocker: .11, tipHeight: 7, tailHeight: 3, camber: 5, boot: -8},
};
// Described molding for charted models, for the Tech Specs view.
const CHARTED_MOLDING = {frd: 'Tip rocker', exp: 'Tip rocker', snd: 'Tip rocker', '9d8': 'Recurve'};

// Estimated construction dimensions (Praxis publishes materials, not these sizes).
export const ESTIMATES = {underfootMm: 17, endMm: 5, edgeWidthMm: 2.5, edgeHeightMm: 2.5, baseMm: 1.8};

// Monotone cubic (PCHIP) through sorted [x, y] points: smooth, no overshoot.
function pchip(points) {
  const xs = points.map(p => p[0]), ys = points.map(p => p[1]), n = xs.length;
  const h = xs.slice(1).map((x, i) => x - xs[i]), d = h.map((hi, i) => (ys[i + 1] - ys[i]) / (hi || 1e-9));
  const m = xs.map((_, i) => {
    if (i === 0) return d[0];
    if (i === n - 1) return d[n - 2];
    if (d[i - 1] * d[i] <= 0) return 0;
    const w1 = 2 * h[i] + h[i - 1], w2 = h[i] + 2 * h[i - 1];
    return (w1 + w2) / (w1 / d[i - 1] + w2 / d[i]);
  });
  return x => {
    if (x <= xs[0]) return ys[0];
    if (x >= xs[n - 1]) return ys[n - 1];
    let i = 0;
    while (xs[i + 1] < x) i++;
    const t = (x - xs[i]) / h[i], t2 = t * t, t3 = t2 * t;
    return (2 * t3 - 3 * t2 + 1) * ys[i] + (t3 - 2 * t2 + t) * h[i] * m[i] + (-2 * t3 + 3 * t2) * ys[i + 1] + (t3 - t2) * h[i] * m[i + 1];
  };
}

// Width fraction (of the drawing's widest width) along the traced outline, u = 0 at the tip.
function tracedWidth(modelId) {
  const {profile} = outlines[modelId];
  const points = profile.left.map(([v, x], i) => [v, profile.right[i][1] - x]);
  const unique = points.filter((p, i) => i === 0 || p[0] > points[i - 1][0]);
  return pchip(unique);
}

// Where the tip, waist and tail widths sit (same rule as the 2D technical drawing).
export function landmarks(raw) {
  const samples = Array.from({length: 401}, (_, i) => [i / 400, raw(i / 400)]);
  const within = (a, b) => samples.filter(([u]) => u >= a && u <= b);
  const best = (list, better) => list.reduce((x, y) => (better(y[1], x[1]) ? y : x));
  return {tip: best(within(.04, .4), (a, b) => a > b)[0], waist: best(within(.3, .7), (a, b) => a < b)[0], tail: best(within(.6, .97), (a, b) => a > b)[0]};
}

// The profile row for a model at a length: the chart row, or the nearest charted length.
function profileSource(modelId, length) {
  const spec = specAt(modelId, length);
  if (spec) return {spec, charted: true, exact: true};
  const chart = chartFor(modelId);
  if (chart) {
    const nearest = chart.lengths.reduce((a, b) => (Math.abs(b - length) < Math.abs(a - length) ? b : a));
    return {spec: specAt(modelId, nearest), charted: true, exact: false, from: nearest};
  }
  return {spec: null, charted: false, exact: false};
}

export function profileFor(modelId, lengthCm) {
  const source = profileSource(modelId, lengthCm);
  if (source.spec) {
    const s = source.spec, L = source.exact ? lengthCm : s.length;
    return {
      kind: 'chart', exact: source.exact, from: source.from, year: s.year,
      molding: CHARTED_MOLDING[modelId] ?? 'Recurve',
      tipRocker: s.tipRocker / L, tailRocker: s.tailRocker / L, tipHeightMm: s.tipHeight * 10, tailHeightMm: s.tailHeight * 10, camberMm: s.camber,
      bootCm: s.boot,
    };
  }
  const e = MOLDING_ESTIMATES[modelId] ?? MOLDING_ESTIMATES.quixote;
  return {kind: 'estimate', exact: false, molding: e.molding, basis: e.basis, tipRocker: e.tipRocker ?? 0, tailRocker: e.tailRocker ?? 0, tipHeightMm: e.tipHeight * 10, tailHeightMm: e.tailHeight * 10, camberMm: e.camber, bootCm: e.boot};
}

// Base height above the running plane along the ski (mm), u = 0 at the tip.
export function heightFunction(profile, mountU) {
  const rise = x => Math.pow(clamp(x), 2.3) * .78 + Math.pow(clamp(x), 7) * .22;
  if (profile.molding === 'Continuous rocker') {
    const m = mountU;
    return {contact: [m, m], at: u => (u < m ? profile.tipHeightMm * rise((m - u) / m) : profile.tailHeightMm * rise((u - m) / (1 - m)))};
  }
  const a = clamp(profile.tipRocker, .02, .6), b = clamp(1 - profile.tailRocker, a + .2, .98);
  const camber = u => {
    if (profile.molding === 'Compound camber') {
      // Two pods of camber, fore and aft of the boot, meeting the snow underfoot.
      const m = clamp(mountU, a + .08, b - .08);
      return u < m ? profile.camberMm * Math.sin(Math.PI * (u - a) / (m - a)) : profile.camberMm * Math.sin(Math.PI * (u - m) / (b - m));
    }
    return profile.camberMm * Math.sin(Math.PI * (u - a) / (b - a));
  };
  return {contact: [a, b], at: u => (u < a ? profile.tipHeightMm * rise((a - u) / a) : u > b ? profile.tailHeightMm * rise((u - b) / (1 - b)) : camber(u))};
}

/**
 * Kernel shape for a model at a length with an optional ±10 mm width offset.
 * Returns null when the model has no traced outline.
 */
export function praxisShape(model, lengthCm, {offsetMm = 0} = {}) {
  if (!model || !outlines[model.id] || !lengthCm) return null;
  const raw = tracedWidth(model.id);
  const marks = landmarks(raw);
  const spec = specAt(model.id, lengthCm);
  const described = describedDimensions[model.id] ?? {};
  const lengthMm = (lengthCm + Math.sign(offsetMm)) * 10;
  const drawnWidest = outlines[model.id].aspect * lengthCm * 10;
  const tip = spec?.tip ?? described.tip, waist = spec?.waist ?? described.waist, tail = spec?.tail ?? described.tail;
  const [ra, rb, rc] = [raw(marks.tip), raw(marks.waist), raw(marks.tail)];
  const published = !!(tip && waist && tail);
  // Scale the drawing to the published widths, or keep its own proportions.
  const scale = published ? null : waist ? waist / rb : drawnWidest / Math.max(ra, rc);
  const widths = published ? {tip: tip + offsetMm, waist: waist + offsetMm, tail: tail + offsetMm}
    : {tip: ra * scale + offsetMm, waist: rb * scale + offsetMm, tail: rc * scale + offsetMm};
  const widthAt = u => {
    const r = raw(u);
    if (u < marks.tip) return widths.tip * r / ra;
    if (u <= marks.waist) return widths.waist + (widths.tip - widths.waist) * clamp((r - rb) / Math.max(1e-6, ra - rb));
    if (u <= marks.tail) return widths.waist + (widths.tail - widths.waist) * clamp((r - rb) / Math.max(1e-6, rc - rb));
    return widths.tail * r / rc;
  };
  const profile = profileFor(model.id, lengthCm);
  const mountMm = profile.bootCm * 10;
  const mountU = .5 - mountMm / lengthMm;
  const height = heightFunction(profile, mountU);
  const {underfootMm, endMm} = ESTIMATES;
  const thicknessAt = u => endMm + (underfootMm - endMm) * smoothstep((Math.min(u, 1 - u) - .015) / .3);
  return {
    key: `${model.id}-${lengthCm}-${offsetMm}`,
    lengthMm,
    tipMm: widths.tip, waistMm: widths.waist, tailMm: widths.tail,
    mountMm,
    widthAt, heightAt: height.at, thicknessAt,
    steelWidthMm: ESTIMATES.edgeWidthMm, steelHeightMm: ESTIMATES.edgeHeightMm, baseMm: ESTIMATES.baseMm,
    steelStartU: 0,
    stations: [marks.tip, marks.waist, marks.tail, ...height.contact, mountU],
    published, profile, marks,
  };
}
