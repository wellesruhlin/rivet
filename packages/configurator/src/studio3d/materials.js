import * as THREE from 'three';

// Procedural surfaces for the exploded construction view: wood species, stitched and
// woven laminates, rubber sheets, machined plastics and metals. Each surface is a
// seamless tile with color, height (baked to a normal map) and roughness, generated once
// per session. Box-mapped UVs (see construction.js) run v along the ski, so grain, tows
// and brushing follow the length on every face. Visual approximations, not scans.
// Ported from the ON3P construction view and extended for other makers' materials.

const clamp = (x, a = 0, b = 1) => Math.max(a, Math.min(b, x));
const mix = (a, b, t) => a + (b - a) * t;
const wrap = (x, n) => ((x % n) + n) % n;
function hash(x, y, seed = 0) {
  let h = Math.imul(x | 0, 374761393) + Math.imul(y | 0, 668265263) + Math.imul(seed | 0, 1274126177);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967295;
}
// Periodic value noise (lattice periods px, py keep every tile seamless).
function vnoise(x, y, px, py, seed) {
  const x0 = Math.floor(x), y0 = Math.floor(y), fx = x - x0, fy = y - y0;
  const sx = fx * fx * (3 - 2 * fx), sy = fy * fy * (3 - 2 * fy);
  const h = (i, j) => hash(wrap(x0 + i, px), wrap(y0 + j, py), seed);
  return mix(mix(h(0, 0), h(1, 0), sx), mix(h(0, 1), h(1, 1), sx), sy);
}
function fbm(x, y, px, py, seed, octaves = 3) {
  let sum = 0, amp = .5, norm = 0;
  for (let o = 0; o < octaves; o++) {
    sum += amp * vnoise(x, y, px, py, seed + o * 31); norm += amp;
    x *= 2; y *= 2; px *= 2; py *= 2; amp *= .5;
  }
  return sum / norm;
}

function surface(w, h, mm, shade) {
  const n = w * h, color = new Float32Array(n * 3), height = new Float32Array(n), rough = new Float32Array(n);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const i = y * w + x, s = shade(x, y);
    color[i * 3] = s.c[0]; color[i * 3 + 1] = s.c[1]; color[i * 3 + 2] = s.c[2];
    height[i] = s.h; rough[i] = s.r;
  }
  return {w, h, mm, color, height, rough};
}

// Vertically laminated wood: glue lines every lamination, long fibres, per-lamination
// tone, optional open-grain pores (ash) and node bands (bamboo). v runs along the ski.
function wood({base, dark, lamMm = 2.6, contrast = .14, nodes = false, pores = 0, seed = 1}) {
  const w = 128, h = 1024, mm = [24, 192];
  const lams = Math.max(1, Math.round(mm[0] / lamMm)), lamPx = w / lams;
  return surface(w, h, mm, (x, y) => {
    const lx = x / lamPx, li = Math.floor(lx), lf = lx - li;
    const tone = (hash(li, 3, seed) - .5) * .12;
    const fibre = fbm(x / w * 64, y / h * 4, 64, 4, seed + 7) - .5;
    const fine = vnoise(x / w * 190, y / h * 14, 190, 14, seed + 11) - .5;
    const seam = lams > 1 ? Math.exp(-Math.pow(Math.min(lf, 1 - lf) * lamPx / 1.1, 2)) : 0;
    const pore = pores ? Math.pow(clamp(vnoise(x / w * 90, y / h * 60, 90, 60, seed + 13) * 1.6 - .95), 2) * pores : 0;
    let node = 0;
    if (nodes) {
      const at = hash(li, 9, seed), d = Math.abs(wrap(y / h - at + .5, 1) - .5) * mm[1];
      node = Math.exp(-d * d / 2.2) * (.6 + .4 * hash(li, 5, seed));
    }
    const k = clamp(.5 + tone + fibre * contrast * 2.2 + fine * .12);
    const t = clamp(seam * .55 + node * .45 + (1 - k) * .35 + pore * .8);
    return {
      c: [mix(base[0], dark[0], t) * (.94 + k * .1), mix(base[1], dark[1], t) * (.94 + k * .1), mix(base[2], dark[2], t) * (.94 + k * .1)],
      h: -seam * .5 + fine * .25 + fibre * .35 + node * .6 - pore * .6,
      r: .5 + fibre * .12 + seam * .18 + pore * .2,
    };
  });
}

