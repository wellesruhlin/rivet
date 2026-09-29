import {writeFile,readFile} from 'node:fs/promises';
import {tableProduct} from '@maker/ref-parsons';
import {inspectScene} from '@rivet/configurator/product/geometry';
import {compileRecipe} from '@maker/product-recipes';
import seeds from '@maker/product-recipes/seeds' with {type:'json'};
const args=process.argv.slice(2),option=key=>{const i=args.indexOf(key);return i>=0?args[i+1]:null;};
let input={};
if(args.includes('--stdin')){let raw='';for await(const chunk of process.stdin)raw+=chunk;input=JSON.parse(raw||'{}');}
else if(option('--config'))input=JSON.parse(await readFile(option('--config'),'utf8'));
else if(args[0]&&!args[0].startsWith('--'))input=JSON.parse(await readFile(args[0],'utf8'));
let recipe=input.recipe;
if(option('--recipe'))recipe=JSON.parse(await readFile(option('--recipe'),'utf8'));
if(option('--product')){recipe=seeds.find(r=>r.id===option('--product'));if(!recipe)throw new Error('Unknown seed product.');}
const product=recipe?compileRecipe(recipe):tableProduct;
if(input.recipe)input=input.config||{};
if(input.schemaVersion&&input.config){if(input.productId!==product.id||input.productVersion!==product.version)throw new Error('Saved build and recipe product/version must match.');input=input.config;}
const scene=product.scene(input);inspectScene(scene);
if(args.includes('--stdin'))process.stdout.write(JSON.stringify(scene));
else{const path=option('--out')||new URL('../blender/table-scene.json',import.meta.url);await writeFile(path,JSON.stringify(scene));console.log('Exported '+scene.parts.length+' shared mesh parts for '+product.id+' version '+product.version+'.');}
