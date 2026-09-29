// Canonical mesh: meters, X across, Y up, +Z nose. Input dimensions are millimeters.
// This dependency-free module runs in Node and in the browser. Blender consumes its
// exported vertices/faces/UVs; it does not independently recreate the shape.
export const SURFACES = ['topsheet', 'base', 'sidewall', 'steel'];
const clamp = (x,a,b)=>Math.max(a,Math.min(b,x));
const mix=(a,b,t)=>a+(b-a)*t;
export function sample(values,u) {
  const x=clamp(u,0,1)*(values.length-1), i=Math.min(values.length-2,Math.floor(x));
  return mix(values[i],values[i+1],x-i);
}
const smoothstep=x=>{x=clamp(x,0,1);return x*x*(3-2*x);};

export function resolve(model,lengthCm=186,override={}) {
  const stock=model.lengths.find(x=>x.length_cm===Number(lengthCm));
  if(!stock) throw new Error('Unsupported published length');
  const ratio=stock.length_cm*10/model.referenceLengthMm;
  const p=model.profile;
  const def={model:model.handle,name:model.name,lengthMm:stock.length_cm*10,
    tipMm:stock.tip_mm,waistMm:stock.waist_mm,tailMm:stock.tail_mm,
    tipRiseMm:p.tipRiseMm*ratio,tailRiseMm:p.tailRiseMm*ratio,camberMm:p.camberMm*ratio,
    thicknessMm:p.underfootThicknessMm, mountMm:stock.mount_from_center_cm*10,
    ...override};
  const ranges={lengthMm:[1200,2200],tipMm:[85,185],waistMm:[65,155],tailMm:[80,180],
    tipRiseMm:[0,160],tailRiseMm:[0,160],camberMm:[0,15],thicknessMm:[7,22],mountMm:[-200,150]};
  for(const [key,[a,b]] of Object.entries(ranges))
    if(!Number.isFinite(def[key])||def[key]<a||def[key]>b) throw new Error(`${key} must be ${a}–${b}`);
  if(def.tipMm<def.waistMm || def.tailMm<def.waistMm) throw new Error('These traced ON3P shapes require tip and tail at least as wide as waist');
  def.custom=Object.keys(override).some(k=>def[k]!==resolveStockValue(k,stock,p,ratio));
  return def;
}
function resolveStockValue(k,s,p,r) {return {lengthMm:s.length_cm*10,tipMm:s.tip_mm,waistMm:s.waist_mm,tailMm:s.tail_mm,
  tipRiseMm:p.tipRiseMm*r,tailRiseMm:p.tailRiseMm*r,camberMm:p.camberMm*r,
  thicknessMm:p.underfootThicknessMm,mountMm:s.mount_from_center_cm*10}[k];}

