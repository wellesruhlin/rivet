// Artwork for the topsheet and the base: Proteus's designs (cropped from its product
// images by scripts/build-art.mjs), a customer's own upload, and the base template
// (scripts/build-template.mjs) in custom colors. Layers are in millimetres of the board's
// bounding box, the lists both the 3D studio and the 2D swatches draw.
import template from './data/template.json' with {type: 'json'};

const baseUrl = (typeof import.meta !== 'undefined' && import.meta.env?.BASE_URL) || '/';
export const asset = path => `${baseUrl}${path.replace(/^\//, '')}`;
// The file name fetch-art.mjs gives a colorway's image.
export const artName = (designId, colorway) => `${designId}--${colorway.toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')}`;

// Base colors, sampled from the bases Proteus prints on its own designs.
export const BASE_COLORS = [
  {value: 'white', label: 'White', color: '#f2f2f0'},
  {value: 'charcoal', label: 'Charcoal', color: '#262626'},
  {value: 'black', label: 'Black', color: '#0a0a0b'},
  {value: 'grey', label: 'Grey', color: '#717173'},
  {value: 'slate', label: 'Slate', color: '#304454'},
  {value: 'storm', label: 'Storm', color: '#4c5c69'},
  {value: 'indigo', label: 'Indigo', color: '#2f2c6f'},
  {value: 'royal', label: 'Royal', color: '#4457a6'},
  {value: 'violet', label: 'Violet', color: '#6b539d'},
  {value: 'aqua', label: 'Aqua', color: '#6fccda'},
  {value: 'seafoam', label: 'Seafoam', color: '#9ccfce'},
  {value: 'green', label: 'Green', color: '#68b645'},
  {value: 'olive', label: 'Olive', color: '#5a5f39'},
  {value: 'yellow', label: 'Yellow', color: '#f4e624'},
  {value: 'sand', label: 'Sand', color: '#e0d186'},
  {value: 'orange', label: 'Orange', color: '#f16b28'},
  {value: 'red', label: 'Red', color: '#dd4031'},
  {value: 'plum', label: 'Plum', color: '#50373b'},
];
const colorsById = new Map(BASE_COLORS.map(c => [c.value, c]));
export const baseColor = id => colorsById.get(id) ?? BASE_COLORS[1];
export const BASE_ZONES = [
  {group: 'baseNose', label: 'Nose band', text: 'The band across the nose.'},
  {group: 'baseBlock', label: 'Logo block', text: 'Carries the trident; the wordmark prints in this color.'},
  {group: 'baseBody', label: 'Body', text: 'The rest of the base; the trident prints in this color.'},
];
export const TEMPLATE = template;

// Uploaded artwork lives only in this page session. A build link can't carry an image, so
// the configuration keeps the file's name and the image is looked up here.
const uploads = new Map();
const listeners = new Set();
let version = 0;
export const uploadedArt = {
  get: name => (name ? uploads.get(name) ?? null : null),
  // Each upload gets its own id, so replacing a file with one of the same name repaints.
  set(name, entry) {
    uploads.set(name, {...entry, id: ++version});
    listeners.forEach(listener => listener());
  },
  version: () => version,
  subscribe(listener) {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },
};

const full = box => ({x: 0, y: 0, width: box.width, height: box.length});

/** Layers for a Proteus design in one colorway. */
export function designLayers(designId, colorway, box) {
  const name = artName(designId, colorway);
  return {top: [{href: asset(`art/top/${name}.webp`), ...full(box)}], base: [{href: asset(`art/base/${name}.webp`), ...full(box)}]};
}

/** The base template in three colors: nose band, logo block with the trident, body with the wordmark. */
export function baseTemplateLayers({nose, block, body}, box) {
  const [a, b] = template.bands;
  const at = mark => ({x: mark.x * box.width, y: mark.y * box.length, width: mark.width * box.width, height: mark.height * box.length});
  return [
    {fill: baseColor(body).color},
    {fill: baseColor(nose).color, x: 0, y: 0, width: box.width, height: a * box.length},
    {fill: baseColor(block).color, x: 0, y: a * box.length, width: box.width, height: (b - a) * box.length},
    {href: asset('art/template/symbol.png'), tint: baseColor(body).color, ...at(template.symbol)},
    {href: asset('art/template/wordmark.png'), tint: baseColor(block).color, ...at(template.wordmark)},
  ];
}

// A blank topsheet (the way Proteus's own template shows it) until artwork is uploaded.
export const BLANK_TOPSHEET = '#d6d7d9';

/** Layers for a custom board: the uploaded art over the full template, then the hardware. */
export function customLayers({upload, nose, block, body}, box) {
  return {
    top: [
      upload ? {href: upload.url, ...full(box)} : {fill: BLANK_TOPSHEET},
      {href: asset('art/template/hardware.png'), ...full(box)},
    ],
    base: baseTemplateLayers({nose, block, body}, box),
  };
}

// ---------------------------------------------------------------------------
// Preparing an upload: Proteus asks for art filling a 68 × 13 in artboard, scaled to the
// board. The image is cropped to that shape from its center (landscape art is turned so
// its left edge is the nose) and kept at texture resolution.
export const TEMPLATE_IN = [13, 68];
const OUTPUT_HEIGHT = 2048;

export async function prepareUpload(file) {
  const url = URL.createObjectURL(file);
  try {
    const image = new Image();
    image.src = url;
    await image.decode();
    const vector = file.type === 'image/svg+xml' || /\.svg$/i.test(file.name);
    const width = image.naturalWidth || 300, height = image.naturalHeight || 150;
    const landscape = width > height;
    const long = Math.max(width, height), short = Math.min(width, height);
    const canvas = document.createElement('canvas');
    canvas.height = OUTPUT_HEIGHT;
    canvas.width = Math.round(OUTPUT_HEIGHT * TEMPLATE_IN[0] / TEMPLATE_IN[1]);
    const context = canvas.getContext('2d');
    context.imageSmoothingQuality = 'high';
    // Cover: the template's 13:68 shape cut from the middle of the (turned) image.
    const target = TEMPLATE_IN[0] / TEMPLATE_IN[1];
    const cropLong = Math.min(long, short / target), cropShort = cropLong * target;
    context.save();
    if (landscape) {
      context.translate(canvas.width, 0);
      context.rotate(Math.PI / 2);
      // Rotated: the image's x runs down the board, its y runs across (right to left).
      context.drawImage(image, (width - cropLong) / 2, (height - cropShort) / 2, cropLong, cropShort, 0, 0, canvas.height, canvas.width);
    } else {
      context.drawImage(image, (width - cropShort) / 2, (height - cropLong) / 2, cropShort, cropLong, 0, 0, canvas.width, canvas.height);
    }
    context.restore();
    const ppi = vector ? null : Math.round(long / TEMPLATE_IN[1]);
    const trimmed = Math.abs(long / short - TEMPLATE_IN[1] / TEMPLATE_IN[0]) / (TEMPLATE_IN[1] / TEMPLATE_IN[0]) > .04;
    return {url: canvas.toDataURL('image/jpeg', .9), width, height, ppi, vector, trimmed, turned: landscape, name: file.name};
  } finally {
    URL.revokeObjectURL(url);
  }
}
