import {defineProduct} from '@maker/configurator-core';
import {recipeScene} from './geometry.mjs';

export const TEMPLATE_NAMES={parsons:'Corner-leg table',pedestal:'Round pedestal'};
export const MATERIAL_TEXTURES=['oak','walnut'];
const idPattern=/^[a-z][a-z0-9-]{1,63}$/;
const confidenceValues=['published','photo-derived','estimated','workspace'];
const safeURL=value=>{try{const u=new URL(value);return ['https:','http:'].includes(u.protocol)&&!u.username&&!u.password;}catch{return false;}};
const finite=(n,min,max)=>typeof n==='number'&&Number.isFinite(n)&&n>=min&&n<=max;
export function validateRecipe(r) {
  const issues=[];const add=(field,message)=>issues.push({field,message});
  if(!r||typeof r!=='object'||Array.isArray(r))return [{field:'recipe',message:'Recipe must be an object.'}];
  const object=v=>!!v&&typeof v==='object'&&!Array.isArray(v);
  for(const key of ['sources','sizes','finishes','baseFinishes','rules'])if(!Array.isArray(r[key])||r[key].some(v=>!object(v)))add(key,`${key} must be a list of records.`);
  for(const key of ['geometry','limits','defaults','camera','pricing'])if(!object(r[key]))add(key,`${key} must be an object.`);
  if(!Array.isArray(r.pricing?.variants)||r.pricing.variants.some(v=>!object(v)))add('pricing.variants','Variants must be a list of records.');
  if(issues.length)return issues;
  if(r.schemaVersion!==1)add('schemaVersion','Use recipe schema version 1.');
  if(typeof r.id!=='string'||!idPattern.test(r.id))add('id','Use a product ID with lowercase letters, numbers and hyphens.');
  for(const k of ['title','maker'])if(typeof r[k]!=='string'||!r[k].trim()||r[k].length>100)add(k,`${k} is required (up to 100 characters).`);
  if(!Object.hasOwn(TEMPLATE_NAMES,r.template))add('template','Choose a supported geometry template.');
  if(!['USD','CAD','EUR','GBP'].includes(r.currency))add('currency','Choose a supported currency.');
  if(!Array.isArray(r.sources)||!r.sources.length||r.sources.length>20)add('sources','Provide between one and twenty source records.');
  else for(const [i,s] of r.sources.entries())if(typeof s.label!=='string'||!s.label.trim()||s.label.length>160||typeof s.url!=='string'||!safeURL(s.url)||!/^\d{4}-\d{2}-\d{2}$/.test(s.observed))add(`sources.${i}`,'Each source needs a label, http(s) URL and observed date.');
  for(const key of ['height','topThickness','edgeDepth','legWidth','baseDiameter','columnDiameter','baseThickness']){
    const v=r.geometry?.[key];if(!v||!finite(v.value,.05,key==='height'?60:60)||!confidenceValues.includes(v.confidence))add(`geometry.${key}`,`${key} needs a positive inch measurement and evidence status.`);
  }
  if(r.geometry?.topThickness?.value>=r.geometry?.height?.value)add('geometry.topThickness','The top must be thinner than the full table height.');
  if(r.geometry?.edgeDepth?.value<r.geometry?.topThickness?.value)add('geometry.edgeDepth','Apparent edge depth must be at least the slab thickness.');
  if(r.template==='parsons'&&r.geometry?.edgeDepth?.value>=r.geometry?.height?.value)add('geometry.edgeDepth','Apparent edge depth must be less than the full table height.');
  if(r.geometry?.columnDiameter?.value>=r.geometry?.baseDiameter?.value)add('geometry.columnDiameter','The pedestal column must be narrower than its base.');
  if(r.template==='pedestal'&&r.geometry?.topThickness?.value+r.geometry?.baseThickness?.value+.4>=r.geometry?.height?.value)add('geometry.height','Leave positive height for the pedestal column.');
  if(!finite(r.geometry?.height?.value,12,60))add('geometry.height','Table height must be between 12 and 60 inches.');
  if(!Array.isArray(r.sizes)||!r.sizes.length||r.sizes.length>20)add('sizes','Add between one and twenty standard sizes.');
  else {const ids=new Set();for(const [i,s] of r.sizes.entries()){
    if(typeof s.id!=='string'||!s.id||s.id.length>64||s.id==='custom'||ids.has(s.id))add(`sizes.${i}`,'Size IDs must be unique and cannot be custom.');ids.add(s.id);
    if(!finite(s.length,12,160)||!finite(s.width,12,72))add(`sizes.${i}`,'Standard dimensions must be within the supported visualization range.');
    if(r.template==='pedestal'&&s.length!==s.width)add(`sizes.${i}`,'Round-table length and width must match.');
    if(r.template==='parsons'&&Math.min(s.length,s.width)<=2*r.geometry?.legWidth?.value)add(`sizes.${i}`,'Table dimensions must allow space between corner legs.');
  }}
  for(const key of ['length','width','height']){const limit=r.limits?.[key];if(!limit||!finite(limit.min,12,160)||!finite(limit.max,12,160)||limit.max<limit.min||![.25,.5,1].includes(limit.step))add(`limits.${key}`,'Preview limits need a valid min/max and quarter-, half- or one-inch step.');}
  for(const key of ['finishes','baseFinishes']){
    const list=r[key];if(!Array.isArray(list)||!list.length||list.length>32){add(key,`Add between one and 32 ${key}.`);continue;}
    const ids=new Set();for(const [i,m] of list.entries()){
      if(typeof m.id!=='string'||!idPattern.test(m.id)||ids.has(m.id))add(`${key}.${i}`,'Material IDs must be unique lowercase slugs.');ids.add(m.id);
      if(typeof m.name!=='string'||!m.name.trim()||m.name.length>80||!/^#[\da-f]{6}$/i.test(m.color))add(`${key}.${i}`,'Material needs a name and hex color.');
      if(!['wood','powder','steel'].includes(m.kind)||!finite(m.roughness,.1,1)||!finite(m.grainScale,.25,4)||!finite(m.grainStrength,0,1.5))add(`${key}.${i}`,'Material settings are outside supported ranges.');
      if(m.kind==='wood'&&!MATERIAL_TEXTURES.includes(m.texture))add(`${key}.${i}`,'Choose a local wood texture.');
    }
  }
  if(!['reference','quote'].includes(r.pricing?.mode))add('pricing.mode','Choose reference pricing or quote required.');
  if(!Array.isArray(r.pricing?.variants)||r.pricing.variants.length>1000)add('pricing.variants','Variant catalog is invalid or too large.');
  else{const keys=new Set();for(const [i,v] of r.pricing.variants.entries()){
    if(!['string','number'].includes(typeof v.id)||!v.dimensions||!['length','width','height'].every(k=>finite(v.dimensions[k],12,160)))add(`pricing.variants.${i}`,'Variant needs an ID and its original reference dimensions.');
    const key=[v.size,v.finish,v.baseFinish].join('|');if(keys.has(key))add(`pricing.variants.${i}`,'Duplicate variant combination.');keys.add(key);
    if(v.amountMinor!==null&&(!Number.isSafeInteger(v.amountMinor)||v.amountMinor<=0||v.amountMinor>100000000))add(`pricing.variants.${i}`,'Reference prices must be positive integer minor units; unknown prices are null.');
    if(!r.sizes?.some(s=>s.id===v.size)||!r.finishes?.some(f=>f.id===v.finish)||!r.baseFinishes?.some(f=>f.id===v.baseFinish))add(`pricing.variants.${i}`,'Variant refers to an option that does not exist.');
  }}
  if(!Array.isArray(r.rules)||r.rules.length>100)add('rules','Compatibility rules must be a list of at most 100 exclusions.');
  else for(const rule of r.rules)if(!r.finishes?.some(f=>f.id===rule.finish)||!r.baseFinishes?.some(f=>f.id===rule.baseFinish)||typeof rule.reason!=='string'||!rule.reason.trim())add('rules','Each exclusion needs existing finish/base choices and a reason.');
  if(!r.sizes?.some(s=>s.id===r.defaults?.size)||!r.finishes?.some(f=>f.id===r.defaults?.finish)||!r.baseFinishes?.some(f=>f.id===r.defaults?.baseFinish))add('defaults','Defaults must refer to existing options.');
  if(r.rules?.some(rule=>rule.finish===r.defaults?.finish&&rule.baseFinish===r.defaults?.baseFinish))add('defaults','The default finish combination is excluded by a compatibility rule.');
  if(typeof r.notes!=='string'||!r.notes.trim()||r.notes.length>4000)add('notes','Include an accuracy note (up to 4,000 characters).');
  for(const k of ['yaw','elevation','distance'])if(!finite(r.camera?.[k],k==='yaw'?-180:k==='elevation'?15:.8,k==='yaw'?180:k==='elevation'?75:1.8))add(`camera.${k}`,'Camera settings are outside supported ranges.');
  return issues;
}
export function assertRecipe(recipe){const issues=validateRecipe(recipe);if(issues.length){const error=new Error(issues.map(i=>i.message).join(' '));error.status=422;error.issues=issues;throw error;}return recipe;}
export function compileRecipe(input,{version=input.version||'draft'}={}){
  const r=structuredClone(assertRecipe(input));
  r.version=String(version);
  const selected=r.sizes.find(s=>s.id===r.defaults.size);
  const defaults={size:selected.id,length:selected.length,width:selected.width,height:r.geometry.height.value,finish:r.defaults.finish,baseFinish:r.defaults.baseFinish};
  const findSize=id=>r.sizes.find(s=>s.id===id),finish=id=>r.finishes.find(f=>f.id===id),base=id=>r.baseFinishes.find(f=>f.id===id);
  function normalize(input){const c={...defaults,...input},s=findSize(c.size);if(s){c.length=s.length;c.width=s.width;c.height=r.geometry.height.value;}if(r.template==='pedestal')c.width=c.length;return c;}
  function validate(c){const issues=[];const add=(field,message)=>issues.push({field,message});if(!findSize(c.size)&&c.size!=='custom')add('size','Choose a listed size or Custom.');if(!finish(c.finish))add('finish','Choose a listed top finish.');if(!base(c.baseFinish))add('baseFinish','Choose a listed base finish.');
    for(const key of ['length','width','height']){const n=c[key],l=r.limits[key];if(!finite(n,12,160))add(key,`Invalid ${key}.`);else if(c.size==='custom'&&(n<l.min||n>l.max||Math.abs(n/l.step-Math.round(n/l.step))>1e-7))add(key,`${key}: use ${l.step}-inch steps between ${l.min} and ${l.max}.`);}
    if(r.template==='parsons'&&Math.min(c.length,c.width)<=2*r.geometry.legWidth.value)add('length','Dimensions leave no space between corner legs.');
    if(c.height<=r.geometry.topThickness.value+r.geometry.baseThickness.value)add('height','The selected height is too small for this construction.');
    for(const rule of r.rules)if(rule.finish===c.finish&&rule.baseFinish===c.baseFinish)add('baseFinish',rule.reason);
    return issues;
  }
  const product=defineProduct({id:r.id,version,title:`${r.maker} ${r.title}`,defaults,normalize,
    prepare:(prev,patch)=>({...prev,...patch,...(['length','width','height'].some(k=>Object.hasOwn(patch,k))?{size:'custom'}:{})}),validate,
    price:c=>{const common={currency:r.currency,source:r.sources[0].url,observed:r.sources[0].observed,excludes:['tax','shipping'],notice:r.pricing.provenance==='workspace'?'Workspace reference; unapproved by the maker.':'Published reference snapshot; maker confirmation required.'};
      const v=r.pricing.variants.find(v=>v.size===c.size&&v.finish===c.finish&&v.baseFinish===c.baseFinish);
      const matched=v&&['length','width','height'].every(key=>v.dimensions?.[key]===c[key]);
      if(r.pricing.mode==='quote'||Object.values(r.geometry).some(g=>g.confidence==='workspace')||c.size==='custom'||!matched||v.amountMinor===null||v.available===false)return {...common,status:'requires-quote',variantId:null,lines:[],notice:'Maker quote required. No price inferred from placeholder values or altered dimensions.'};
      return {...common,status:'reference',variantId:v.id,lines:[{id:v.id,label:`${r.title} · ${c.length} × ${c.width} in · ${finish(c.finish).name}`,quantity:1,amountMinor:v.amountMinor}]};},
    describe:c=>[{label:'Maker',value:r.maker},{label:'Product',value:r.title},{label:'Dimensions',value:r.template==='pedestal'?`Ø ${c.length} × ${c.height} in`:`${c.length} × ${c.width} × ${c.height} in`},{label:'Top finish',value:finish(c.finish).name},{label:'Base finish',value:r.template==='parsons'?'Matches top':base(c.baseFinish).name},{label:'Height evidence',value:r.geometry.height.confidence},{label:'Geometry',value:TEMPLATE_NAMES[r.template]},{label:'Status',value:c.size==='custom'?'Custom request; feasibility unconfirmed':'Catalog size; confirm with maker'}],
    scene:c=>recipeScene(r,c),
  });
  return product;
}