// 2x2 twill at ±45° in resin. `carbon` sets how often a tow is carbon (1 = every tow).
function twill({seed = 4, carbonEvery = 8, glass = [.6, .66, .6]}) {
  const size = 256, mm = [32, 32], P = size / 8;
  return surface(size, size, mm, (x, y) => {
    const ca = (x + y) / P, cb = (x - y + size * 4) / P;
    const ia = Math.floor(ca), ib = Math.floor(cb), fa = ca - ia, fb = cb - ib;
    const phase = wrap(ia + ib, 4), aTop = phase < 2;
    const across = aTop ? fa : fb;
    const along = ((aTop ? phase : phase - 2) + (aTop ? fb : fa)) / 2;
    const carbon = carbonEvery === 1 || (!aTop && wrap(ib, carbonEvery) === 0);
    const under = carbonEvery > 1 && aTop && wrap(ib, carbonEvery) === 0;
    const crown = Math.sin(Math.PI * across), dip = .55 + .45 * Math.sin(Math.PI * along);
    const fibres = vnoise(across * 26, along * 3 + wrap(aTop ? ia : ib, 8) * 7.3, 26, 1e6, seed) - .5;
    const gap = Math.exp(-Math.pow(Math.min(across, 1 - across) * P / 1.3, 2));
    const cloud = fbm(x / size * 4, y / size * 4, 4, 4, seed + 9) - .5;
    const k = 1 + fibres * .05 + crown * .04 - gap * .08 + cloud * .08 + (aTop ? .02 : -.02);
    const c = carbon ? [.12, .13, .14] : under ? [.33, .37, .34] : glass;
    return {c: [c[0] * k, c[1] * k, c[2] * k], h: crown * dip + fibres * .15, r: carbon ? .2 + gap * .15 : .28 + gap * .18};
  });
}

// Stitched tri-axial glass: 0° rovings on top, ±45° rovings beneath, polyester stitch
// rows every few millimetres. Not woven, so no over-under crowns.
function triax({seed = 31}) {
  const size = 256, mm = [24, 24], rov = size / 12, stitch = size / 6;
  return surface(size, size, mm, (x, y) => {
    const zero = (x / rov) % 1, a = ((x + y) / (rov * 1.2)) % 1, b = ((x - y + size * 4) / (rov * 1.2)) % 1;
    const ridge = t => Math.sin(Math.PI * t);
    const top = ridge(zero), diag = Math.max(ridge(a), ridge(b)) * .6;
    const row = Math.exp(-Math.pow((wrap(y, stitch) - stitch / 2) / 1.3, 2));
    const loop = row * (.5 + .5 * Math.sin(x / size * Math.PI * 2 * 24));
    const cloud = fbm(x / size * 4, y / size * 4, 4, 4, seed) - .5;
    const fibres = vnoise(x / size * 120, y / size * 6, 120, 6, seed + 5) - .5;
    const k = .95 + top * .05 + fibres * .06 + cloud * .08 - row * .06;
    const c = [.64 * k, .7 * k, .63 * k];
    return {c: [c[0] + loop * .08, c[1] + loop * .08, c[2] + loop * .07], h: top * .7 + diag * .35 + loop * .5 + fibres * .1, r: .3 + (1 - top) * .12 + row * .1};
  });
}

// Stitched biaxial glass: ±45° rovings with stitch rows, no 0° layer.
function biax({seed = 33}) {
  const size = 256, mm = [24, 24], rov = size / 10, stitch = size / 6;
  return surface(size, size, mm, (x, y) => {
    const a = ((x + y) / rov) % 1, b = ((x - y + size * 4) / rov) % 1;
    const ridge = t => Math.sin(Math.PI * t);
    const upper = ridge(a), lower = ridge(b) * .55;
    const row = Math.exp(-Math.pow((wrap(y, stitch) - stitch / 2) / 1.3, 2));
    const loop = row * (.5 + .5 * Math.sin(x / size * Math.PI * 2 * 20));
    const cloud = fbm(x / size * 4, y / size * 4, 4, 4, seed) - .5;
    const fibres = vnoise((x + y) / size * 90, (x - y) / size * 6, 90, 6, seed + 5) - .5;
    const k = .95 + upper * .05 + fibres * .05 + cloud * .08 - row * .05;
    return {c: [.66 * k + loop * .07, .71 * k + loop * .07, .64 * k + loop * .06], h: upper * .7 + lower * .4 + loop * .45 + fibres * .1, r: .3 + (1 - upper) * .12 + row * .1};
  });
}

