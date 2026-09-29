import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {randomUUID} from 'node:crypto';
import {createApp} from '../server/app.mjs';
import {createManagementStore} from '../server/management-store.mjs';
import {validateManaged,DEFAULT_MAPPING} from '@rivet/configurator/product/management';
import {tableProduct} from '@maker/ref-parsons';

const product={id:'test-product',title:'Test product',currency:'USD',fields:[{id:'finish',type:'string'},{id:'length',type:'number'}]};
test('management drafts publish immutable versions and atomic agent proposals reject stale revisions',async t=>{
  const directory=await mkdtemp(join(tmpdir(),'maker-management-')),store=createManagementStore(directory);t.after(()=>store.close());store.ensure([product]);
  const original=store.record('price-lists',product.id),policy=store.record('policies',product.id);
  const change={kind:'price-lists',id:product.id,revision:1,draft:{...original.draft,mode:'fixed-plus-rules',baseMinor:240000,adjustments:[{field:'finish',value:'oak',label:'Oak adjustment',amountMinor:10000}]}};
  const proposal={source:'agent',changes:[change]};assert.equal(store.preview(proposal,[product]).changes[0].diff.length,3);assert.equal(store.record('price-lists',product.id).revision,1);
  const saved=store.apply(proposal,[product])[0];assert.equal(saved.revision,2);assert.equal(saved.published.version,1);assert.equal(saved.published.draft.baseMinor,null);
  const active=store.publish('price-lists',product.id,2,[product]);assert.equal(active.published.version,2);assert.equal(active.published.draft.baseMinor,240000);
  assert.throws(()=>store.apply({source:'agent',changes:[{kind:'policies',id:product.id,revision:1,draft:{...policy.draft,enabled:false}},change]},[product]),e=>e.status===409);
  assert.equal(store.record('policies',product.id).draft.enabled,true);
  assert.throws(()=>store.apply({source:'ui',changes:[{kind:'policies',id:product.id,revision:1,draft:{...policy.draft,exclusions:[{field:'length',value:'72',message:'Blocked'}]}}]},[product]),e=>e.status===422);
  assert.equal(store.suggest({productId:product.id,config:{finish:'oak'},quote:{currency:'USD',totalMinor:100000}}).unitMinor,250000);
  assert.equal(store.history()[1].source,'agent');
  const reopened=createManagementStore(directory);assert.equal(reopened.record('price-lists',product.id).published.version,2);reopened.close();
});
test('connector validation distinguishes real file adapters from inactive API setup and rejects secret fields',()=>{
  const draft={id:'client-erp',name:'Client ERP',provider:'Odoo',transport:'api-planned',enabled:false,isDefault:false,endpoint:'https://erp.example.com/api',credentialRef:'CLIENT_ERP_TOKEN',mapping:DEFAULT_MAPPING,notes:''};
  assert.deepEqual(validateManaged('connectors',draft),[]);
  for(const patch of [{enabled:true},{isDefault:true},{apiKey:'secret'},{credentialRef:'actual secret token here'},{endpoint:'https://user:password@erp.example.com'},{endpoint:'https://erp.example.com?token=secret'},{mapping:[{column:'=FORMULA',field:'id'}]}])assert.ok(validateManaged('connectors',{...draft,...patch}).length);
});
test('published management settings affect quotes and mapped exports while accepted packets stay frozen',async t=>{
  const storage=await mkdtemp(join(tmpdir(),'maker-management-api-')),server=createApp({storage});await new Promise(r=>server.listen(0,'127.0.0.1',r));t.after(()=>new Promise(r=>server.close(r)));
  const base=`http://127.0.0.1:${server.address().port}/api/handoff/`;let cookie='';
  async function call(path,body,accessToken){const r=await fetch(base+path,{method:body?'POST':'GET',headers:{...(body?{'Content-Type':'application/json'}:{}),...(cookie?{Cookie:cookie}:{}),...(accessToken?{Authorization:'Bearer '+accessToken}:{})},...(body?{body:JSON.stringify(body)}:{})});const text=await r.text();let data;try{data=JSON.parse(text);}catch{data=text;}return {status:r.status,data,headers:r.headers};}
  assert.equal((await call('manage/bundle')).status,401);const auth=await call('setup',{password:'management-test-password'});cookie=auth.headers.get('set-cookie').split(';')[0];
  const catalog=(await call('manage/catalog')).data;assert.ok(catalog.find(p=>p.id==='on3p-custom-ski').referenceRows.length>100);
  let bundle=(await call('manage/bundle')).data;const row=(kind,id=tableProduct.id)=>bundle.resources.find(r=>r.kind===kind&&r.id===id);
  async function publish(record,draft){const saved=await call('manage/proposals/apply',{source:'ui',changes:[{kind:record.kind,id:record.id,revision:record.revision,draft}]});assert.equal(saved.status,200);const result=await call('manage/publish/'+record.kind+'/'+record.id,{revision:saved.data[0].revision,source:'ui'});assert.equal(result.status,200);bundle=(await call('manage/bundle')).data;return result.data;}
  await publish(row('price-lists'),{...row('price-lists').draft,mode:'fixed-plus-rules',baseMinor:20000,adjustments:[{field:'length',value:72,label:'Standard length handling',amountMinor:500}]});
  const connector=row('connectors','manual-file'),mapping=connector.draft.mapping.map((m,i)=>i===0?{...m,column:'ERP_ORDER_ID'}:m);
  await publish(connector,{...connector.draft,mapping});
  const config=tableProduct.normalize({}),id=randomUUID(),accessToken=(randomUUID()+randomUUID()).replaceAll('-',''),input={id,accessToken,productId:tableProduct.id,productVersion:tableProduct.version,config,expectedQuote:tableProduct.evaluate(config).quote};
  assert.equal((await call('builds',input)).status,201);assert.equal((await call('builds/'+id)).data.quoteSuggestion.unitMinor,20500);
  const qbody={id:randomUUID(),unitMinor:20500,quantity:1,shippingMinor:0,taxMinor:0,validityDays:7,itemCode:'TABLE-PILOT',leadTime:'6 weeks',terms:'Pilot only',feasibilityReviewed:true};
  let q=(await call('builds/'+id+'/quote',qbody)).data;assert.equal(q.commercialContext.priceList.version,2);
  await publish(row('policies'),{...row('policies').draft,notes:'Availability reviewed today.'});
  const accept=q=>call('builds/'+id+'/accept',{quoteId:q.id,totalMinor:q.totalMinor,currency:q.currency,confirmed:true},accessToken);
  assert.equal((await accept(q)).status,409);
  q=(await call('builds/'+id+'/quote',{...qbody,id:randomUUID()})).data;
  await publish(row('price-lists'),{...row('price-lists').draft,baseMinor:30000});
  const accepted=await accept(q);assert.equal(accepted.status,200);assert.equal(accepted.data.quote.unitMinor,20500);assert.equal(accepted.data.connector.version,2);
  await publish(row('connectors','manual-file'),{...row('connectors','manual-file').draft,mapping:mapping.map((m,i)=>i===0?{...m,column:'LATER_ORDER_ID'}:m)});
  await call('builds/'+id+'/export',{});const csv=await call('builds/'+id+'/file?format=csv');assert.match(csv.data,/ERP_ORDER_ID/);assert.doesNotMatch(csv.data,/LATER_ORDER_ID/);
  await publish(row('policies'),{...row('policies').draft,enabled:false});
  assert.equal((await call('builds',{...input,id:randomUUID()})).status,422);
  const planned={...row('connectors','manual-file').draft,id:'planned-odoo',name:'Odoo pilot',provider:'Odoo',transport:'api-planned',enabled:false,isDefault:false};
  const test=await call('manage/connectors/test',{draft:planned});assert.equal(test.data.status,'adapter-needed');assert.equal(test.data.networkRequestMade,false);
  const fileTest=await call('manage/connectors/test',{draft:row('connectors','manual-file').draft});assert.equal(fileTest.data.status,'file-ready');assert.match(fileTest.data.csv,/PREVIEW-ORDER-001/);
  assert.equal((await call('manage/history')).data.length,12);
});
