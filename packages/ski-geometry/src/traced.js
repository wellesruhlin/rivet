// Traced-outline skis: shape functions built from image-traced width, rocker and
// thickness samples plus published dimensions (the ON3P reconstruction data format).
// Input dimensions are millimetres; meshes come from the shared kernel.
import {generateSkiMesh} from './kernel.js';

export const TRACED_SURFACES = ['topsheet', 'base', 'sidewall', 'steel'];
const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
const mix = (a, b, t) => a + (b - a) * t;
const smoothstep = x => {x = clamp(x, 0, 1); return x * x * (3 - 2 * x);};

export function sample(values, u) {
  const x = clamp(u, 0, 1) * (values.length - 1), i = Math.min(values.length - 2, Math.floor(x));
  return mix(values[i], values[i + 1], x - i);
}

function resolveStockValue(k, s, p, r) {
  return {lengthMm: s.length_cm * 10, tipMm: s.tip_mm, waistMm: s.waist_mm, tailMm: s.tail_mm,
    tipRiseMm: p.tipRiseMm * r, tailRiseMm: p.tailRiseMm * r, camberMm: p.camberMm * r,
    thicknessMm: p.underfootThicknessMm, mountMm: s.mount_from_center_cm * 10}[k];
}

// A published length, optionally with research overrides (length, widths, rises, camber,
// underfoot thickness, mount), validated against physical ranges.
export function resolve(model, lengthCm = 186, override = {}) {
  const stock = model.lengths.find(x => x.length_cm === Number(lengthCm));
  if (!stock) throw new Error('Unsupported published length');
  const ratio = stock.length_cm * 10 / model.referenceLengthMm;
  const p = model.profile;
  const def = {model: model.handle, name: model.name, lengthMm: stock.length_cm * 10,
    tipMm: stock.tip_mm, waistMm: stock.waist_mm, tailMm: stock.tail_mm,
    tipRiseMm: p.tipRiseMm * ratio, tailRiseMm: p.tailRiseMm * ratio, camberMm: p.camberMm * ratio,
    thicknessMm: p.underfootThicknessMm, mountMm: stock.mount_from_center_cm * 10,
    ...override};
  const ranges = {lengthMm: [1200, 2200], tipMm: [85, 185], waistMm: [65, 155], tailMm: [80, 180],
    tipRiseMm: [0, 160], tailRiseMm: [0, 160], camberMm: [0, 15], thicknessMm: [7, 22], mountMm: [-200, 150]};
  for (const [key, [a, b]] of Object.entries(ranges))
    if (!Number.isFinite(def[key]) || def[key] < a || def[key] > b) throw new Error(`${key} must be ${a}–${b}`);
  if (def.tipMm < def.waistMm || def.tailMm < def.waistMm) throw new Error('These traced ON3P shapes require tip and tail at least as wide as waist');
  def.custom = Object.keys(override).some(k => def[k] !== resolveStockValue(k, stock, p, ratio));
  return def;
}

export function widthAt(model, d, u) {
  const o = model.outline, [a, b, c] = o.landmarks, raw = sample(o.widthPx, u),
    wa = sample(o.widthPx, a), wb = sample(o.widthPx, b), wc = sample(o.widthPx, c);
  if (u < a) return d.tipMm * raw / wa;
  if (u <= b) return d.waistMm + (d.tipMm - d.waistMm) * clamp((raw - wb) / (wa - wb), 0, 1);
  if (u <= c) return d.waistMm + (d.tailMm - d.waistMm) * clamp((raw - wb) / (wc - wb), 0, 1);
  return d.tailMm * raw / wc;
}

export function heightAt(model, d, u) {
  const p = model.profile, [a, b] = p.contactU, h = sample(p.heightMm, u);
  const rawCamber = Math.max(...p.heightMm.slice(Math.floor(a * 240), Math.ceil(b * 240) + 1));
  // Separate ramps meet at the traced near-zero contact plateaus; a small local
  // blend prevents changing one rise from introducing a step at the transition.
  const mid = d.camberMm / Math.max(rawCamber, .01), head = d.tipRiseMm / p.heightMm[0], tail = d.tailRiseMm / p.heightMm.at(-1);
  let f = mid;
  if (u < a) f = mix(head, mid, smoothstep((u - a + .015) / .015));
  if (u > b) f = mix(mid, tail, smoothstep((u - b) / .015));
  return h * f;
}

export function thicknessAt(model, d, u) {
  // A change to underfoot depth leaves the explicitly estimated thin ends alone.
  const blend = smoothstep(u / .18) * smoothstep((1 - u) / .18);
  return sample(model.profile.thicknessMm, u) + (d.thicknessMm - model.profile.underfootThicknessMm) * blend;
}

// UVs into the original print canvas (1667 × 3125 px). With +Z nose and +Y top, a nose-up
// top camera sees +X on its left; opposite surface handedness keeps neither side mirrored.
export function artUV(model, u, xFraction, side, base) {
  if (!base) xFraction = 1 - xFraction;
  const b = model.artBounds[(base ? 2 : 0) + side];
  const px = mix(sample(b.left, u) + 1, sample(b.right, u) - 1, xFraction);
  return [px / 1667, 1 - mix(b.y0, b.y1, u) / 3125];
}

/**
 * The kernel shape for a traced model at a resolved definition.
 * uv: 'canvas' maps artwork into the original print canvas for `side` (the Blender lab);
 *     'span' uses the kernel's default, spanning the widest width (the configurators).
 */
export function tracedShape(model, d, {side = 0, uv = 'canvas'} = {}) {
  const c = model.construction;
  return {
    lengthMm: d.lengthMm, tipMm: d.tipMm, waistMm: d.waistMm, tailMm: d.tailMm, mountMm: d.mountMm,
    widthAt: u => widthAt(model, d, u),
    heightAt: u => heightAt(model, d, u),
    thicknessAt: u => thicknessAt(model, d, u),
    steelWidthMm: c.steelWidthMm, steelHeightMm: c.steelHeightMm, baseMm: c.baseThicknessMm,
    steelStartU: c.estimatedTipSteelStartU,
    stations: [...model.outline.landmarks, ...model.profile.contactU],
    edgeClamp: false,
    uvAt: uv === 'canvas' ? (u, x, band) => artUV(model, u, x, side, band === 1) : undefined,
    definition: d,
    surfaces: TRACED_SURFACES,
    axes: 'X across, Y up, +Z nose',
  };
}

// The traced mesh with its source record (the lab's canonical export format).
export function generateTracedMesh(model, d, {segments = 360, side = 0, uv = 'canvas'} = {}) {
  return {
    ...generateSkiMesh(tracedShape(model, d, {side, uv}), {segments}),
    source: {url: model.sourceUrl, image: model.imageUrl, sha256: model.imageSha256, warnings: model.warnings},
  };
}
