import {readFile, writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
const raw=await readFile(new URL('../reference/ref-parsons-product.json',import.meta.url));
const data=JSON.parse(raw);
const slug=s=>s.toLowerCase().replaceAll(' ','-');
const variants=data.variants.filter(v=>/^\d/.test(v.option1)).map(v=>({id:String(v.id),size:v.option1.split('"')[0],finish:slug(v.option2),priceMinor:v.price,available:v.available}));
const catalog={maker:'ref.',name:'Parsons Dining Table',currency:'CAD',productId:String(data.id),observed:'2026-09-24',version:'2026-09-24.1',source:'https://ref-co.ca/products/parsons-dining-table',dataSource:'https://ref-co.ca/products/parsons-dining-table.js',sha256:createHash('sha256').update(raw).digest('hex'),variants};
await writeFile(new URL('../../../packages/ref-parsons/catalog.json',import.meta.url),JSON.stringify(catalog,null,2)+'\n');
console.log(`Imported ${variants.length} standard variants. Custom placeholder prices intentionally excluded.`);
