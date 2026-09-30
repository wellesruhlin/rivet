import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {tableProduct,catalog,sizes,finishes,previewLimits} from '@maker/ref-parsons';
import {encodeConfiguration,decodeConfiguration,createSnapshot,ConfigurationError,totalMinor} from '@arc/configurator/product';
import {inspectScene} from '@arc/configurator/product/geometry';
import {skiProduct} from '@arc/brand-on3p/product';

test('all 48 standard variants preserve maker IDs and exact published minor-unit prices',async()=>{
 const raw=await readFile(new URL('../reference/ref-parsons-product.json',import.meta.url));const source=JSON.parse(raw);
 assert.equal(createHash('sha256').update(raw).digest('hex'),catalog.sha256);assert.equal(catalog.variants.length,48);
 for(const size of sizes)for(const finish of finishes){const result=tableProduct.evaluate({...tableProduct.defaults,size:size.id,finish:finish.id});const original=source.variants.find(v=>String(v.id)===result.quote.variantId);assert.ok(original);assert.equal(result.quote.totalMinor,original.price);assert.equal(result.config.width,size.width);assert.equal(result.config.height,30);assert.equal(result.quote.currency,'CAD');}
});
test('custom sizes never inherit Shopify placeholder prices and return to a verified preset',()=>{
 const c=tableProduct.change(tableProduct.defaults,{length:82.25,width:40,height:31}).config;assert.equal(c.size,'custom');assert.equal(tableProduct.evaluate(c).quote.totalMinor,null);assert.equal(tableProduct.evaluate(c).quote.variantId,null);
 const back=tableProduct.change(c,{size:'96'}).config;assert.deepEqual([back.length,back.width,back.height],[96,44,30]);assert.equal(tableProduct.evaluate(back).quote.totalMinor,659900);
});
test('unknown options, non-finite dimensions and out-of-range previews are rejected',()=>{
 for(const value of [NaN,Infinity,-1,130,'72',null,72.13])assert.throws(()=>tableProduct.normalize({...tableProduct.defaults,size:'custom',length:value}),ConfigurationError);
 assert.throws(()=>tableProduct.normalize({...tableProduct.defaults,finish:'fictional'}),ConfigurationError);
 assert.throws(()=>tableProduct.normalize({...tableProduct.defaults,price:1}),ConfigurationError);
 assert.throws(()=>tableProduct.change(tableProduct.defaults,JSON.parse('{"__proto__":{}}')),ConfigurationError);
});
test('share links round-trip both product families and reject wrong revisions/families',()=>{
 for(const product of [tableProduct,skiProduct]){const config=product.normalize(product.defaults);assert.deepEqual(decodeConfiguration(product,encodeConfiguration(product,config)),config);}
 assert.throws(()=>decodeConfiguration(tableProduct,encodeConfiguration(skiProduct,skiProduct.defaults)),ConfigurationError);
 assert.throws(()=>decodeConfiguration(tableProduct,encodeConfiguration(tableProduct,tableProduct.defaults).replace('v=2026-09-24.1','v=old')),ConfigurationError);
 assert.throws(()=>decodeConfiguration(tableProduct,'x'.repeat(16001)),ConfigurationError);
});
test('ski adapter preserves dependency rules, price and unsupported-geometry fallback',()=>{
 const first=skiProduct.normalize({...skiProduct.defaults,category:'Freestyle',model:'jeffrey-106',length:186,layup:'Torsion Bar',flex:'Soft'});assert.equal(first.flex,'Stock');assert.equal(skiProduct.evaluate(first).quote.totalMinor,124900);assert.equal(skiProduct.scene(first).parts.length,2);
 const changed=skiProduct.change(first,{model:'oski-102',length:191}).config;assert.equal(changed.length,null);assert.equal(skiProduct.evaluate(changed).quote.status,'incomplete');assert.equal(skiProduct.scene(changed).parts.length,0);
});
test('immutable snapshot values do not drift when the input object changes',()=>{
 const input={...tableProduct.defaults};const snap=createSnapshot(tableProduct,input,{id:'test-build',createdAt:'2026-09-24T00:00:00Z'});input.finish='blackened-oak';assert.equal(snap.config.finish,'natural-walnut');assert.equal(snap.quote.totalMinor,539900);assert.equal(snap.orderPlaced,false);assert.equal(snap.productVersion,catalog.version);
});
test('money rejects fractional/unsafe minor units',()=>{assert.throws(()=>totalMinor([{amountMinor:.1}]));assert.throws(()=>totalMinor([{amountMinor:Number.MAX_SAFE_INTEGER},{amountMinor:1}]));assert.equal(totalMinor([{amountMinor:1200},{amountMinor:-200}]),1000);});
test('all presets and extreme custom dimensions export finite geometry with exact envelopes',()=>{
 const configs=sizes.map(size=>({...tableProduct.defaults,size:size.id}));
 for(const extremum of ['min','max'])configs.push({...tableProduct.defaults,size:'custom',...Object.fromEntries(Object.entries(previewLimits).map(([k,v])=>[k,v[extremum]]))});
 for(const config of configs){const scene=tableProduct.scene(config),check=inspectScene(scene);assert.equal(check.parts,13);const vertices=scene.parts.flatMap(p=>p.mesh.positions);for(const [axis,expected] of [[0,scene.dimensions.length],[1,scene.dimensions.height],[2,scene.dimensions.width]]){const values=vertices.map(v=>v[axis]);assert.ok(Math.abs(Math.max(...values)-Math.min(...values)-expected)<1e-8);}
 for(const part of scene.parts){assert.equal(part.mesh.normals.length,part.mesh.positions.length);for(const n of part.mesh.normals)assert.ok(Math.abs(Math.hypot(...n)-1)<1e-8);}}
});
test('scene contract accommodates ski geometry and table construction without category branches',()=>{for(const [product,input] of [[tableProduct,tableProduct.defaults],[skiProduct,{...skiProduct.defaults,model:'jeffrey-106',length:186}]]){const scene=product.scene(input);assert.equal(scene.units,'m');assert.equal(scene.upAxis,'Y');assert.ok(inspectScene(scene).parts>0);}});