// Chopped-strand mat over a faint 45/45 cloth, soaked in resin.
function choppedMat({seed = 6}) {
  const size = 256, mm = [32, 32], height = new Float32Array(size * size);
  for (let s = 0; s < 1100; s++) {
    const cx = hash(s, 1, seed) * size, cy = hash(s, 2, seed) * size, a = hash(s, 3, seed) * Math.PI;
    const len = 14 + hash(s, 4, seed) * 38, amp = .5 + hash(s, 5, seed) * .5;
    for (let t = -len / 2; t <= len / 2; t += .5) {
      const px = cx + Math.cos(a) * t, py = cy + Math.sin(a) * t;
      for (let o = -1; o <= 1; o++) {
        const qx = Math.round(px - Math.sin(a) * o), qy = Math.round(py + Math.cos(a) * o);
        const i = wrap(qy, size) * size + wrap(qx, size);
        height[i] = Math.max(height[i], amp * (o === 0 ? 1 : .45));
      }
    }
  }
  return surface(size, size, mm, (x, y) => {
    const f = height[y * size + x];
    const cloth = .5 + .5 * Math.sin((x + y) / size * Math.PI * 2 * 16) * Math.sin((x - y) / size * Math.PI * 2 * 16);
    const n = fbm(x / size * 8, y / size * 8, 8, 8, seed + 3) - .5;
    const k = .86 + f * .16 + cloth * .04 + n * .1;
    return {c: [.8 * k, .78 * k, .66 * k], h: f * .8 + cloth * .15 + n * .2, r: .38 + (1 - f) * .14};
  });
}

// Fine lines along v (machined UHMW, brushed steel, ground Scalium, stone-ground bases).
function brushed({lines = 60, depth = 1, roughBase = .3, roughVar = .1, seed = 8, tint = [1, 1, 1]}) {
  const w = 64, h = 512, mm = [12, 96];
  return surface(w, h, mm, (x, y) => {
    const l = fbm(x / w * lines, y / h * 3, lines, 3, seed, 2) - .5;
    const fine = Math.round(lines * 2.5), s = vnoise(x / w * fine, y / h * 60, fine, 60, seed + 5) - .5;
    const k = 1 + l * .05 + s * .03;
    return {c: [tint[0] * k, tint[1] * k, tint[2] * k], h: (l + s * .5) * depth, r: roughBase + (l + .5) * roughVar};
  });
}

function speckle({base, seed = 12, rough = .8, bump = 1}) {
  const size = 128, mm = [12, 12];
  return surface(size, size, mm, (x, y) => {
    const n = vnoise(x / size * 40, y / size * 40, 40, 40, seed) - .5;
    const m = fbm(x / size * 6, y / size * 6, 6, 6, seed + 2) - .5;
    const k = 1 + n * .12 + m * .1;
    return {c: [base[0] * k, base[1] * k, base[2] * k], h: (n + m * .4) * bump, r: rough + n * .08};
  });
}

// A rubber sheet punched on a staggered grid (the binding-zone damping sheet).
function perforated({base = [.17, .175, .18], seed = 41, pitchMm = 8, holeMm = 3.2}) {
  const size = 192, mm = [24, 24], pitch = size / (mm[0] / pitchMm), radius = size / mm[0] * holeMm / 2;
  return surface(size, size, mm, (x, y) => {
    const row = Math.floor(y / pitch), cx = (Math.floor(x / pitch + (row % 2) * .5) + .5 - (row % 2) * .5) * pitch;
    const d = Math.hypot(x - cx, y - (row + .5) * pitch);
    const hole = clamp((radius - d) / 1.2 + .5);
    const n = vnoise(x / size * 40, y / size * 40, 40, 40, seed) - .5;
    const k = (1 + n * .1) * (1 - hole * .75);
    return {c: [base[0] * k, base[1] * k, base[2] * k], h: -hole * 1.4 + n * .5, r: .82 - hole * .2};
  });
}

