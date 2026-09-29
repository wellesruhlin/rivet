import * as THREE from 'three';

export const finishFor = graphic => graphic.name.startsWith('Wood ') ? 'wood' : 'textured';
export const FINISH_NAMES = {wood: 'Satin wood', textured: 'Coarse textured topsheet'};
const clamp = (x, a = 0, b = 1) => Math.max(a, Math.min(b, x));
function hash(x, y) {
  let value = Math.imul(x, 374761393) + Math.imul(y, 668265263);
  value = Math.imul(value ^ (value >>> 13), 1274126177);
  return ((value ^ (value >>> 16)) >>> 0) / 4294967295;
}
const wrap = (x, n) => (x % n + n) % n;

// A seamless 24 mm material tile, independent of artwork resolution. Worn
// raised facets flatten at the peaks; sparse smoother facets catch the key
// light as the ski turns. No sparkle or shadows are baked into the graphic.
export function finishPixels(kind, size = 256) {
  const height = new Float32Array(size * size);
  const normal = new Uint8Array(size * size * 4);
  const roughness = new Uint8Array(size * size * 4);
  const cells = 24;
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const u = x / size * cells, v = y / size * cells;
    const gx = Math.floor(u), gy = Math.floor(v);
    let distance = Infinity, seed = 0;
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
      const px = gx + dx, py = gy + dy, sx = wrap(px, cells), sy = wrap(py, cells);
      const cx = px + .15 + .7 * hash(sx, sy), cy = py + .15 + .7 * hash(sx + 91, sy + 73);
      const d = Math.hypot(u - cx, v - cy);
      if (d < distance) {distance = d; seed = hash(sx + 157, sy + 367);}
    }
    const index = y * size + x;
    const wear = clamp((distance - .16) / .7);
    const grain = 1 - wear * wear * (3 - 2 * wear);
    height[index] = kind === 'wood'
      ? Math.sin(2 * Math.PI * (x / size * 25 + .09 * Math.sin(2 * Math.PI * y / size * 3))) * .0025
      : grain * (.12 + seed * .08);
    const r = kind === 'wood' ? .73 + .09 * seed : seed > .958 && distance < .24 ? .23 : .64 + seed * .27;
    roughness.set([255, Math.round(r * 255), 255, 255], index * 4);
  }
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const at = (dx, dy) => height[wrap(y + dy, size) * size + wrap(x + dx, size)];
    const nx = -(at(1, 0) - at(-1, 0)) / (48 / size);
    const ny = -(at(0, 1) - at(0, -1)) / (48 / size);
    const length = Math.hypot(nx, ny, 1);
    normal.set([Math.round((nx / length * .5 + .5) * 255), Math.round((ny / length * .5 + .5) * 255), Math.round((1 / length * .5 + .5) * 255), 255], (y * size + x) * 4);
  }
  return {normal, roughness, size};
}

const pixels = new Map();
export function createFinishMaps(kind, anisotropy) {
  if (!pixels.has(kind)) pixels.set(kind, finishPixels(kind));
  const data = pixels.get(kind);
  const texture = bytes => {
    const map = new THREE.DataTexture(bytes, data.size, data.size, THREE.RGBAFormat);
    map.wrapS = map.wrapT = THREE.RepeatWrapping;
    map.magFilter = THREE.LinearFilter;
    map.minFilter = THREE.LinearMipmapLinearFilter;
    map.generateMipmaps = true;
    map.anisotropy = anisotropy;
    map.needsUpdate = true;
    return map;
  };
  const normal = texture(data.normal), roughness = texture(data.roughness);
  return {
    normal, roughness,
    size(widthMm, lengthMm) {for (const map of [normal, roughness]) map.repeat.set(widthMm / 24, lengthMm / 24);},
    dispose() {normal.dispose(); roughness.dispose();},
  };
}
