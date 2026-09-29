// Paints a pack's art layers ({fill}, {fill, x, y, width, height} or {href, x, y, width,
// height, blend, opacity, tint} in millimetres of the ski's bounding box, the same lists
// the 2D stage draws) into one canvas per ski for the 3D textures. `tint` recolors an
// image used as an alpha mask. Images are decoded once and reused.

const images = new Map();
export function decodedImage(src) {
  if (!images.has(src)) {
    const image = new Image();
    image.crossOrigin = 'anonymous';
    image.src = src;
    const promise = image.decode().then(() => image).catch(error => {images.delete(src); throw error;});
    images.set(src, promise);
    if (images.size > 24) images.delete(images.keys().next().value);
  }
  return images.get(src);
}

// Texture size follows the ski's proportions, capped for memory; the sources are small.
export function canvasSize(widthMm, lengthMm, height = 2048) {
  return [Math.max(64, Math.round(height * widthMm / lengthMm / 8) * 8), height];
}

// An alpha mask filled with one color, at the size it will be drawn.
function tinted(image, color, width, height) {
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(width));
  canvas.height = Math.max(1, Math.round(height));
  const context = canvas.getContext('2d');
  context.imageSmoothingQuality = 'high';
  context.drawImage(image, 0, 0, canvas.width, canvas.height);
  context.globalCompositeOperation = 'source-in';
  context.fillStyle = color;
  context.fillRect(0, 0, canvas.width, canvas.height);
  return canvas;
}

export async function paintLayers(layers, {widthMm, lengthMm, size = canvasSize(widthMm, lengthMm)}) {
  const [w, h] = size;
  const sources = await Promise.all(layers.map(layer => (layer.href ? decodedImage(layer.href) : null)));
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const context = canvas.getContext('2d');
  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = 'high';
  const sx = w / widthMm, sy = h / lengthMm;
  layers.forEach((layer, i) => {
    context.globalAlpha = layer.opacity ?? 1;
    context.globalCompositeOperation = layer.blend === 'multiply' ? 'multiply' : 'source-over';
    if (layer.fill) {
      context.fillStyle = layer.fill;
      if (layer.width !== undefined) context.fillRect((layer.x ?? 0) * sx, (layer.y ?? 0) * sy, layer.width * sx, (layer.height ?? lengthMm) * sy);
      else context.fillRect(0, 0, w, h);
    } else if (sources[i]) {
      const box = [(layer.x ?? 0) * sx, (layer.y ?? 0) * sy, (layer.width ?? widthMm) * sx, (layer.height ?? lengthMm) * sy];
      context.drawImage(layer.tint ? tinted(sources[i], layer.tint, box[2], box[3]) : sources[i], ...box);
    }
  });
  context.globalAlpha = 1;
  context.globalCompositeOperation = 'source-over';
  return canvas;
}

/** {top: {left, right}, base: {left, right}} layer lists → {top: [canvas, canvas], base: [canvas, canvas]}. */
export async function paintSurfaces(surfaces, box) {
  const [topLeft, topRight, baseLeft, baseRight] = await Promise.all([
    paintLayers(surfaces.top.left, box), paintLayers(surfaces.top.right, box),
    paintLayers(surfaces.base.left, box), paintLayers(surfaces.base.right, box),
  ]);
  return {top: [topLeft, topRight], base: [baseLeft, baseRight]};
}

/**
 * Sidewall print: text centered on the sidewall, over `span` of the ski's length (the
 * kernel maps that span onto the canvas). The canvas is squeezed along the ski so letters
 * keep their proportions on a sidewall only a few millimetres tall.
 */
export function paintSidewall({text, color = '#f2f2f0', background = '#1c1d20', font = '600 1px system-ui', span = .3, capHeightMm = 3.6}, {lengthMm, heightMm = 5}) {
  const canvas = document.createElement('canvas');
  canvas.width = 4096;
  canvas.height = 128;
  const context = canvas.getContext('2d');
  context.fillStyle = background;
  context.fillRect(0, 0, canvas.width, canvas.height);
  if (!text) return canvas;
  const pxPerMmX = canvas.width / (span * lengthMm), pxPerMmY = canvas.height / heightMm;
  const size = capHeightMm * pxPerMmY / .72;
  context.save();
  context.translate(canvas.width / 2, canvas.height / 2);
  context.scale(pxPerMmX / pxPerMmY, 1);
  context.font = font.replace(/[0-9.]+px/, `${size}px`);
  context.fillStyle = color;
  context.textAlign = 'center';
  context.textBaseline = 'middle';
  context.fillText(text, 0, size * .04);
  context.restore();
  return canvas;
}
