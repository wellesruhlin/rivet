import * as THREE from 'three';
import {generateConstruction} from '@rivet/brand-on3p/construction';
import {surfaceMaps} from './construction-materials.js';

// Legend groups in stack order, top to bottom. Every layer mesh maps to one of these.
export const LAYER_KEYS = ['topsheet', 'composite', 'binding', 'insert', 'core', 'sidewall', 'rubber', 'base', 'edges'];
export function layerKey(id) {
  if (id === 'topsheet') return 'topsheet';
  if (id.endsWith('composite')) return 'composite';
  if (id === 'binding-mat') return 'binding';
  if (id === 'insert') return 'insert';
  if (id.startsWith('core-')) return 'core';
  if (id.startsWith('sidewall-')) return 'sidewall';
  if (id.startsWith('vds-')) return 'rubber';
  if (id.startsWith('edge-')) return 'edges';
  return 'base';
}
// Browser presentation only: pull the sidewalls well clear of the core so the core
// reads unobstructed. The shared generator's explode vectors stay as they are (the
// Blender lab uses the same file).
const SPREAD = {sidewall: side => [side * .052, -.012, 0]};

// Printed faces keep the artwork UVs; every other face is box-mapped in 24 mm units
// with v along the ski, so grain, tows and brushing follow the length on all faces.
export function constructionBuffer(layer, {uvOffset = [0, 0]} = {}) {
  const positions = [], uvs = [];
  const geometry = new THREE.BufferGeometry();
  const artwork = ['topsheet', 'base'].includes(layer.material);
  const a = new THREE.Vector3(), b = new THREE.Vector3(), c = new THREE.Vector3(), n = new THREE.Vector3();
  layer.faces.forEach((face, fi) => {
    const start = positions.length / 3;
    const printed = artwork && fi < layer.faces.length - 2 && fi % 4 === (layer.material === 'base' ? 0 : 2);
    a.fromArray(layer.positions[face[0]]); b.fromArray(layer.positions[face[1]]); c.fromArray(layer.positions[face[2]]);
    n.subVectors(b, a).cross(c.clone().sub(a));
    const [ax, ay, az] = [Math.abs(n.x), Math.abs(n.y), Math.abs(n.z)];
    const box = p => ay >= ax && ay >= az ? [p[0], p[2]] : ax >= az ? [p[1], p[2]] : [p[0], p[1]];
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

export function createConstructionStudy(shell, layup, {wood, exterior, anisotropy, envMap = null}) {
  const data = generateConstruction(shell, layup, {wood});
  const textures = [];
  const maps = (kind, options) => {
    const set = surfaceMaps(kind, anisotropy, options);
    Object.values(set).forEach(t => t && textures.push(t));
    return set;
  };
  const physical = params => remember(new THREE.MeshPhysicalMaterial({envMap, ...params}));
  const woodMaterial = (kind, coat) => {
    const m = maps(kind);
    return physical({color: 0xffffff, ...m, normalScale: new THREE.Vector2(.35, .35), roughness: 1, clearcoat: coat, clearcoatRoughness: .45, envMapIntensity: .3});
  };
  const steel = maps('steel', {color: false}), scalium = maps('scalium', {color: false}), side = maps('sidewall', {color: false}), grind = maps('grind', {color: false});
  const [topsheet, printedBase, sidewallSource, steelSource] = exterior;
  topsheet.envMap = envMap; topsheet.envMapIntensity = .3; remember(topsheet);
  const palette = {
    topsheet,
    base: physical({map: printedBase.map, color: printedBase.color, roughness: .44, normalMap: grind.normalMap, normalScale: new THREE.Vector2(.15, .15), clearcoat: .2, clearcoatRoughness: .35, envMapIntensity: .35}),
    sidewall: physical({color: sidewallSource.color, normalMap: side.normalMap, normalScale: new THREE.Vector2(.25, .25), roughnessMap: side.roughnessMap, roughness: 1, clearcoat: .35, clearcoatRoughness: .22, sheen: .3, sheenRoughness: .45, sheenColor: 0xffffff, envMapIntensity: .4}),
    steel: physical({color: 0xc6cbcf, metalness: 1, roughness: 1, roughnessMap: steel.roughnessMap, normalMap: steel.normalMap, normalScale: new THREE.Vector2(.2, .2), anisotropy: .55, anisotropyRotation: Math.PI / 2, envMapIntensity: .8}),
    bamboo: woodMaterial('bamboo', .18), paulownia: woodMaterial('paulownia', .12), mounting: woodMaterial('mounting', .3),
    composite: physical({color: 0xffffff, ...maps('composite'), normalScale: new THREE.Vector2(.55, .55), roughness: 1, clearcoat: .6, clearcoatRoughness: .16, envMapIntensity: .45}),
    binding: physical({color: 0xffffff, ...maps('binding'), normalScale: new THREE.Vector2(.45, .45), roughness: 1, clearcoat: .35, clearcoatRoughness: .25, envMapIntensity: .35}),
    rubber: physical({color: 0xffffff, ...maps('rubber'), normalScale: new THREE.Vector2(.6, .6), roughness: 1, sheen: .7, sheenRoughness: .55, sheenColor: 0x6a7076, envMapIntensity: .2}),
    scalium: physical({color: 0xb4babf, metalness: 1, roughness: 1, roughnessMap: scalium.roughnessMap, normalMap: scalium.normalMap, normalScale: new THREE.Vector2(.3, .3), anisotropy: .5, anisotropyRotation: Math.PI / 2, envMapIntensity: .65}),
    topsheetBack: wood ? woodMaterial('mounting', .1) : physical({color: 0x9a9d95, ...maps('bonding', {color: false}), roughness: 1, envMapIntensity: .3}),
    baseBack: physical({color: 0xffffff, ...maps('bonding'), roughness: 1, envMapIntensity: .3}),
  };
  // The flat exterior base, sidewall and steel are replaced by physical versions here.
  printedBase.dispose(); sidewallSource.dispose(); steelSource.dispose();
  const stripMaterials = [];
  const group = new THREE.Group();
  group.position.y = -.009;
  const parts = data.layers.map(layer => {
    const key = layerKey(layer.id);
    let material = palette[layer.material], uvOffset = [0, 0];
    if (layer.id.startsWith('core-')) {
      const strip = Number(layer.id.split('-')[1]);
      material = material.clone();
      material.color.multiplyScalar(.92 + ((strip * 7) % 11) * .014);
      remember(material);
      stripMaterials.push(material);
      uvOffset = [strip * .61, strip * 3.7];     // each strip shows its own run of grain
    }
    if (layer.material === 'topsheet') material = [material, palette.topsheetBack];
    if (layer.material === 'base') material = [material, palette.baseBack];
    const mesh = new THREE.Mesh(constructionBuffer(layer, {uvOffset}), material);
    mesh.name = layer.id;
    mesh.userData.key = key;
    group.add(mesh);
    const spread = SPREAD[key]?.(layer.id.includes('--1') ? -1 : 1) ?? [0, 0, 0];   // ids: sidewall--1 / sidewall-1
    return {mesh, layer, key, spread, materials: Array.isArray(material) ? material : [material]};
  });
  const meshes = parts.map(p => p.mesh);
  let lastReveal = 0;
  return {
    group, data,
    keys: [...new Set(parts.map(p => p.key))],
    reveal(value) {
      lastReveal = value;
      group.visible = value > .0001;
      parts.forEach(({mesh, layer, spread}) => mesh.position.set(...layer.explode.map((e, i) => (e + spread[i]) * value)));
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
      Object.values(palette).forEach(material => material.dispose());
      stripMaterials.forEach(material => material.dispose());
      textures.forEach(texture => texture.dispose());
    },
  };
}
