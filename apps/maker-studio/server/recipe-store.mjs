import {readFile,writeFile,mkdir,rename} from 'node:fs/promises';
import {join} from 'node:path';
import {randomUUID} from 'node:crypto';
import seeds from '@maker/product-recipes/seeds' with {type:'json'};
import materialSeeds from '@maker/product-recipes/materials' with {type:'json'};
import {assertRecipe,compileRecipe} from '@maker/product-recipes';

const clone=structuredClone;
const fail=(status,message)=>Object.assign(new Error(message),{status});
export function createRecipeStore(root){
  let data,loading,queue=Promise.resolve();
  async function load(){if(data)return data;if(loading)return loading;loading=(async()=>{
    try{data=JSON.parse(await readFile(join(root,'workspace.json'),'utf8'));}
    catch(e){if(e.code!=='ENOENT')throw e;data={schemaVersion:1,materials:{revision:1,presets:clone(materialSeeds)},recipes:Object.fromEntries(seeds.map(recipe=>[recipe.id,{revision:1,draft:clone(recipe),versions:[{version:'1',publishedAt:new Date().toISOString(),recipe:clone(recipe)}]}]))};}
    return data;
  })();return loading;}
  async function mutate(action){const operation=queue.then(async()=>{const current=await load(),next=clone(current),result=await action(next);await mkdir(root,{recursive:true});const tmp=join(root,`workspace-${randomUUID()}.tmp`);await writeFile(tmp,JSON.stringify(next,null,2));await rename(tmp,join(root,'workspace.json'));data=next;return clone(result);});queue=operation.catch(()=>{});return operation;}
  const get=(d,id)=>{if(!Object.hasOwn(d.recipes,id))throw fail(404,'Recipe not found.');return d.recipes[id];};
  const check=(record,revision)=>{if(record.revision!==revision)throw fail(409,'This draft changed in another window. Reload the saved draft before saving again.');};
  return {
    async list(){const d=await load();return Object.entries(d.recipes).map(([id,r])=>({id,title:r.draft.title,maker:r.draft.maker,template:r.draft.template,revision:r.revision,latestVersion:r.versions.at(-1)?.version||null}));},
    async get(id){return clone(get(await load(),id));},
    async published(id,version){const record=get(await load(),id),found=version?record.versions.find(v=>v.version===version):record.versions.at(-1);if(!found)throw fail(404,'Published recipe revision not found.');return clone(found.recipe);},
    async catalog(){const d=await load();return Object.values(d.recipes).filter(r=>r.versions.length).map(r=>clone(r.versions.at(-1).recipe));},
    async save(id,recipe,revision){assertRecipe(recipe);if(recipe.id!==id)throw fail(422,'Product ID cannot be changed while editing a recipe.');compileRecipe(recipe).evaluate({});return mutate(d=>{const r=get(d,id);check(r,revision);r.draft=clone(recipe);r.revision++;return r;});},
    async clone(id,newId,title){if(!/^[a-z][a-z0-9-]{1,63}$/.test(newId)||typeof title!=='string'||!title.trim()||title.length>100)throw fail(422,'Choose a valid product ID and title.');return mutate(d=>{const source=get(d,id);if(Object.hasOwn(d.recipes,newId))throw fail(409,'That product ID already exists.');const recipe={...clone(source.draft),id:newId,title:title.trim(),version:'draft',pricing:{...clone(source.draft.pricing),mode:'quote',provenance:'workspace'},notes:`Independent workspace variation. Maker has not approved this recipe. ${source.draft.notes}`};const record={revision:1,draft:recipe,versions:[]};d.recipes[newId]=record;return record;});},
    async publish(id,revision){return mutate(d=>{const r=get(d,id);check(r,revision);assertRecipe(r.draft);compileRecipe(r.draft).evaluate({});const version=String(r.versions.length+1),recipe={...clone(r.draft),version};r.versions.push({version,publishedAt:new Date().toISOString(),recipe});r.draft=clone(recipe);r.revision++;return r;});},
    async materials(){return clone((await load()).materials);},
    async saveMaterials(presets,revision){const test=clone(seeds[0]);test.finishes=presets;test.pricing.variants=[];test.defaults.finish=presets?.[0]?.id;test.rules=[];assertRecipe(test);return mutate(d=>{check(d.materials,revision);d.materials={revision:revision+1,presets:clone(presets)};return d.materials;});},
  };
}