export function widthAt(model,d,u) {
  const o=model.outline,[a,b,c]=o.landmarks, raw=sample(o.widthPx,u),
    wa=sample(o.widthPx,a),wb=sample(o.widthPx,b),wc=sample(o.widthPx,c);
  if(u<a) return d.tipMm*raw/wa;
  if(u<=b) return d.waistMm+(d.tipMm-d.waistMm)*clamp((raw-wb)/(wa-wb),0,1);
  if(u<=c) return d.waistMm+(d.tailMm-d.waistMm)*clamp((raw-wb)/(wc-wb),0,1);
  return d.tailMm*raw/wc;
}
export function heightAt(model,d,u) {
  const p=model.profile,[a,b]=p.contactU, h=sample(p.heightMm,u);
  const rawCamber=Math.max(...p.heightMm.slice(Math.floor(a*240),Math.ceil(b*240)+1));
  // Separate ramps meet at the traced near-zero contact plateaus; a small local
  // blend prevents changing one rise from introducing a step at the transition.
  const mid=d.camberMm/Math.max(rawCamber,.01), head=d.tipRiseMm/p.heightMm[0],tail=d.tailRiseMm/p.heightMm.at(-1);
  let f=mid;
  if(u<a) f=mix(head,mid,smoothstep((u-a+.015)/.015));
  if(u>b) f=mix(mid,tail,smoothstep((u-b)/.015));
  return h*f;
}
export function thicknessAt(model,d,u) {
  // A change to underfoot depth leaves the explicitly estimated thin ends alone.
  const blend=smoothstep(u/.18)*smoothstep((1-u)/.18);
  return sample(model.profile.thicknessMm,u)+(d.thicknessMm-model.profile.underfootThicknessMm)*blend;
}
function artUV(model,u,xFraction,side,base) {
  // With +Z nose and +Y top, a nose-up top camera sees +X on its left.
  // Opposite surface handedness is explicit so neither artwork reads mirrored.
  if(!base) xFraction=1-xFraction;
  const b=model.artBounds[(base?2:0)+side];
  const px=mix(sample(b.left,u)+1,sample(b.right,u)-1,xFraction);
  return [px/1667,1-mix(b.y0,b.y1,u)/3125];
}
export function generateMesh(model,d,{segments=360,side=0}={}) {
  // Include all constraint stations, preventing tessellation from missing an extremum.
  const us=[...new Set([0,1,...model.outline.landmarks,...model.profile.contactU,
    model.construction.estimatedTipSteelStartU,...Array.from({length:segments+1},(_,i)=>(1-Math.cos(Math.PI*i/segments))/2)])].sort((a,b)=>a-b);
  const positions=[],faces=[],materials=[],uvs=[],sections=[];
  const N=12;
  for(const u of us) {
    const w=Math.max(.15,widthAt(model,d,u)/2),h=heightAt(model,d,u),T=thicknessAt(model,d,u);
    const e=Math.min(model.construction.steelWidthMm,w*.24), sh=Math.min(.65,w*.15);
    const eh=model.construction.steelHeightMm, bh=model.construction.baseThicknessMm, shoulder=Math.min(.45,T*.1);
    const du=.0002, ua=clamp(u-du,0,1),ub=clamp(u+du,0,1);
    const slope=-(heightAt(model,d,ub)-heightAt(model,d,ua))/((ub-ua)*d.lengthMm);
    const norm=Math.sqrt(1+slope*slope);
    const ring=[[-w,0],[-w+e,0],[w-e,0],[w,0],[w,bh],[w,eh],[w-.1*sh,T-shoulder],
      [w-sh,T],[-w+sh,T],[-w+.1*sh,T-shoulder],[-w,eh],[-w,bh]];
    for(const [x,depth] of ring) positions.push([x/1000,(h+depth/norm)/1000,((.5-u)*d.lengthMm-depth*slope/norm)/1000]);
    sections.push({u,widthMm:2*w,heightMm:h,thicknessMm:T});
  }
  function face(v,mat,uv){faces.push(v);materials.push(mat);uvs.push(uv);}
  for(let i=0;i<us.length-1;i++)for(let j=0;j<N;j++) {
    const jj=(j+1)%N, indices=[i*N+j,(i+1)*N+j,(i+1)*N+jj,i*N+jj];
    const steel=us[i]>=model.construction.estimatedTipSteelStartU;
    const band=[steel?3:1,1,steel?3:1,steel?3:1,steel?3:2,2,0,0,0,2,steel?3:2,steel?3:1][j];
    const uv=indices.map(k=> {
      const ri=Math.floor(k/N),x=positions[k][0]*1000,w=sections[ri].widthMm;
      return artUV(model,us[ri],clamp(x/w+.5,0,1),side,band===1);
    });
    face(indices,band,uv);
  }
  // End caps triangulated from an interior center; no collapsed zero-area nose faces.
  for(const end of [0,us.length-1]) {
    const ids=Array.from({length:N},(_,j)=>end*N+j),center=[0,0,0];
    ids.forEach(id=>positions[id].forEach((v,k)=>center[k]+=v/N));
    const ci=positions.length;positions.push(center);
    for(let j=0;j<N;j++) {
      const v=end===0?[ci,ids[j],ids[(j+1)%N]]:[ci,ids[(j+1)%N],ids[j]];
      face(v,2,v.map(()=>[.5,.5]));
    }
  }
  return {schemaVersion:1,axes:'X across, Y up, +Z nose',units:'meters',definition:d,
    positions,faces,materials,uvs,sections,ringSize:N,topRingIndex:7,surfaces:SURFACES,
    source:{url:model.sourceUrl,image:model.imageUrl,sha256:model.imageSha256,warnings:model.warnings}};
}
