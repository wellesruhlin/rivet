// Factory-label lettering for twelve 2027 designs, drawn at up to 24× the source
// resolution. Returns canvases and UV bounds; the 3D studio overlays them on the topsheet.
import {CROPS, PAIR_LEFTS, SKI_BOTTOM, SKI_TOP, SKI_WIDTH} from './art.js';

// These twelve 2027 designs share the same underfoot label registration.
// Explicit IDs prevent this treatment from covering unrelated artwork.
const FACTORY = new Map([
  ['ANSWER-497h6y', 'Onyx'], ['ANSWER-497kju', 'Ivory'],
  ['ANSWER-498i4q', 'Oxblood'], ['ANSWER-498eru', 'Petrol'],
  ['ANSWER-498bey', 'Violet'], ['ANSWER-498822', 'Scarlet'],
  ['ANSWER-4984p6', 'Spruce'], ['ANSWER-4981ca', 'Cobalt'],
  ['ANSWER-497xze', 'Fuschia'], ['ANSWER-497umi', 'Tangerine'],
  ['ANSWER-497r9m', 'Acid'], ['ANSWER-497nwq', 'Turquoise'],
]);
export const factoryName = id => FACTORY.get(id) ?? null;

// Coordinates in the original 234 x 1452 topsheet pair crop, not mesh space.
export const LABEL_REGIONS = [
  {x: 35, y: 730, w: 48, h: 126},
  {x: 161, y: 729, w: 41, h: 122},
];
export function detailBounds(side) {
  const r = LABEL_REGIONS[side], crop = CROPS.stage.top;
  return [
    (r.x + crop.x - PAIR_LEFTS.top[side]) / SKI_WIDTH,
    1 - (r.y + crop.y - SKI_TOP + r.h) / (SKI_BOTTOM - SKI_TOP),
    r.w / SKI_WIDTH, r.h / (SKI_BOTTOM - SKI_TOP),
  ];
}

// Reconstruct just the label's background from its adjacent unprinted pigment.
// A feathered border retains the original bitmap at the patch boundary. The
// full source artwork is never modified; Original remains a source reference.
function labelBackground(image, r) {
  const canvas = document.createElement('canvas');
  canvas.width = r.w; canvas.height = r.h;
  const ctx = canvas.getContext('2d', {willReadFrequently: true});
  ctx.drawImage(image, r.x, r.y, r.w, r.h, 0, 0, r.w, r.h);
  const pixels = ctx.getImageData(0, 0, r.w, r.h);
  for (let y = 0; y < r.h; y++) {
    const left = (y * r.w + 1) * 4, right = (y * r.w + r.w - 2) * 4;
    const a = [...pixels.data.slice(left, left + 3)], b = [...pixels.data.slice(right, right + 3)];
    for (let x = 0; x < r.w; x++) {
      const i = (y * r.w + x) * 4, t = x / (r.w - 1);
      for (let c = 0; c < 3; c++) pixels.data[i + c] = a[c] * (1 - t) + b[c] * t;
      pixels.data[i + 3] = Math.round(255 * Math.min(1, x / 3, (r.w - 1 - x) / 3, y / 3, (r.h - 1 - y) / 3));
    }
  }
  ctx.putImageData(pixels, 0, 0);
  return canvas;
}

function lettering(ctx, text, x, y, height, width, weight = 700) {
  ctx.save();
  ctx.font = `${weight} ${height}px Barlow`;
  ctx.textBaseline = 'alphabetic';
  ctx.translate(x, y);
  ctx.scale(width / ctx.measureText(text).width, 1);
  ctx.fillText(text, 0, 0);
  ctx.restore();
}

// A clean vector interpretation of the small three-stripe factory badge.
// This is preview artwork, not a recovered factory vector master.
function factoryBadge(ctx, x, y) {
  ctx.save(); ctx.translate(x, y);
  ctx.beginPath(); ctx.moveTo(2, 0); ctx.lineTo(20, 0); ctx.lineTo(20, 17);
  ctx.lineTo(12, 17); ctx.quadraticCurveTo(9, 17, 7.5, 14.5);
  ctx.lineTo(.5, 3); ctx.quadraticCurveTo(-1, 0, 2, 0); ctx.fill();
  ctx.globalCompositeOperation = 'destination-out';
  ctx.lineWidth = 2.65; ctx.lineCap = 'round';
  for (const dx of [0, 5, 10]) {
    ctx.beginPath(); ctx.moveTo(3 + dx, 2.8); ctx.lineTo(10 + dx, 14.2); ctx.stroke();
  }
  ctx.restore();
}

