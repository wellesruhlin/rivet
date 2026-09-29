import {test} from 'node:test';
import assert from 'node:assert/strict';
import {catalog,defaultConfig,categories,normalizeConfig,applyConfigChange,canRipper,shapeReady,rulesFor,bomLines,totalPrice,encodeConfig,decodeConfig,buildText,visibleGraphics,invalidateReviews,stockFor} from './config.js';
const build=overrides=>normalizeConfig({...defaultConfig,model:'jeffrey-106',length:186,...overrides});
test('category, exact named model, and explicit length are required in order',()=>{
 assert.equal(shapeReady(defaultConfig),false);
 const category=applyConfigChange(defaultConfig,{category:'Freeride'}).config;
 assert.equal(category.model,'');assert.equal(category.length,null);
 const model=applyConfigChange(category,{model:'woodsman-108'}).config;
 assert.equal(model.length,null);assert.equal(shapeReady(model),false);
 assert.equal(shapeReady(applyConfigChange(model,{length:181}).config),true);
 assert.equal(normalizeConfig({...model,model:'mango-90'}).model,'');
 assert.equal(categories.find(g=>g.id==='Freeride').models.includes('woodsman-92'),true);
});
test('Ripper matrix: Woodsman 171 yes, Jeffrey and Oski 171 no, powder models no',()=>{
 for(const [handle,length,expected] of [['woodsman-92',171,true],['woodsman-108',166,false],['woodsman-108',191,false],['jeffrey-106',171,false],['jeffrey-112',186,true],['jeffrey-118',186,false],['jeffrey-124',186,false],['oski-102',171,false],['mango-90',176,true],['mango-114',186,false],['billy-goat-108',186,false],['cease-and-desist',186,false]])assert.equal(canRipper(catalog.models.find(m=>m.handle===handle),length),expected,handle+length);
});
test('spec/builder conflicts cannot create an orderable length',()=>{
 assert.equal(build({model:'woodsman-92',length:166}).length,null);
 assert.equal(build({model:'jeffrey-112',length:171}).length,null);
});
test('Mango 90/102 reject all custom layups and skin clip; Torsion Bar locks flex',()=>{
 for(const model of ['mango-90','mango-102']){const c=build({model,layup:'Tour',skinClip:true});assert.equal(c.layup,'Stock');assert.equal(c.skinClip,false);}
 const c=build({layup:'Torsion Bar',flex:'Double Soft'});assert.equal(c.flex,'Stock');
 assert.equal(build({model:'oski-102',layup:'Torsion Bar'}).layup,'Stock');
 assert.equal(build({model:'billy-goat-114',layup:'Torsion Bar'}).layup,'Stock');
});
test('Billy Goat 108 has a required included skin clip, and no park detune',()=>{
 const c=build({model:'billy-goat-108',skinClip:false,detune:true});assert.equal(c.skinClip,true);assert.equal(c.detune,false);assert.equal(totalPrice(c),1099);assert.equal(bomLines(c).find(l=>l.key==='skinClip').price,0);
});
test('invalidated dependencies are explained and size is never silently substituted',()=>{
 const before=build({length:191,layup:'Torsion Bar',rocker:'Signature'});
 const {config,changes}=applyConfigChange(before,{model:'oski-102'});
 assert.equal(config.length,null);assert.equal(config.layup,'Stock');assert.deepEqual(changes.map(c=>c.field),['length','layup']);
 const rocker=applyConfigChange(build({rocker:'Ripper'}),{length:171});assert.equal(rocker.config.rocker,'Signature');assert.match(rocker.changes[0].text,/Ripper.*Signature/);
 const flex=applyConfigChange(build({flex:'Soft'}),{layup:'Torsion Bar'});assert.equal(flex.config.flex,'Stock');assert.match(flex.changes[0].text,/requires Stock flex/);
});
test('compatible downstream choices survive a model change; only affected reviews reopen',()=>{
 const before=build({rocker:'Ripper',layup:'50/50',sidewall:'Pink'}),after=applyConfigChange(before,{model:'jeffrey-98'}).config;
 assert.equal(after.length,186);assert.equal(after.rocker,'Ripper');assert.equal(after.layup,'50/50');assert.equal(after.sidewall,'Pink');assert.deepEqual(invalidateReviews(before,after,[0,1,2]),[1,2]);
});
test('Touring starts with a valid Tour layup on the selected shape',()=>{
 const c=applyConfigChange({...defaultConfig,category:'Touring'},{model:'woodsman-108'}).config;assert.equal(c.layup,'Tour');assert.equal(c.length,null);assert.equal(totalPrice(c),1249);
});
test('every normalized full combination is internally valid and normalization is idempotent',()=>{
 for(const model of catalog.models)for(const length of [161,166,171,176,181,186,191])for(const layup of ['Stock','LITE','50/50','Tour','Leaf Spring','Torsion Bar'])for(const flex of ['Stock','Stiff','Soft','Double Soft']){
  const c=build({model:model.handle,length,layup,flex,rocker:'Ripper',detune:true,skinClip:true});const r=rulesFor(c);
  assert.ok(c.length===null||r.lengths.includes(c.length));assert.ok(r.layups.includes(c.layup));assert.ok(r.flex[c.layup].includes(c.flex));assert.equal(c.detune,r.detune);assert.deepEqual(normalizeConfig(c),c);
 }
});
test('BOM prices include wood artwork and each upgrade once; required tails are free',()=>{
 const wood=catalog.tops.find(g=>g.name==='Wood Logo');const c=build({top:wood.id,layup:'Tour',sidewall:'Pink',flex:'Soft',detune:true,skinClip:true});assert.equal(totalPrice(c),1674);assert.equal(bomLines(c).length,11);assert.equal(totalPrice(build()),1099);
});
test('gallery selection cannot reorder or replace artwork tiles',()=>{
 const before=visibleGraphics(catalog.tops);const originalIds=before.map(g=>g.id);const c=build({top:before[7].id});assert.equal(c.top,before[7].id);assert.deepEqual(visibleGraphics(catalog.tops).map(g=>g.id),originalIds);assert.equal(visibleGraphics(catalog.tops,'','All',24).slice(0,12).map(g=>g.id).join(),originalIds.join());
});
test('share links preserve valid choices and repair tampered incompatible ones',()=>{
 const c=build({model:'woodsman-108',length:181,layup:'50/50',flex:'Double Soft',sidewall:'Orange',skinClip:true});assert.deepEqual(decodeConfig(encodeConfig(c)),c);
 const invalid=decodeConfig('model=mango-90&length=191&rocker=Ripper&layup=Tour&skinClip=true');assert.equal(invalid.length,null);assert.equal(invalid.rocker,'Signature');assert.equal(invalid.layup,'Stock');assert.equal(invalid.skinClip,false);
});
test('download uses the same parts and prices as the build sheet',()=>{const text=buildText(build());assert.match(text,/Petrol/);assert.match(text,/Length: 186 cm/);assert.match(text,/\$1,099/);assert.match(text,/No order has been placed/)});

