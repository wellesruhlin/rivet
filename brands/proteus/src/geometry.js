// Proteus boards as 3D shapes for the shared studio kernel (millimetres, u = 0 at the nose).
//
// Planform: the published waist, sidecut radius and effective edge for the size give a
// circular sidecut between the contact points; the nose and tail follow the outline
// traced from Proteus's product art (data/outline.json), averaged into a true twin and
// scaled to meet the sidecut.
//
// Profile: a molded camber of half the Adjustable Camber travel. Tensioning one end bends
// that half evenly (a constant moment between the center and the end of the effective
// edge) and turns the nose or tail with it, so each end moves from full camber through
// flat to full rocker on its own. The board then rests on flat snow on its lowest points
// under its center. Kick height, thickness and edge sizes are estimates.
import outline from './data/outline.json' with {type: 'json'};
import {contactOffset, ESTIMATES} from './specs.js';

const clamp = (x, a = 0, b = 1) => Math.max(a, Math.min(b, x));
const smoothstep = x => {x = clamp(x); return x * x * (3 - 2 * x);};

// Traced width (fraction of the widest point) at v, 0 at the nose.
const rows = outline.profile;
function traced(v) {
  v = clamp(v);
  let lo = 0, hi = rows.length - 1;
  while (hi - lo > 1) {const mid = (lo + hi) >> 1; if (rows[mid][0] <= v) lo = mid; else hi = mid;}
  const [v0, w0] = rows[lo], [v1, w1] = rows[hi];
  return w0 + (w1 - w0) * clamp((v - v0) / Math.max(1e-9, v1 - v0));
}
const twin = v => (traced(v) + traced(1 - v)) / 2;

export function planform(size) {
  const L = size.length * 10, E = size.edge * 10, R = size.radius * 1000, W = size.waist * 10;
  const zc = E / 2;
  const depth = z => R - Math.sqrt(R * R - z * z);
  const contactWidth = W + 2 * depth(zc);
  const uc = (L - E) / 2 / L;
  const endScale = contactWidth / twin(uc);
  const widthAt = u => {
    const z = (.5 - u) * L;
    return Math.abs(z) <= zc ? W + 2 * depth(z) : endScale * twin(Math.min(u, 1 - u));
  };
  return {L, E, R, W, zc, uc, contactWidth, widthAt, sidecutDepth: depth(zc)};
}

// The kick: a slow rise off the contact point that steepens toward the tip.
const kick = s => .75 * Math.pow(clamp(s), 1.8) + .25 * Math.pow(clamp(s), 4);

// Lower convex hull of points sorted by x (Andrew's monotone chain).
function lowerHull(points) {
  const hull = [];
  const cross = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
  for (const p of points) {
    while (hull.length >= 2 && cross(hull[hull.length - 2], hull[hull.length - 1], p) <= 0) hull.pop();
    hull.push(p);
  }
  return hull;
}

/**
 * The base line for a size at nose and tail settings (0 full camber … 100 full rocker).
 * Returns heightAt(u) above flat snow, and where the board touches it.
 */
export function profile(size, nose, tail) {
  const {L, zc} = planform(size);
  const half = L / 2;
  // z > 0 toward the nose; heights relative to the board's center before it settles.
  const raw = z => {
    const c = contactOffset(z >= 0 ? nose : tail);
    const a = Math.abs(z);
    if (a <= zc) return c * (a / zc) ** 2;
    return c + (2 * c / zc) * (a - zc) + ESTIMATES.kickMm * kick((a - zc) / (half - zc));
  };
  const samples = Array.from({length: 1201}, (_, i) => {const z = -half + L * i / 1200; return [z, raw(z)];});
  const hull = lowerHull(samples);
  const i = Math.max(1, hull.findIndex(p => p[0] >= 0));
  const [p, q] = [hull[i - 1], hull[i]];
  const slope = (q[1] - p[1]) / (q[0] - p[0]);
  const settled = z => raw(z) - (p[1] + slope * (z - p[0]));
  const heightAt = u => Math.max(0, settled((.5 - u) * L));
  // The first and last points on the snow (a rocker board touches only near its center).
  const touching = samples.filter(([z]) => settled(z) < .25).map(([z]) => z);
  const contact = [Math.min(...touching), Math.max(...touching)];
  return {
    heightAt,
    raw,
    contactU: [.5 - contact[1] / L, .5 - contact[0] / L],
    centerMm: settled(0),
    noseMm: settled(half),
    tailMm: settled(-half),
    noseContactMm: settled(zc),
    tailContactMm: settled(-zc),
    tiltDeg: Math.atan(slope) * 180 / Math.PI,
  };
}

/** Kernel shape for a size and camber setting. */
export function boardShape(size, nose = 0, tail = 0, {sidewallText = true} = {}) {
  if (!size) return null;
  const plan = planform(size);
  const base = profile(size, nose, tail);
  const {underfootMm, endMm} = ESTIMATES;
  const thicknessAt = u => endMm + (underfootMm - endMm) * smoothstep((Math.min(u, 1 - u) - .01) / .26);
  return {
    key: `${size.id}-${nose}-${tail}`,
    lengthMm: plan.L,
    tipMm: plan.contactWidth, waistMm: plan.W, tailMm: plan.contactWidth,
    mountMm: 0,
    widthAt: plan.widthAt, heightAt: base.heightAt, thicknessAt,
    steelWidthMm: ESTIMATES.edgeWidthMm, steelHeightMm: ESTIMATES.edgeHeightMm, baseMm: ESTIMATES.baseMm,
    steelStartU: 0,
    // Sampled exactly so every camber setting of a size shares one topology (it can morph).
    stations: [plan.uc, 1 - plan.uc, .5],
    sidewallText: sidewallText ? {span: .3} : null,
    plan, profile: base,
  };
}

// The outline for 2D swatches and tiles: {left, right} as fractions of the widest point.
export function artShape(size) {
  const plan = planform(size);
  const left = [], right = [];
  for (let i = 0; i <= 200; i++) {
    const v = (1 - Math.cos(Math.PI * i / 200)) / 2;
    const w = plan.widthAt(v) / plan.contactWidth;
    left.push([v, .5 - w / 2]);
    right.push([v, .5 + w / 2]);
  }
  return {width: plan.contactWidth, length: plan.L, gap: plan.contactWidth * .2, profile: {left, right}};
}

// Where the hardware sits (fractions of the board's length from the nose), for the layup.
export function hardwareStations(size) {
  const L = size.length * 10;
  const stance = (size.stance[0] + size.stance[1]) / 2 * 10;
  return {port: .5, inserts: [.5 - stance / 2 / L, .5 + stance / 2 / L], stanceMm: stance};
}
