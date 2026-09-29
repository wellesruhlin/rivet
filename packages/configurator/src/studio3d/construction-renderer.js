import * as THREE from 'three';
import {surfaceMaps} from './materials.js';

// Printed faces keep the artwork UVs; every other face is box-mapped in 24 mm units with
// v along the ski, so grain, tows and brushing follow the length on all faces.
export function constructionBuffer(layer, {uvOffset = [0, 0]} = {}) {
  const positions = [], uvs = [];
  const geometry = new THREE.BufferGeometry();
  const artwork = layer.artwork;
  const a = new THREE.Vector3(), b = new THREE.Vector3(), c = new THREE.Vector3(), n = new THREE.Vector3();
  layer.faces.forEach((face, fi) => {
    const start = positions.length / 3;
    const printed = !!artwork && fi < layer.faces.length - 2 && fi % 4 === (artwork === 'base' ? 0 : 2);
    a.fromArray(layer.positions[face[0]]); b.fromArray(layer.positions[face[1]]); c.fromArray(layer.positions[face[2]]);
    n.subVectors(b, a).cross(c.clone().sub(a));
    const [ax, ay, az] = [Math.abs(n.x), Math.abs(n.y), Math.abs(n.z)];
    const box = p => (ay >= ax && ay >= az ? [p[0], p[2]] : ax >= az ? [p[1], p[2]] : [p[0], p[1]]);
    for (let i = 1; i < face.length - 1; i++) for (const corner of [0, i, i + 1]) {
      const p = layer.positions[face[corner]];
      positions.push(...p);
      if (printed) uvs.push(...layer.uvs[fi][corner]);
      else {const [u, v] = box(p); uvs.push(u * 1000 / 24 + uvOffset[0], v * 1000 / 24 + uvOffset[1]);}
    }
    if (artwork) geometry.addGroup(start, positions.length / 3 - start, printed ? 0 : 1);
  });
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geometry.computeVertexNormals();
  return geometry;
}

const ACTIVE = new THREE.Color(0x2b2519), NONE = new THREE.Color(0x000000);
function remember(m) {
  m.userData.look = {color: m.color.clone(), env: m.envMapIntensity, coat: m.clearcoat ?? 0, sheen: m.sheen ?? 0};
  return m;
}
function paint(m, state) {
  const look = m.userData.look;
  m.color.copy(look.color);
  if (state === 'dim') m.color.multiplyScalar(.3);
  m.emissive.copy(state === 'active' ? ACTIVE : NONE);
  m.envMapIntensity = look.env * (state === 'dim' ? .3 : state === 'active' ? 1.25 : 1);
  if ('clearcoat' in m) m.clearcoat = look.coat * (state === 'dim' ? .3 : 1);
  if ('sheen' in m) m.sheen = look.sheen * (state === 'dim' ? .3 : 1);
}

/**
 * The exploded layers of one ski.
 * @param layers   from buildLayers(); each has {id, key, material, artwork, explode, vary?}
 * @param exterior the exterior materials [top, base, sidewall, steel]; top and base keep their artwork
 */
