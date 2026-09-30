import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {mountPoint} from '@arc/ski-geometry';

// Paint and print colors for the Blender LOOK Pivot 15 study (sRGB of the study's linear
// colors; see the ON3P workspace's scripts/pivot/materials.py). Colorways the study was
// not rendered in (White / Black, CAST Purple, Black Metal Raw) are approximations.
export const BINDING_FINISHES = {
  Black: {paint: '#303235', metalness: 0.6, roughness: 0.48, clearcoat: 0.1, clearcoatRoughness: 0.36, ink: '#242628'},
  Blue: {paint: '#3c8ccd', metalness: 0.85, roughness: 0.28, clearcoat: 0.5, clearcoatRoughness: 0.06, ink: '#f3f6f8'},
  Orange: {paint: '#d15227', metalness: 0.88, roughness: 0.3, clearcoat: 0.55, clearcoatRoughness: 0.06, ink: '#1d1d1e'},
  'Super Edition': {paint: '#d7e216', metalness: 0.15, roughness: 0.34, clearcoat: 0.35, clearcoatRoughness: 0.08, ink: '#273fbf'},
  White: {paint: '#e9e9e6', metalness: 0.05, roughness: 0.38, clearcoat: 0.4, clearcoatRoughness: 0.1, ink: '#1b1c1e'},
  Purple: {paint: '#5b3f9e', metalness: 0.85, roughness: 0.3, clearcoat: 0.5, clearcoatRoughness: 0.08, ink: '#eeeaf6'},
  Raw: {paint: '#8e9296', metalness: 0.95, roughness: 0.34, clearcoat: 0.05, clearcoatRoughness: 0.3, ink: '#1c1d1f'},
};
function finish(original, colorway) {
  const f = BINDING_FINISHES[colorway] ?? BINDING_FINISHES.Black;
  const m = original.clone();
  if (m.name === 'Pivot_Paint') {
    m.color.set(f.paint);
    m.metalness = f.metalness;
    m.roughness = f.roughness;
    if ('clearcoat' in m) {m.clearcoat = f.clearcoat; m.clearcoatRoughness = f.clearcoatRoughness;}
  } else if (m.name === 'Pivot_Ink') {
    m.color.set(f.ink);
  }
  return m;
}

/** Mounts the binding model on both skis. `set({colorway})` or `set(null)` for skis only. */
export function createBindingStudy(pivots, canvas, render, url) {
  let alive = true, ticket = 0, shell = null, instances = [], visible = true;
  const assets = new Map();
  const disposeAsset = asset => {
    const geometries = new Set(), materials = new Set();
    asset.traverse(o => {if (o.isMesh) {geometries.add(o.geometry); (Array.isArray(o.material) ? o.material : [o.material]).forEach(m => materials.add(m));}});
    geometries.forEach(g => g.dispose()); materials.forEach(m => m.dispose());
  };
  function clear() {
    instances.forEach((instance, i) => {pivots[i].remove(instance); instance.traverse(o => {if (o.isMesh) (Array.isArray(o.material) ? o.material : [o.material]).forEach(m => m.dispose());});});
    instances = [];
    canvas.dataset.bindingCount = '0';
  }
  function place() {
    if (!shell) return;
    const position = mountPoint(shell);
    instances.forEach(group => {group.position.set(position.x, position.y, position.z); group.visible = visible;});
    canvas.dataset.bindingMountMm = String(shell.definition.mountMm);
  }
  return {
    async set(next) {
      const revision = ++ticket;
      clear();
      if (!next) {canvas.dataset.bindingStatus = 'none'; render(); return 'none';}
      canvas.dataset.bindingStatus = 'loading';
      render();
      try {
        const source = next.url || url;
        if (!source) throw new Error('No binding asset specified');
        if (!assets.has(source)) {
          const entry = {model: null, loading: null};
          entry.loading = new GLTFLoader().loadAsync(source).then(gltf => {
            if (!alive) {disposeAsset(gltf.scene); return null;}
            entry.model = gltf.scene;
            return entry.model;
          }).catch(error => {assets.delete(source); throw error;});
          assets.set(source, entry);
        }
        const model = await assets.get(source).loading;
        if (!alive || revision !== ticket || !model) return 'superseded';
        instances = pivots.map(pivot => {
          const group = model.clone(true);
          group.traverse(o => {if (o.isMesh) {
            const recolor = original => finish(original, next.colorway);
            o.material = Array.isArray(o.material) ? o.material.map(recolor) : recolor(o.material);
          }});
          pivot.add(group);
          return group;
        });
        place();
        canvas.dataset.bindingCount = '2';
        canvas.dataset.bindingStatus = 'ready';
        canvas.dataset.bindingColor = next.colorway;
        canvas.dataset.bindingAsset = source;
        render();
        return 'ready';
      } catch {
        if (alive && revision === ticket) {canvas.dataset.bindingStatus = 'error'; render(); return 'error';}
        return 'superseded';
      }
    },
    geometry(next) {shell = next; place();},
    visibility(next) {visible = next; instances.forEach(group => {group.visible = next;});},
    dispose() {alive = false; ticket++; clear(); assets.forEach(entry => {if (entry.model) disposeAsset(entry.model);}); assets.clear();},
  };
}
