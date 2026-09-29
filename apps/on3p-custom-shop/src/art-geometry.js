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

// Pair bounds used as the SVG viewBox for the stage.
export const pairBox = kind => {
  const [left] = PAIR_LEFTS[kind];
  return {x: left - 5, y: 128, w: 226, h: 1444};
};

// Waist inset grows with waist width so narrower models read slimmer.
export const waistInset = waist => (SKI_WIDTH / 2) * (1 - Math.min(124, waist) / 140);

export function skiPath(left, inset) {
  const half = SKI_WIDTH / 2;
  const right = left + SKI_WIDTH;
  return [
    `M ${left + half} ${SKI_TOP}`,
    `C ${left + 5} ${SKI_TOP} ${left} 156 ${left} 264`,
    `C ${left + 2} 640 ${left + inset} 720 ${left + inset} 850`,
    `C ${left + inset} 1140 ${left + 2} 1300 ${left} 1440`,
    `Q ${left - 2} ${SKI_BOTTOM} ${left + half} ${SKI_BOTTOM}`,
    `Q ${right + 2} ${SKI_BOTTOM} ${right} 1440`,
    `C ${right - 2} 1300 ${right - inset} 1140 ${right - inset} 850`,
    `C ${right - inset} 720 ${right - 2} 640 ${right} 264`,
    `C ${right} 156 ${right - 5} ${SKI_TOP} ${left + half} ${SKI_TOP}`,
    'Z',
  ].join(' ');
}

// Catalog entries reference their original canvas (e.g. /assets/top-answer-x.webp).
// Derivatives are generated with the same base name.
export const artName = graphic => graphic.image.split('/').pop().replace(/\.(webp|jpe?g|png)$/i, '');

const base = (typeof import.meta !== 'undefined' && import.meta.env?.BASE_URL) || '/';
export const assetUrl = path => `${base}${path.replace(/^\//, '')}`;
export const stageArt = graphic => assetUrl(`art/print/${artName(graphic)}.png`);
export const thumbArt = graphic => assetUrl(`art/thumb/${artName(graphic)}.webp`);
