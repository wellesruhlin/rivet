import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {assetUrl} from '../art-geometry.js';
import {bindingPlacement} from '../bindings.js';

// Matches scripts/pivot/materials.py (sRGB of the Blender study's linear paint and print colors).
const finishes = {
  Black: {paint: '#303235', metalness: 0.6, roughness: 0.48, clearcoat: 0.1, clearcoatRoughness: 0.36, ink: '#242628'},
  Blue: {paint: '#3c8ccd', metalness: 0.85, roughness: 0.28, clearcoat: 0.5, clearcoatRoughness: 0.06, ink: '#f3f6f8'},
  Orange: {paint: '#d15227', metalness: 0.88, roughness: 0.3, clearcoat: 0.55, clearcoatRoughness: 0.06, ink: '#1d1d1e'},
  'Super Edition': {paint: '#d7e216', metalness: 0.15, roughness: 0.34, clearcoat: 0.35, clearcoatRoughness: 0.08, ink: '#273fbf'},
};
function finish(original, colorway) {
  const f = finishes[colorway] ?? finishes.Black;
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
export function createBindingStudy(pivots, canvas, render) {
  let alive = true, ticket = 0, template = null, loading = null, selection = null, shell = null, instances = [], visible = true;
  const disposeAsset = asset => {
    const geometries = new Set(), materials = new Set();
    asset.traverse(o => {if (o.isMesh) {geometries.add(o.geometry); (Array.isArray(o.material) ? o.material : [o.material]).forEach(m => materials.add(m));}});
    geometries.forEach(g => g.dispose()); materials.forEach(m => m.dispose());
  };
  function clear() {
    instances.forEach((instance,i) => {pivots[i].remove(instance); instance.traverse(o => {if (o.isMesh) (Array.isArray(o.material) ? o.material : [o.material]).forEach(m => m.dispose());});});
    instances = []; canvas.dataset.bindingCount = '0';
  }
  function place() {
    if (!shell) return;
    const position = bindingPlacement(shell);
    instances.forEach(group => {group.position.set(position.x,position.y,position.z); group.visible=visible;});
    canvas.dataset.bindingMountMm = String(shell.definition.mountMm);
  }
  return {
    async set(next) {
      const revision = ++ticket; selection = next; clear();
      // The Pivot 13 mounts the Pivot 15 model as a labelled stand-in (its composite toe is not modeled).
      if (!next || !['pivot-15', 'pivot-13'].includes(next.product.id)) {canvas.dataset.bindingStatus = 'none'; render(); return 'none';}
      canvas.dataset.bindingStatus = 'loading'; render();
      try {
        loading ??= new GLTFLoader().loadAsync(assetUrl('models/look-pivot-15.glb')).then(gltf => {
          if (!alive) {disposeAsset(gltf.scene); return null;}
          template = gltf.scene; return template;
        }).catch(error => {loading = null; throw error;});
        const model = await loading;
        if (!alive || revision !== ticket || !model) return 'superseded';
        instances = pivots.map(pivot => {
          const group = model.clone(true);
          group.traverse(o => {if (o.isMesh) {
            const recolor = original => finish(original, selection.color);
            o.material = Array.isArray(o.material) ? o.material.map(recolor) : recolor(o.material);
          }});
          pivot.add(group); return group;
        });
        place(); canvas.dataset.bindingCount = '2'; canvas.dataset.bindingStatus = 'ready'; canvas.dataset.bindingColor = next.color; render();
        return 'ready';
      } catch {
        if (alive && revision === ticket) {canvas.dataset.bindingStatus = 'error'; render(); return 'error';}
        return 'superseded';
      }
    },
    geometry(next) {shell = next; place();},
    visibility(next) {visible = next; instances.forEach(group => {group.visible=next;});},
    dispose() {alive=false; ticket++; clear(); if(template) disposeAsset(template);},
  };
}