function factoryLabel(ctx, name) {
  ctx.save(); ctx.translate(55, 788); ctx.rotate(-Math.PI / 2);
  lettering(ctx, 'FACTORY', 0, 0, 9.6, 44);
  lettering(ctx, name.toUpperCase(), 0, 10.8, 9.6, Math.min(51, name.length * 7.1));
  ctx.restore();
  ctx.fillRect(47.5, 795, 24, 4.5);
  // Draw the knockout logo on a transparent layer, so its cutouts expose pigment.
  const badge = document.createElement('canvas'); badge.width = 528; badge.height = 480;
  const badgeCtx = badge.getContext('2d'); badgeCtx.scale(24, 24);
  badgeCtx.fillStyle = ctx.fillStyle; factoryBadge(badgeCtx, 1, 1);
  ctx.drawImage(badge, 47.5, 803, 22, 20);
  lettering(ctx, 'HANDMADE SKIS', 47, 829, 2.1, 24, 500);
  lettering(ctx, 'PORTLAND, OREGON', 45, 832.8, 2.1, 28, 500);
  lettering(ctx, 'ON3PSKIS.COM', 48, 839, 2.1, 22, 500);
}

function specificationLabel(ctx, spec) {
  lettering(ctx, 'ON3P', 167, 746, 11.6, 30);
  lettering(ctx, 'SKI CO', 167, 756, 10, 30);
  ctx.fillRect(167, 760, 29, .55);
  lettering(ctx, spec.model.toUpperCase(), 167, 766, 3.1, 29);
  lettering(ctx, spec.length, 167, 773, 3.5, 12);
  lettering(ctx, spec.dimensions, 167, 779, 2.9, 29, 500);
  lettering(ctx, spec.rocker.toUpperCase(), 167, 786, 2.7, 27, 500);
  ctx.fillRect(167, 795, 30, 4.5);
  // Thirteen stripes and fifty stars, drawn as geometry rather than a tiny JPEG.
  for (let i = 0; i < 13; i += 2) ctx.fillRect(167, 805 + i * 1.27, 30, 1.27);
  ctx.clearRect(167, 805, 12, 8.9);
  for (let row = 0; row < 9; row++) for (let col = 0; col < (row % 2 ? 5 : 6); col++) {
    ctx.fillRect(167.7 + col * 1.85 + (row % 2 ? .92 : 0), 805.5 + row * .88, .46, .46);
  }
  lettering(ctx, 'HANDMADE SKIS', 170, 829, 2.1, 24, 500);
  lettering(ctx, 'PORTLAND, OREGON', 168, 832.8, 2.1, 28, 500);
  lettering(ctx, 'ON3PSKIS.COM', 171, 839, 2.1, 22, 500);
}

export async function loadPrintFonts() {
  await Promise.all([document.fonts.load('700 20px Barlow'), document.fonts.load('500 20px Barlow')]);
}

export function createPrintDetails(image, id, spec, maxTextureSize = 4096) {
  const name = factoryName(id);
  if (!name) return [];
  return LABEL_REGIONS.map((r, side) => {
    const scale = Math.min(24, maxTextureSize / r.h);
    const canvas = document.createElement('canvas');
    canvas.width = Math.floor(r.w * scale); canvas.height = Math.floor(r.h * scale);
    const ctx = canvas.getContext('2d');
    ctx.scale(canvas.width / r.w, canvas.height / r.h);
    ctx.drawImage(labelBackground(image, r), 0, 0);
    // Separate transparent ink canvas keeps knockout paths off the pigment.
    const ink = document.createElement('canvas'); ink.width = canvas.width; ink.height = canvas.height;
    const pen = ink.getContext('2d');
    pen.scale(canvas.width / r.w, canvas.height / r.h); pen.translate(-r.x, -r.y);
    pen.fillStyle = '#fafaf7'; pen.strokeStyle = '#fafaf7';
    if (name === 'Ivory') {pen.shadowColor = '#555'; pen.shadowBlur = scale * .65;}
    if (side === 0) factoryLabel(pen, name); else specificationLabel(pen, spec);
    ctx.drawImage(ink, 0, 0, r.w, r.h);
    return {canvas, bounds: detailBounds(side)};
  });
}