const RECIPES = {
  // Woods
  bamboo: () => wood({base: [.84, .64, .36], dark: [.52, .34, .15], nodes: true, seed: 1}),
  paulownia: () => wood({base: [.93, .86, .7], dark: [.72, .6, .42], lamMm: 3.4, contrast: .1, seed: 2}),
  mounting: () => wood({base: [.72, .5, .26], dark: [.4, .25, .1], lamMm: 4.2, contrast: .16, nodes: true, seed: 3}),
  // Hard maple reads creamy, ash tan with dark open pores, aspen nearly white.
  maple: () => wood({base: [.94, .83, .64], dark: [.76, .6, .4], lamMm: 24, contrast: .1, seed: 51}),
  ash: () => wood({base: [.72, .57, .37], dark: [.4, .28, .15], lamMm: 24, contrast: .22, pores: 1.2, seed: 52}),
  aspen: () => wood({base: [.96, .94, .88], dark: [.8, .76, .67], lamMm: 24, contrast: .06, seed: 53}),
  poplar: () => wood({base: [.9, .88, .77], dark: [.68, .68, .55], lamMm: 24, contrast: .1, seed: 54}),
  // Laminates
  composite: () => twill({}),
  carbon: () => twill({carbonEvery: 1, seed: 7}),
  triax: () => triax({}),
  biax: () => biax({}),
  binding: () => choppedMat({}),
  // Plastics, rubber and metal
  sidewall: () => brushed({lines: 90, depth: .5, roughBase: .26, roughVar: .12, seed: 21}),
  uhmw: () => brushed({lines: 70, depth: .4, roughBase: .34, roughVar: .1, seed: 27, tint: [.16, .16, .17]}),
  tipfill: () => brushed({lines: 60, depth: .35, roughBase: .38, roughVar: .1, seed: 28, tint: [.86, .87, .88]}),
  steel: () => brushed({lines: 70, depth: .8, roughBase: .2, roughVar: .14, seed: 22}),
  scalium: () => brushed({lines: 45, depth: 1, roughBase: .28, roughVar: .12, seed: 23}),
  rubber: () => speckle({base: [.16, .165, .17], rough: .82, bump: 1.4, seed: 24}),
  perforated: () => perforated({}),
  bonding: () => speckle({base: [.15, .16, .17], rough: .7, bump: .6, seed: 25}),
  grind: () => brushed({lines: 120, depth: .25, roughBase: .38, roughVar: .1, seed: 26}),
};
export const SURFACE_KINDS = Object.keys(RECIPES);

const cache = new Map();
function pixels(kind) {
  if (!cache.has(kind)) {
    const s = RECIPES[kind](), n = s.w * s.h;
    const color = new Uint8Array(n * 4), normal = new Uint8Array(n * 4), rough = new Uint8Array(n * 4);
    const at = (x, y) => s.height[wrap(y, s.h) * s.w + wrap(x, s.w)];
    const strength = 2.2;
    for (let y = 0; y < s.h; y++) for (let x = 0; x < s.w; x++) {
      const i = y * s.w + x;
      color.set([clamp(s.color[i * 3]) * 255, clamp(s.color[i * 3 + 1]) * 255, clamp(s.color[i * 3 + 2]) * 255, 255], i * 4);
      const nx = -(at(x + 1, y) - at(x - 1, y)) * strength, ny = -(at(x, y + 1) - at(x, y - 1)) * strength, len = Math.hypot(nx, ny, 1);
      normal.set([(nx / len * .5 + .5) * 255, (ny / len * .5 + .5) * 255, (1 / len * .5 + .5) * 255, 255], i * 4);
      rough.set([255, clamp(s.rough[i]) * 255, 255, 255], i * 4);
    }
    cache.set(kind, {w: s.w, h: s.h, mm: s.mm, color, normal, rough});
  }
  return cache.get(kind);
}

function dataTexture(bytes, p, anisotropy, srgb) {
  const t = new THREE.DataTexture(bytes, p.w, p.h, THREE.RGBAFormat);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.magFilter = THREE.LinearFilter;
  t.minFilter = THREE.LinearMipmapLinearFilter;
  t.generateMipmaps = true;
  t.anisotropy = anisotropy;
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  // Box-mapped UVs are in units of 24 mm; scale each tile to its physical size.
  t.repeat.set(24 / p.mm[0], 24 / p.mm[1]);
  t.needsUpdate = true;
  return t;
}

/** Texture set {map, normalMap, roughnessMap} for a surface kind; caller disposes. */
export function surfaceMaps(kind, anisotropy, {color = true} = {}) {
  const p = pixels(kind);
  return {
    map: color ? dataTexture(p.color, p, anisotropy, true) : null,
    normalMap: dataTexture(p.normal, p, anisotropy, false),
    roughnessMap: dataTexture(p.rough, p, anisotropy, false),
  };
}
