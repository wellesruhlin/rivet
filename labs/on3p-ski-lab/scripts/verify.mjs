import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import assert from 'node:assert/strict';
import {resolve,generateMesh,widthAt,heightAt} from '../geometry.mjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const data=JSON.parse(fs.readFileSync(path.join(root,'data/on3p.json')));
const cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
const sub=(a,b)=>a.map((v,i)=>v-b[i]);
const dot=(a,b)=>a.reduce((s,v,i)=>s+v*b[i],0);
const results=[];
for(const model of data.models)for(const spec of model.lengths) {
 const d=resolve(model,spec.length_cm),m=generateMesh(model,d),edges=new Map();
 const widths=model.outline.landmarks.map(u=>widthAt(model,d,u));
 [spec.tip_mm,spec.waist_mm,spec.tail_mm].forEach((w,i)=>assert.ok(Math.abs(w-widths[i])<.01));
 assert.ok(Math.abs(heightAt(model,d,0)-d.tipRiseMm)<.01);
 assert.ok(Math.abs(heightAt(model,d,1)-d.tailRiseMm)<.01);
 let volume=0,minimumArea=Infinity;
 m.faces.forEach((f,fi)=> {
   f.forEach((v,i)=>{const w=f[(i+1)%f.length],key=[Math.min(v,w),Math.max(v,w)].join(',');edges.set(key,(edges.get(key)||0)+1);});
   for(let k=1;k<f.length-1;k++) {
    const [a,b,c]=[m.positions[f[0]],m.positions[f[k]],m.positions[f[k+1]]];
    const norm=cross(sub(b,a),sub(c,a));const area=Math.hypot(...norm)/2;
    minimumArea=Math.min(minimumArea,area);assert.ok(area>1e-15,`${model.handle} degenerate face ${fi}`);
    volume+=dot(a,cross(b,c))/6;
   }
 });
 assert.ok([...edges.values()].every(n=>n===2),'Open/nonmanifold mesh');
 assert.ok(volume>0,'Negative or zero volume');
 assert.ok(m.positions.flat().every(Number.isFinite));
 const z=m.positions.map(v=>v[2]);
 const extent=(Math.max(...z)-Math.min(...z))*1000;
 assert.ok(Math.abs(extent-d.lengthMm)<.1,`Length ${extent} != ${d.lengthMm}`);
 assert.ok(m.sections.every(s=>s.thicknessMm>3 && s.heightMm>=0));
 const shifted=resolve(model,spec.length_cm,{mountMm:d.mountMm+10});
 assert.equal(widthAt(model,shifted,.5),widthAt(model,d,.5),'Mount moved outline');
 results.push({model:model.handle,lengthCm:spec.length_cm,vertices:m.positions.length,faces:m.faces.length,
   watertight:true,positiveVolumeM3:volume,minTriangleAreaM2:minimumArea,lengthErrorMm:extent-d.lengthMm,
   widthsMm:widths,profileStatus:model.profile.status});
}
const first=data.models[0];
assert.throws(()=>resolve(first,186,{lengthMm:NaN}));assert.throws(()=>resolve(first,186,{thicknessMm:-1}));
assert.throws(()=>resolve(first,186,{tipMm:90,waistMm:110}));
const custom=resolve(first,186,{lengthMm:1950,tipMm:145,waistMm:115,tailMm:132,tipRiseMm:95,tailRiseMm:35,camberMm:5,thicknessMm:15});
const customMesh=generateMesh(first,custom);
assert.equal(customMesh.definition.lengthMm,1950);assert.equal(widthAt(first,custom,first.outline.landmarks[1]),115);
assert.ok(Math.abs(heightAt(first,custom,0)-95)<1e-9);
const report={date:'2026-09-24',passed:true,stockVariants:results.length,checks:['published width constraints','projected length','rise constraints','watertight indexed topology','no degenerate triangles','positive volume / outward winding','finite vertices','mount independent of shape','invalid input rejection','custom parameter regeneration'],
 caveat:'Numerical consistency tests, not validation of manufacturer accuracy. No independent calibrated reference supplied.',results};
fs.writeFileSync(path.join(root,'data/verification.json'),JSON.stringify(report,null,2));
console.log(JSON.stringify({passed:true,variants:results.length,checks:report.checks}));
