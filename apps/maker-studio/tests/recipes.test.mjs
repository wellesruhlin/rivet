import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,readFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {join} from 'node:path';
import {compileRecipe,validateRecipe} from '../packages/product-recipes/index.mjs';
import {cylinderMesh} from '../packages/product-recipes/geometry.mjs';
import seeds from '../packages/product-recipes/seeds.json' with {type:'json'};
import {tableProduct} from '@maker/ref-parsons';
import {inspectScene} from '@maker/configurator-core/geometry';
import {encodeConfiguration,decodeConfiguration} from '@maker/configurator-core';
import {createRecipeStore} from '../server/recipe-store.mjs';
import {createApp} from '../server/app.mjs';
const [parsons,bistro]=seeds;
const temp=()=>mkdtemp(fileURLToPath(new URL('../../../work/product-studio/test-',import.meta.url)));
test('recipes compile without changing the original Parsons catalog behavior',()=>{
 const p=compileRecipe(parsons);assert.deepEqual(validateRecipe(parsons),[]);
 for(const v of parsons.pricing.variants){const c={...p.defaults,size:v.size,finish:v.finish};assert.equal(p.evaluate(c).quote.totalMinor,tableProduct.evaluate({size:v.size,finish:v.finish}).quote.totalMinor);}
});
test('all 88 Bistro combinations preserve source variant IDs and require quotes',async()=>{
 const p=compileRecipe(bistro),ids=new Set();assert.equal(bistro.pricing.variants.length,88);
 for(const file of ['vft-bistro-green.json','template-for-round-2025-copy.json','bistro-metal-round-oxblood-red.json','bistro-metal-round-white.json']){const raw=JSON.parse(await readFile(new URL('../reference/vft-bistro/'+file,import.meta.url)));raw.variants.forEach(v=>ids.add(String(v.id)));}
 for(const v of bistro.pricing.variants){assert.ok(ids.has(v.id));const result=p.evaluate({...p.defaults,size:v.size,finish:v.finish,baseFinish:v.baseFinish});assert.equal(result.quote.totalMinor,null);assert.equal(result.quote.status,'requires-quote');}
});
test('round custom dimensions stay synchronized; invalid dimensions and exclusions fail',()=>{
 const p=compileRecipe(bistro),c=p.change(p.defaults,{length:40.25,height:30}).config;assert.equal(c.width,40.25);assert.equal(c.size,'custom');assert.equal(p.evaluate(c).quote.totalMinor,null);
 for(const value of [40.13,NaN,-1,Infinity,'36',100])assert.throws(()=>p.change(c,{length:value}));
 const r=structuredClone(bistro);r.rules.push({finish:'walnut',baseFinish:r.defaults.baseFinish,reason:'Workspace exclusion'});assert.throws(()=>compileRecipe(r).evaluate({...p.defaults,finish:'walnut'}),/Workspace exclusion/);
 assert.deepEqual(decodeConfiguration(p,encodeConfiguration(p,c)),c);
});
test('edited reference dimensions cannot silently inherit published prices',()=>{
 const r=structuredClone(parsons);r.sizes[0].length+=.25;const p=compileRecipe(r);assert.equal(p.evaluate({...p.defaults,size:r.sizes[0].id}).quote.totalMinor,null);
 r.geometry.height.value+=.25;assert.equal(compileRecipe(r).evaluate(p.defaults).quote.totalMinor,null);
});
test('invalid and malformed recipes return validation issues rather than executing arbitrary assets',()=>{
 for(const patch of [{sizes:null},{finishes:3},{rules:{}},{geometry:null},{notes:42},{sources:[null]},{sources:[{label:{},url:'https://example.com',observed:'2026-09-24'}]},{pricing:{mode:'quote',variants:[null]}},{defaults:[]},{id:undefined}]){
  const r={...structuredClone(bistro),...patch};assert.ok(validateRecipe(r).length);assert.throws(()=>compileRecipe(r),e=>e.status===422);
 }
 const r=structuredClone(bistro);r.finishes[0].texture='../../secret';assert.ok(validateRecipe(r).length);
 r.finishes[0].texture='oak';r.sources[0].url='javascript:alert(1)';assert.ok(validateRecipe(r).length);
});
test('round mesh has finite UVs, outward face winding and accurate size envelopes',()=>{
 const p=compileRecipe(bistro);
 for(const size of [24,36,48]){const scene=p.scene({...p.defaults,size:'custom',length:size,width:size,height:29});assert.equal(inspectScene(scene).parts,4);const positions=scene.parts.flatMap(part=>part.mesh.positions);const max=i=>Math.max(...positions.map(v=>v[i])),min=i=>Math.min(...positions.map(v=>v[i]));assert.ok(Math.abs(max(0)-min(0)-size*.0254)<1e-6);assert.ok(Math.abs(max(1)-min(1)-29*.0254)<1e-6);}
 const mesh=cylinderMesh(.5,.1);for(const face of mesh.faces){const [a,b,c]=face.map(i=>mesh.positions[i]),u=b.map((v,i)=>v-a[i]),v=c.map((v,i)=>v-a[i]),cross=[u[1]*v[2]-u[2]*v[1],u[2]*v[0]-u[0]*v[2],u[0]*v[1]-u[1]*v[0]];const n=mesh.normals[face[0]];assert.ok(cross.reduce((sum,x,i)=>sum+x*n[i],0)>0);}
});
test('material and construction changes flow into a category-independent scene contract',()=>{
 const r=structuredClone(bistro),p=compileRecipe(r),before=p.scene(p.defaults);r.baseFinishes[0].color='#112233';r.finishes[0].grainScale=2;r.geometry.topThickness.value=1.5;r.geometry.edgeDepth.value=1.5;const after=compileRecipe(r).scene(p.defaults);assert.equal(after.materials.base.color,'#112233');assert.equal(after.materials.wood.grainScale,2);assert.notEqual(after.geometryKey,before.geometryKey);
});
test('invalid construction cannot produce a publishable default configuration',()=>{
 for(const value of [.1,80]){const r=structuredClone(bistro);r.geometry.height.value=value;assert.throws(()=>compileRecipe(r),e=>e.status===422);}
 const r=structuredClone(bistro);r.geometry.baseThickness.value=28;assert.throws(()=>compileRecipe(r),e=>e.status===422);
 const p=structuredClone(parsons);p.geometry.edgeDepth.value=35;assert.throws(()=>compileRecipe(p),e=>e.status===422);
});
test('draft store persists, rejects conflicts, clones quote-only and preserves published versions',async()=>{
 const dir=await temp(),store=createRecipeStore(dir);const original=await store.published(bistro.id,'1'),record=await store.get(bistro.id);
 const draft=structuredClone(record.draft);draft.title='Studio variation';const saved=await store.save(bistro.id,draft,record.revision);
 assert.equal((await store.published(bistro.id,'1')).title,original.title);
 await assert.rejects(store.save(bistro.id,draft,record.revision),e=>e.status===409);
 const published=await store.publish(bistro.id,saved.revision);assert.equal(published.versions.at(-1).version,'2');
 assert.deepEqual(await store.published(bistro.id,'1'),original);assert.equal((await createRecipeStore(dir).published(bistro.id,'2')).title,'Studio variation');
 const copied=await store.clone(parsons.id,'new-table','New table');assert.equal(copied.versions.length,0);assert.equal(copied.draft.pricing.mode,'quote');assert.equal(compileRecipe(copied.draft).evaluate({}).quote.totalMinor,null);
 await assert.rejects(store.clone(parsons.id,'new-table','Duplicate'),e=>e.status===409);
 const pair=await Promise.allSettled([store.save('new-table',copied.draft,1),store.save('new-table',copied.draft,1)]);assert.equal(pair.filter(r=>r.status==='fulfilled').length,1);
 const lib=await store.materials();lib.presets[0].roughness=.85;await store.saveMaterials(lib.presets,lib.revision);assert.equal((await createRecipeStore(dir).materials()).presets[0].roughness,.85);
 assert.deepEqual(await store.published(bistro.id,'1'),original);
});
test('HTTP studio flow publishes, validates versions, saves builds and rejects unsafe requests',async t=>{
 const server=createApp({storage:await temp()});await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));t.after(()=>new Promise(resolve=>server.close(resolve)));const base='http://127.0.0.1:'+server.address().port;
 assert.equal((await fetch(base+'/api/studio/recipes/'+bistro.id)).status,401);
 const auth=await fetch(base+'/api/handoff/setup',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({password:'recipe-test-maker-password'})});
 const cookie=auth.headers.get('set-cookie').split(';')[0];
 const request=(path,body,method='POST',headers={})=>fetch(base+'/api/'+path,{method,headers:{'Content-Type':'application/json',Cookie:cookie,...headers},body:JSON.stringify(body)});
 const record=await (await fetch(base+'/api/studio/recipes/'+bistro.id,{headers:{Cookie:cookie}})).json();record.draft.geometry.height.value=30;record.draft.geometry.height.confidence='workspace';
 const save=await request('studio/recipes/'+bistro.id,{recipe:record.draft,revision:record.revision},'PUT');assert.equal(save.status,200);const saved=await save.json();
 const published=await request('studio/recipes/'+bistro.id+'/publish',{revision:saved.revision});assert.equal(published.status,200);
 const recipe=await(await fetch(base+'/api/catalog/'+bistro.id+'?version=2')).json();const product=compileRecipe(recipe);assert.equal(product.defaults.height,30);
 const body={productId:bistro.id,productVersion:'2',config:product.defaults,totalMinor:1};const response=await request('builds',body);assert.equal(response.status,201);const snapshot=await response.json();assert.equal(snapshot.quote.totalMinor,null);assert.equal(snapshot.config.height,30);assert.equal(snapshot.productVersion,'2');assert.equal(snapshot.orderPlaced,false);
 assert.equal((await request('quote',{...body,productVersion:'draft'})).status,404);
 assert.equal((await request('studio/recipes/'+bistro.id,{recipe:{...record.draft,sizes:42},revision:3},'PUT')).status,422);
 assert.equal((await request('studio/recipes/'+bistro.id+'/publish',{revision:3},'POST',{Origin:'https://malicious.invalid'})).status,403);
 const old=await(await fetch(base+'/api/catalog/'+bistro.id+'?version=1')).json();assert.equal(old.geometry.height.value,29);
});
