import {beveledBoxMesh} from '@arc/configurator/product/geometry';
const inch=.0254;

// Closed, smooth-sided cylinder with independent planar cap UVs and physical
// wood scale. The shared configuration core requires no new geometry rules.
export function cylinderMesh(radius,height,center=[0,0,0],segments=96){
  const positions=[],faces=[],uvs=[],normals=[];
  const add=(p,n)=>{positions.push(p.map((v,i)=>v+center[i]));normals.push(n);return positions.length-1;};
  const bevel=Math.min(.0008,height*.12),rings=[[-height/2,radius-bevel],[-height/2+bevel,radius],[height/2-bevel,radius],[height/2,radius-bevel]];
  for(let j=0;j<rings.length;j++)for(let i=0;i<=segments;i++){const a=i/segments*Math.PI*2,[y,r]=rings[j];add([Math.cos(a)*r,y,Math.sin(a)*r],j===0?[Math.cos(a)*.707,-.707,Math.sin(a)*.707]:j===3?[Math.cos(a)*.707,.707,Math.sin(a)*.707]:[Math.cos(a),0,Math.sin(a)]);}
  for(let j=0;j<3;j++)for(let i=0;i<segments;i++){const a=j*(segments+1)+i,b=a+segments+1;faces.push([a,b,b+1,a+1]);uvs.push([[i/segments*radius*2*Math.PI/.32,j/3*height/1.5],[i/segments*radius*2*Math.PI/.32,(j+1)/3*height/1.5],[(i+1)/segments*radius*2*Math.PI/.32,(j+1)/3*height/1.5],[(i+1)/segments*radius*2*Math.PI/.32,j/3*height/1.5]]);}
  for(const sign of [-1,1]){const mid=add([0,sign*height/2,0],[0,sign,0]),rim=[];for(let i=0;i<segments;i++){const a=i/segments*Math.PI*2;rim.push(add([Math.cos(a)*(radius-bevel),sign*height/2,Math.sin(a)*(radius-bevel)],[0,sign,0]));}for(let i=0;i<segments;i++){const f=sign>0?[mid,rim[(i+1)%segments],rim[i]]:[mid,rim[i],rim[(i+1)%segments]];faces.push(f);uvs.push(f.map(k=>[positions[k][2]/.32,positions[k][0]/1.5]));}}
  return {positions,faces,uvs,normals};
}
export function materialDescriptor(p){return {label:p.name,type:'physical',kind:p.kind,texture:p.kind==='wood'?`public/materials/${p.texture}.png`:null,color:p.color,neutralGrain:p.texture!=='walnut',grainContrast:p.grainStrength,grainScale:p.grainScale,roughness:p.roughness,metalness:p.kind==='steel'?.7:0,bumpScale:p.kind==='wood'?.00024:0};}
export function recipeScene(r,c){
  const L=c.length*inch,W=c.width*inch,H=c.height*inch,g=Object.fromEntries(Object.entries(r.geometry).map(([k,v])=>[k,v.value*inch]));
  const parts=[];const add=(id,label,mesh,role,material='wood',explode=[0,0,0],confidence='photo-derived')=>parts.push({id,label,mesh,role,material,explode,confidence});
  if(r.template==='parsons'){
    const leg=g.legWidth,slab=g.topThickness,edge=g.edgeDepth,seam=.0007;
    const box=(id,label,size,center,role,grain='x',explode=[0,0,0],material='wood')=>add(id,label,beveledBoxMesh(size,center,{grain,offset:parts.length*.217}),role,material,explode);
    for(const sx of [-1,1])for(const sz of [-1,1])box(`leg-${sx}-${sz}`,'Corner leg',[leg-seam,H,leg-seam],[sx*(L-leg)/2,H/2,sz*(W-leg)/2],'legs','y',[sx*.13,0,sz*.13]);
    box('top-field','Hardwood top',[L-2*leg,slab,W],[0,H-slab/2,0],'top','x',[0,.28,0]);
    for(const sx of [-1,1])box(`top-end-${sx}`,'Top end field',[leg-seam,slab,W-2*leg],[sx*(L-leg)/2,H-slab/2,0],'top','x',[0,.28,0]);
    if(edge>slab){for(const sz of [-1,1])box(`edge-long-${sz}`,'Mitered long edge',[L-2*leg,edge-slab,slab],[0,H-slab-(edge-slab)/2,sz*(W-slab)/2],'edge','x',[0,.12,sz*.055]);for(const sx of [-1,1])box(`edge-end-${sx}`,'Mitered end edge',[slab,edge-slab,W-2*leg],[sx*(L-slab)/2,H-slab-(edge-slab)/2,0],'edge','z',[sx*.055,.12,0]);}
    for(const sx of [-1,1])box(`brace-${sx}`,'Illustrative steel reinforcement',[.048,.009,W-.2],[sx*L*.26,H-slab-.008,0],'bracing','z',[0,-.16,0],'steel');
  }else{
    const slab=g.topThickness,foot=g.baseThickness,poleHeight=H-slab-foot-.008;
    add('round-top','Solid hardwood top',cylinderMesh(L/2,slab,[0,H-slab/2,0]),'top','wood',[0,.22,0],r.geometry.topThickness.confidence);
    add('mounting-plate','Illustrative underside mounting plate',cylinderMesh(Math.min(L*.20,.16),.006,[0,H-slab-.004,0],64),'bracing','base',[0,.08,0]);
    add('pedestal-column','Powder-coated steel column',cylinderMesh(g.columnDiameter/2,poleHeight,[0,foot+.004+poleHeight/2,0],64),'legs','base',[0,.035,0]);
    add('pedestal-foot','Powder-coated steel disk base',cylinderMesh(g.baseDiameter/2,foot,[0,foot/2,0]),'legs','base',[0,0,0]);
  }
  const finish=r.finishes.find(f=>f.id===c.finish),base=r.baseFinishes.find(f=>f.id===c.baseFinish);
  return {schemaVersion:1,units:'m',upAxis:'Y',productId:r.id,productVersion:r.version||'draft',source:r.sources[0].url,config:{...c},dimensions:{length:L,width:W,height:H},shape:r.template==='pedestal'?'round':'rectangular',parts,
    geometryKey:JSON.stringify([r.template,c.length,c.width,c.height,r.geometry]),camera:r.camera,
    materials:{wood:materialDescriptor(finish),base:materialDescriptor(base),steel:{label:'Steel',kind:'steel',color:'#303530',roughness:.44,metalness:.72}},
    notes:[r.notes,'Materials are illustrative. Custom sizes and estimated measurements require maker confirmation.'],
  };
}
