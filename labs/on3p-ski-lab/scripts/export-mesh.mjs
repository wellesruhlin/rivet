import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {resolve,generateMesh} from '../geometry.mjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const data=JSON.parse(fs.readFileSync(path.join(root,'data/on3p.json')));
const dest=path.join(root,'meshes');fs.mkdirSync(dest,{recursive:true});
for(const model of data.models) {
 const length=Number(process.argv[3]||186),over=process.argv[4]?JSON.parse(process.argv[4]):{};
 if(process.argv[2] && model.handle!==process.argv[2])continue;
 for(let side=0;side<2;side++) {
  const mesh=generateMesh(model,resolve(model,length,over),{side});
  const name=`${model.handle}-${length}-${side?'right':'left'}.json`;
  fs.writeFileSync(path.join(dest,name),JSON.stringify(mesh));
  console.log(name,mesh.positions.length,'vertices',mesh.faces.length,'faces');
 }
}
