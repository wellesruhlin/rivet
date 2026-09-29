import {defineProduct} from '@maker/configurator-core';
import {catalog, compatibility, defaultConfig, normalizeConfig, prepareSkiChange, shapeReady, bomLines} from './config.js';
import {configuredGeometry, configuredMesh} from './geometry/configured.js';

// Existing ski presentation remains family-specific; configuration, quoting,
// snapshots and scene export now implement the same product contract as tables.
export const skiProduct=defineProduct({
  id:'on3p-custom-ski',version:String(catalog.specVersion||'2026-09-24'),title:'ON3P Custom Skis',defaults:defaultConfig,
  normalize:normalizeConfig,prepare:prepareSkiChange,validate:()=>[],
  price:c=>({currency:'USD',status:shapeReady(c)?'reference':'incomplete',source:compatibility.source,observed:compatibility.observed,lines:bomLines(c).map(line=>({id:line.key,label:line.label,amountMinor:Math.round(line.price*100),quantity:1})),notice:'Independent fan prototype; published reference pricing. No order has been placed.'}),
  describe:c=>bomLines(c).map(line=>({label:line.label,value:line.value})),
  scene:c=>{
    const resolved=configuredGeometry(c);
    if(!resolved)return {schemaVersion:1,units:'m',upAxis:'Y',productId:'on3p-custom-ski',parts:[],notes:['No derived geometry is available for this selection.']};
    const mesh=configuredMesh(resolved);
    return {schemaVersion:1,units:'m',upAxis:'Y',productId:'on3p-custom-ski',config:{...c},parts:[-1,1].map((side,i)=>({id:`ski-${i}`,label:i?'Right ski':'Left ski',material:'ski-surfaces',materialSlots:['topsheet','base','sidewall','steel'],faceMaterials:mesh.materials,mesh:{positions:mesh.positions.map(([x,y,z])=>[x+side*.09,y,z]),faces:mesh.faces,uvs:mesh.uvs},explode:[0,0,0]})),notes:['Published envelope dimensions; rocker and thickness include image-derived estimates.']};
  },
});
