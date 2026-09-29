// Geometry shared by the preview components and scripts/build-art.mjs.
//
// ON3P's public artwork files are 1000 × 1600 print canvases. The topsheet
// pair sits at x ≈ 89–303 and the base pair at x ≈ 388–603. The outline below is
// a schematic ski clip, not a manufacturing silhouette.

export const SKI_WIDTH = 92;
export const SKI_TOP = 138;
export const SKI_BOTTOM = 1562;
export const PAIR_LEFTS = {top: [89, 211], base: [388, 511]};

// Every derivative keeps canvas coordinates, so a crop drops straight into the
// same SVG coordinate system as the full canvas.
export const CROPS = {
  stage: {top: {x: 80, y: 124, w: 234, h: 1452}, base: {x: 379, y: 124, w: 234, h: 1452}},
  thumb: {top: {x: 80, y: 124, w: 234, h: 720}, base: {x: 379, y: 124, w: 234, h: 720}},
};
export const THUMB_WIDTH = 200;

// Waist inset grows with waist width so narrower models read slimmer.
export const waistInset = waist => (SKI_WIDTH / 2) * (1 - Math.min(124, waist) / 140);

// The schematic outline of one ski in its own W × L box (tip at y = 0).
export function skiPath(inset) {
  const w = SKI_WIDTH;
  const half = w / 2;
  const l = SKI_BOTTOM - SKI_TOP;
  return [
    `M ${half} 0`,
    'C 5 0 0 18 0 126',
    `C 2 502 ${inset} 582 ${inset} 712`,
    `C ${inset} 1002 2 1162 0 1302`,
    `Q -2 ${l} ${half} ${l}`,
    `Q ${w + 2} ${l} ${w} 1302`,
    `C ${w - 2} 1162 ${w - inset} 1002 ${w - inset} 712`,
    `C ${w - inset} 582 ${w - 2} 502 ${w} 126`,
    `C ${w} 18 ${w - 5} 0 ${half} 0`,
    'Z',
  ].join(' ');
}

// Places a canvas crop so the given ski's print area fills its local box.
export const cropLayer = (href, crop, skiLeft) => ({href, x: crop.x - skiLeft, y: crop.y - SKI_TOP, width: crop.w, height: crop.h});

// Catalog entries reference their original canvas (e.g. /assets/top-answer-x.webp).
// Derivatives are generated with the same base name.
export const artName = graphic => graphic.image.split('/').pop().replace(/\.(webp|jpe?g|png)$/i, '');

const base = (typeof import.meta !== 'undefined' && import.meta.env?.BASE_URL) || '/';
export const assetUrl = path => `${base}${path.replace(/^\//, '')}`;
export const stageArt = graphic => assetUrl(`art/stage/${artName(graphic)}.webp`);
export const thumbArt = graphic => assetUrl(`art/thumb/${artName(graphic)}.webp`);
