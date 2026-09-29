import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
export const digest = value => createHash('sha256').update(typeof value === 'string' ? value : canonical(value)).digest('hex');
export function canonical(value) {
  if (Array.isArray(value)) return '[' + value.map(canonical).join(',') + ']';
  if (value && typeof value === 'object') return '{' + Object.keys(value).sort().map(k => JSON.stringify(k) + ':' + canonical(value[k])).join(',') + '}';
  return JSON.stringify(value);
}
const sharedRoot = new URL('../../../packages/', import.meta.url);
// The ON3P product's source is archived with each release, so a build can be traced to it.
const brandRoot = new URL('../../../brands/on3p/src/', import.meta.url);
const files = {
  'on3p-custom-ski': ['rules.js','pack.js','product.js','bindings.js','catalog.json','compatibility.json','stock-art.json','bindings-catalog.json'].map(p => [p,new URL(p,brandRoot)]),
  'ref-parsons': ['index.mjs','catalog.json'].map(p => [p,new URL('ref-parsons/'+p,sharedRoot)]),
};
// Capture source alongside the process that loaded its adapters. Restart the
// service when changing source; a running process must not mix two releases.
const core = await readFile(new URL('configurator/src/product/index.mjs',sharedRoot),'utf8');
const recipeCompiler = await readFile(new URL('product-recipes/index.mjs',sharedRoot),'utf8');
const archived = new Map(await Promise.all(Object.entries(files).map(async ([id,list]) => [id,Object.fromEntries(await Promise.all(list.map(async ([name,path]) => [name,await readFile(path,'utf8')])))])));
export async function productRelease(product, recipeStore, legacy) {
  const sources = legacy.get(product.id) === product ? archived.get(product.id) : {recipe:await recipeStore.published(product.id,product.version),compiler:recipeCompiler};
  const evidence = {productId:product.id,productVersion:product.version,core,sources};
  return {id:digest(evidence),evidence};
}