export function createConstructionStudy(layers, {exterior, anisotropy, envMap = null, veneer = false}) {
  const textures = [];
  const maps = (kind, options) => {
    const set = surfaceMaps(kind, anisotropy, options);
    Object.values(set).forEach(t => t && textures.push(t));
    return set;
  };
  const physical = params => remember(new THREE.MeshPhysicalMaterial({envMap, ...params}));
  const woodMaterial = (kind, coat = .15) => physical({color: 0xffffff, ...maps(kind), normalScale: new THREE.Vector2(.35, .35), roughness: 1, clearcoat: coat, clearcoatRoughness: .45, envMapIntensity: .3});
  const [topsheet, printedBase, sidewallSource, steelSource] = exterior;
  const steel = maps('steel', {color: false}), side = maps('sidewall', {color: false}), grind = maps('grind', {color: false});
  topsheet.envMap = envMap; topsheet.envMapIntensity = .3; remember(topsheet);
  const kinds = {
    topsheet: () => topsheet,
    topsheetBack: () => (veneer ? woodMaterial('maple', .08) : physical({color: 0x9a9d95, ...maps('bonding', {color: false}), roughness: 1, envMapIntensity: .3})),
    base: () => physical({map: printedBase.map, color: printedBase.color, roughness: .5, normalMap: grind.normalMap, normalScale: new THREE.Vector2(.15, .15), clearcoat: .15, clearcoatRoughness: .4, envMapIntensity: .35}),
    baseBack: () => physical({color: 0xffffff, ...maps('bonding'), roughness: 1, envMapIntensity: .3}),
    sidewall: () => physical({color: sidewallSource.color, normalMap: side.normalMap, normalScale: new THREE.Vector2(.25, .25), roughnessMap: side.roughnessMap, roughness: 1, clearcoat: .35, clearcoatRoughness: .22, sheen: .3, sheenRoughness: .45, sheenColor: 0xffffff, envMapIntensity: .4}),
    steel: () => physical({color: 0xc6cbcf, metalness: 1, roughness: 1, roughnessMap: steel.roughnessMap, normalMap: steel.normalMap, normalScale: new THREE.Vector2(.2, .2), anisotropy: .55, anisotropyRotation: Math.PI / 2, envMapIntensity: .8}),
    bamboo: () => woodMaterial('bamboo', .18), paulownia: () => woodMaterial('paulownia', .12), mounting: () => woodMaterial('mounting', .3),
    maple: () => woodMaterial('maple', .16), ash: () => woodMaterial('ash', .16), aspen: () => woodMaterial('aspen', .12),
    poplar: () => woodMaterial('poplar', .14),
    biax: () => physical({color: 0xffffff, ...maps('biax'), normalScale: new THREE.Vector2(.5, .5), roughness: 1, clearcoat: .6, clearcoatRoughness: .16, envMapIntensity: .45}),
    tipfill: () => physical({color: 0xffffff, ...maps('tipfill'), normalScale: new THREE.Vector2(.3, .3), roughness: 1, clearcoat: .25, clearcoatRoughness: .3, envMapIntensity: .35}),
    casing: () => physical({color: 0xa3a9ae, metalness: 1, roughness: 1, ...maps('scalium', {color: false}), normalScale: new THREE.Vector2(.25, .25), anisotropy: .4, anisotropyRotation: Math.PI / 2, envMapIntensity: .7}),
    sleeve: () => physical({color: 0x2b2d31, roughness: .45, clearcoat: .5, clearcoatRoughness: .2, envMapIntensity: .4}),
    kevlar: () => physical({color: 0xd4a93c, roughness: .62, sheen: .6, sheenRoughness: .4, sheenColor: 0xffe7a3, envMapIntensity: .35}),
    urethane: () => physical({color: 0x2c2f35, roughness: .5, clearcoat: .4, clearcoatRoughness: .25, sheen: .4, sheenRoughness: .5, sheenColor: 0x8a9099, envMapIntensity: .3}),
    composite: () => physical({color: 0xffffff, ...maps('composite'), normalScale: new THREE.Vector2(.55, .55), roughness: 1, clearcoat: .6, clearcoatRoughness: .16, envMapIntensity: .45}),
    triax: () => physical({color: 0xffffff, ...maps('triax'), normalScale: new THREE.Vector2(.5, .5), roughness: 1, clearcoat: .6, clearcoatRoughness: .16, envMapIntensity: .45}),
    carbon: () => physical({color: 0xffffff, ...maps('carbon'), normalScale: new THREE.Vector2(.55, .55), roughness: 1, clearcoat: .7, clearcoatRoughness: .12, envMapIntensity: .6}),
    binding: () => physical({color: 0xffffff, ...maps('binding'), normalScale: new THREE.Vector2(.45, .45), roughness: 1, clearcoat: .35, clearcoatRoughness: .25, envMapIntensity: .35}),
    rubber: () => physical({color: 0xffffff, ...maps('rubber'), normalScale: new THREE.Vector2(.6, .6), roughness: 1, sheen: .7, sheenRoughness: .55, sheenColor: 0x6a7076, envMapIntensity: .2}),
    perforated: () => physical({color: 0xffffff, ...maps('perforated'), normalScale: new THREE.Vector2(.8, .8), roughness: 1, sheen: .6, sheenRoughness: .55, sheenColor: 0x6a7076, envMapIntensity: .2}),
    uhmw: () => physical({color: 0xffffff, ...maps('uhmw'), normalScale: new THREE.Vector2(.3, .3), roughness: 1, clearcoat: .25, clearcoatRoughness: .3, envMapIntensity: .35}),
    scalium: () => physical({color: 0xb4babf, metalness: 1, roughness: 1, ...maps('scalium', {color: false}), normalScale: new THREE.Vector2(.3, .3), anisotropy: .5, anisotropyRotation: Math.PI / 2, envMapIntensity: .65}),
  };
  const palette = new Map();
  const material = kind => {
    if (!palette.has(kind)) palette.set(kind, (kinds[kind] ?? kinds.bonding ?? kinds.rubber)());
    return palette.get(kind);
  };
  // The flat exterior base, sidewall and steel are replaced by physical versions here.
  printedBase.dispose(); sidewallSource.dispose(); steelSource.dispose();
  const varied = [];
  const group = new THREE.Group();
  group.position.y = -.009;
  const parts = layers.map(layer => {
    let mat = material(layer.material), uvOffset = [0, 0];
    if (Number.isInteger(layer.vary)) {
      // Each core strip gets its own tone and run of grain, like real laminations.
      mat = mat.clone();
      mat.color.multiplyScalar(.92 + ((layer.vary * 7) % 11) * .014);
      remember(mat);
      varied.push(mat);
      uvOffset = [layer.vary * .61, layer.vary * 3.7];
    }
    if (layer.artwork === 'top') mat = [mat, material('topsheetBack')];
    if (layer.artwork === 'base') mat = [mat, material('baseBack')];
    const mesh = new THREE.Mesh(constructionBuffer(layer, {uvOffset}), mat);
    mesh.name = layer.id;
    mesh.userData.key = layer.key;
    group.add(mesh);
    return {mesh, layer, key: layer.key, materials: Array.isArray(mat) ? mat : [mat]};
  });
  const meshes = parts.map(p => p.mesh);
  let lastReveal = 0;
  return {
    group,
    keys: [...new Set(parts.map(p => p.key))],
    reveal(value) {
      lastReveal = value;
      group.visible = value > .0001;
      parts.forEach(({mesh, layer}) => mesh.position.set(...layer.explode.map(e => e * value)));
    },
    pick(raycaster) {
      if (lastReveal < .5) return null;
      const hit = raycaster.intersectObjects(meshes, false)[0];
      return hit ? hit.object.userData.key : null;
    },
    highlight(key) {
      const present = key && parts.some(p => p.key === key);
      parts.forEach(p => p.materials.forEach(m => paint(m, !present ? 'normal' : p.key === key ? 'active' : 'dim')));
    },
    dispose() {
      parts.forEach(({mesh}) => mesh.geometry.dispose());
      palette.forEach(m => m.dispose());
      varied.forEach(m => m.dispose());
      textures.forEach(t => t.dispose());
    },
  };
}
