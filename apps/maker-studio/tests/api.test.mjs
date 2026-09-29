import {test} from 'node:test';import assert from 'node:assert/strict';import {mkdtemp,readFile} from 'node:fs/promises';import {fileURLToPath} from 'node:url';import {join} from 'node:path';
import {tableProduct} from '@maker/ref-parsons';import {createApp} from '../server/app.mjs';
test('HTTP quoting recomputes price; snapshots persist; invalid and stale builds fail',async t=>{
 const storage=await mkdtemp(fileURLToPath(new URL('../../../work/table-demo/api-test-',import.meta.url)));const server=createApp({storage});await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));t.after(()=>new Promise(resolve=>server.close(resolve)));
 const base=`http://127.0.0.1:${server.address().port}`;const payload={productId:tableProduct.id,productVersion:tableProduct.version,config:tableProduct.defaults,totalMinor:1};
 const post=(path,data)=>fetch(base+path,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(data)});
 const quote=await post('/api/quote',payload);assert.equal(quote.status,200);assert.equal((await quote.json()).quote.totalMinor,539900);
 const saved=await post('/api/builds',payload);assert.equal(saved.status,201);const snap=await saved.json();assert.equal(snap.orderPlaced,false);assert.equal(snap.quote.totalMinor,539900);assert.deepEqual(JSON.parse(await readFile(join(storage,snap.id+'.json'),'utf8')),snap);assert.deepEqual(await (await fetch(base+'/api/builds/'+snap.id)).json(),snap);
 const download=await fetch(base+'/api/builds/'+snap.id+'?download=1');assert.match(download.headers.get('content-disposition'),/^attachment; filename="maker-build-/);assert.deepEqual(await download.json(),snap);
 assert.equal((await post('/api/quote',{...payload,productVersion:'stale'})).status,409);
 assert.equal((await post('/api/quote',{...payload,config:{...payload.config,finish:'invented'}})).status,422);
 assert.equal((await post('/api/quote',null)).status,400);
 const custom=await post('/api/quote',{...payload,config:{...payload.config,size:'custom',length:81}});assert.equal((await custom.json()).quote.totalMinor,null);
 const list=await (await fetch(base+'/api/products')).json();assert.deepEqual(list.map(p=>p.id),['ref-parsons','on3p-custom-ski']);
});
