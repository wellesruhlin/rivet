// ON3P as an order-side product for Maker Studio: the engine's rules become the product's
// validation, change and price contract; the scene is the traced 3D pair.
import {engineProduct} from '@rivet/configurator/product/engine';
import {engine} from './index.js';
import {catalog, compatibility} from './rules.js';
import {configuredGeometry, configuredMesh} from './geometry/configured.js';

export const skiProduct = engineProduct(engine, {
  id: 'on3p-custom-ski',
  version: String(catalog.specVersion || '2026-09-24'),
  title: 'ON3P Custom Skis',
  source: compatibility.source,
  observed: compatibility.observed,
  notice: 'Independent fan prototype; published reference pricing. No order has been placed.',
  scene: config => {
    const resolved = configuredGeometry(config);
    if (!resolved) return {schemaVersion: 1, units: 'm', upAxis: 'Y', productId: 'on3p-custom-ski', parts: [], notes: ['No derived geometry is available for this selection.']};
    const mesh = configuredMesh(resolved);
    return {
      schemaVersion: 1, units: 'm', upAxis: 'Y', productId: 'on3p-custom-ski', config: {...config},
      parts: [-1, 1].map((side, i) => ({id: `ski-${i}`, label: i ? 'Right ski' : 'Left ski', material: 'ski-surfaces', materialSlots: ['topsheet', 'base', 'sidewall', 'steel'], faceMaterials: mesh.materials, mesh: {positions: mesh.positions.map(([x, y, z]) => [x + side * .09, y, z]), faces: mesh.faces, uvs: mesh.uvs}, explode: [0, 0, 0]})),
      notes: ['Published envelope dimensions; rocker and thickness include image-derived estimates.'],
    };
  },
});
