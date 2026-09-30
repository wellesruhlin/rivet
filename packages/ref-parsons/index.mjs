import {defineProduct} from '@arc/configurator/product';
import catalog from './catalog.json' with {type:'json'};
import {tableScene} from './geometry.mjs';
export {catalog};
export const sizes=[{id:'72',length:72,width:38,seats:'6–8'},{id:'84',length:84,width:42,seats:'6–8'},{id:'96',length:96,width:44,seats:'8–10'},{id:'108',length:108,width:44,seats:'8–10'}];
export const finishes=[
  {id:'natural-oak',name:'Natural Oak',family:'Oak',texture:'oak',color:'#cfaf7e',tint:'#e0c9a5',contrast:1},
  {id:'whitened-oak',name:'Whitened Oak',family:'Oak',texture:'oak',color:'#d7cdb9',tint:'#fff9e7',contrast:.64},
  {id:'nordic-oak',name:'Nordic Oak',family:'Oak',texture:'oak',color:'#baae94',tint:'#e0dfd0',contrast:.85},
  {id:'sand-oak',name:'Sand Oak',family:'Oak',texture:'oak',color:'#bda180',tint:'#bbae96',contrast:1},
  {id:'aged-oak',name:'Aged Oak',family:'Oak',texture:'oak',color:'#9a8268',tint:'#a49681',contrast:1.1},
  {id:'golden-oak',name:'Golden Oak',family:'Oak',texture:'oak',color:'#b2824a',tint:'#c6a26a',contrast:1.1},
  {id:'espresso-oak',name:'Espresso Oak',family:'Oak',texture:'oak',color:'#49392d',tint:'#625747',contrast:1.1},
  {id:'blackened-oak',name:'Blackened Oak',family:'Oak',texture:'oak',color:'#292922',tint:'#393d35',contrast:1.15},
  {id:'natural-walnut',name:'Natural Walnut',family:'Walnut',texture:'walnut',color:'#816042',tint:'#ffffff',contrast:1},
  {id:'bourbon-walnut',name:'Bourbon Walnut',family:'Walnut',texture:'walnut',color:'#663a26',tint:'#d4ab85',contrast:1.1},
  {id:'charcoal-walnut',name:'Charcoal Walnut',family:'Walnut',texture:'walnut',color:'#41403a',tint:'#97968f',contrast:1.1},
  {id:'maple',name:'Maple',family:'Maple',texture:'oak',color:'#dac39a',tint:'#f3e3c2',contrast:.3},
];
export const previewLimits={length:{min:48,max:120},width:{min:28,max:48},height:{min:26,max:36}};
export const defaults={size:'72',length:72,width:38,height:30,finish:'natural-walnut'};
const findSize=id=>sizes.find(s=>s.id===id);
export const findFinish=id=>finishes.find(f=>f.id===id);
function normalize(input) {
  const c={...defaults,...input};
  for(const key of ['length','width','height']) c[key]=typeof c[key]==='number'?c[key]:NaN;
  const size=findSize(c.size);
  if(size){c.length=size.length;c.width=size.width;c.height=30;}
  return c;
}
function prepare(previous,patch) {
  const next={...previous,...patch};
  if(['length','width','height'].some(k=>Object.hasOwn(patch,k))) next.size='custom';
  return next;
}
function validate(c) {
  const issues=[];
  if(!findSize(c.size)&&c.size!=='custom') issues.push({field:'size',message:'Choose a listed size or Custom dimensions.'});
  if(!findFinish(c.finish)) issues.push({field:'finish',message:'Choose one of the published finishes.'});
  for(const [field,limit] of Object.entries(previewLimits)) if(!Number.isFinite(c[field])||c[field]<limit.min||c[field]>limit.max||Math.abs(c[field]*4-Math.round(c[field]*4))>1e-8) issues.push({field,message:`${field}: use quarter-inch steps from ${limit.min} to ${limit.max} in for this preview.`});
  return issues;
}
function price(c) {
  const common={currency:'CAD',source:catalog.source,observed:catalog.observed,excludes:['tax','shipping'],notice:'Published reference only. Maker confirmation required; no order is placed.'};
  if(c.size==='custom') return {...common,status:'requires-quote',lines:[],variantId:null,notice:'Custom dimensions require a maker quote. No custom price has been inferred.'};
  const v=catalog.variants.find(v=>v.size===c.size&&v.finish===c.finish);
  if(!v||!v.available) return {...common,status:'requires-quote',lines:[],variantId:null,notice:'Availability needs maker confirmation.'};
  return {...common,status:'reference',variantId:v.id,lines:[{id:v.id,label:`Parsons · ${c.length} × ${c.width} in · ${findFinish(c.finish).name}`,amountMinor:v.priceMinor,quantity:1}]};
}
function describe(c) {
  const finish=findFinish(c.finish);
  return [{label:'Maker',value:'ref.'},{label:'Product',value:'Parsons Dining Table'},{label:'Dimensions',value:`${c.length} × ${c.width} × ${c.height} in`},{label:'Finish',value:finish.name},{label:'Wood',value:finish.family},{label:'Surface finish',value:'3% matte polyurethane'},{label:'Apparent edge',value:'3 in, mitered'},{label:'Corner legs',value:'4 × 4 in'},{label:'Size status',value:c.size==='custom'?'Custom request; feasibility unconfirmed':'Published standard size'}];
}
function scene(config) {
  const finish=findFinish(config.finish);
  return {...tableScene(config),productVersion:catalog.version,source:catalog.source,materials:{
    wood:{label:finish.name,type:'physical',texture:`public/materials/${finish.texture}.png`,color:finish.texture==='oak'?finish.color:finish.tint,neutralGrain:finish.texture==='oak',grainContrast:finish.contrast,roughness:.73,metalness:0},
    steel:{label:'Steel reinforcement',type:'physical',color:'#303530',roughness:.44,metalness:.72},
  }};
}
export const tableProduct=defineProduct({id:'ref-parsons',version:catalog.version,title:'ref. Parsons Dining Table',defaults,normalize,prepare,validate,price,describe,scene});