test('verified current stock defaults use catalog artwork for every mapped model', () => {
 let count = 0;
 for (const model of catalog.models) {
  const stock = stockFor(model.handle);
  if (!stock) continue;
  count++;
  assert.equal(catalog.tops.find(g => g.id === stock.top)?.name, stock.topName);
  assert.equal(catalog.bases.find(g => g.id === stock.base)?.name, stock.baseName);
  const c = applyConfigChange(defaultConfig, {model: model.handle}).config;
  assert.equal(c.top, stock.top, model.handle);
  assert.equal(c.base, stock.base, model.handle);
 }
 assert.equal(count, 15);
 const goat = applyConfigChange(defaultConfig, {model: 'billy-goat-118'}).config;
 assert.equal(catalog.tops.find(g => g.id === goat.top).name, 'BG XXII');
 assert.equal(catalog.bases.find(g => g.id === goat.base).name, 'Green');
 for (const handle of ['jeffrey-124', 'billy-goat-102', 'billy-goat-108']) assert.equal(stockFor(handle), null);
});

test('stock art follows a new model while custom artwork and explicit shared choices survive', () => {
 const goat = normalizeConfig({model: 'billy-goat-118', length: 186});
 const woodsman = applyConfigChange(goat, {model: 'woodsman-108'}).config;
 assert.equal(woodsman.top, stockFor('woodsman-108').top);
 const custom = applyConfigChange(goat, {top: catalog.tops.find(g => g.name === 'Petrol').id}).config;
 assert.equal(applyConfigChange(custom, {model: 'woodsman-108'}).config.top, custom.top);
 const park = applyConfigChange(goat, {category: 'Park'}).config;
 const oski = applyConfigChange(park, {model: 'oski-102'}).config;
 assert.equal(oski.top, stockFor('oski-102').top);
 assert.equal(oski.base, stockFor('oski-102').base);
 assert.deepEqual(decodeConfig(encodeConfig(custom)), custom);
 assert.equal(decodeConfig('model=billy-goat-118&length=186').top, goat.top);
 assert.equal(decodeConfig('model=oski-102&length=186').base, oski.base);
});

