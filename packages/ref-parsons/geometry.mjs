import {beveledBoxMesh} from '@arc/configurator/product/geometry';
export const inch=.0254;
export function tableScene(config) {
  const L=config.length*inch, W=config.width*inch,H=config.height*inch;
  const leg=4*inch, edge=3*inch, slab=1.625*inch, seam=.0007;
  const parts=[];
  const add=(id,label,size,center,grain='x',extra={})=>parts.push({id,label,material:'wood',mesh:beveledBoxMesh(size,center,{grain,offset:parts.length*.217}),explode:[0,0,0],...extra});
  // Corner posts reach the tabletop, matching the published product photos.
  for(const sx of [-1,1])for(const sz of [-1,1]) add(`leg-${sx}-${sz}`,'Solid wood corner leg',[leg-seam,H,leg-seam],[sx*(L-leg)/2,H/2,sz*(W-leg)/2],'y',{role:'legs',explode:[sx*.13,0,sz*.13],confidence:'published 4-inch section; corner integration photo-derived'});
  // A central field with short end pieces fills the top around the corner posts.
  add('top-field','Solid hardwood top',[L-2*leg,slab,W],[0,H-slab/2,0],'x',{role:'top',explode:[0,.28,0],confidence:'1.625-inch illustration within the published 1.5–1.75-inch range'});
  for(const sx of [-1,1]) add(`top-end-${sx}`,'Top between corner posts',[leg-seam,slab,W-2*leg],[sx*(L-leg)/2,H-slab/2,0],'x',{role:'top',explode:[0,.28,0],confidence:'photo-derived corner topology'});
  const skirt=edge-slab;
  for(const sz of [-1,1]) add(`miter-long-${sz}`,'Mitered long edge',[L-2*leg,.999*skirt,slab],[0,H-slab-skirt/2,sz*(W-slab)/2],'x',{role:'edge',explode:[0,.12,sz*.055],confidence:'published 3-inch apparent edge; internal miter illustrative'});
  for(const sx of [-1,1]) add(`miter-end-${sx}`,'Mitered end edge',[slab,.999*skirt,W-2*leg],[sx*(L-slab)/2,H-slab-skirt/2,0],'z',{role:'edge',explode:[sx*.055,.12,0],confidence:'published 3-inch apparent edge; internal miter illustrative'});
  for(const sx of [-1,1]) add(`brace-${sx}`,'Steel reinforcement',[.048,.009,W-.2],[sx*L*.26,H-slab-.008,0],'z',{material:'steel',role:'bracing',bevel:.001,explode:[0,-.16,0],confidence:'steel reinforcement is published; count, position and section are illustrative'});
  return {schemaVersion:1,units:'m',upAxis:'Y',productId:'ref-parsons',config:{...config},dimensions:{length:L,width:W,height:H},parts,cameras:{studio:{position:[L*1.15,H*2.2,W*2.5],target:[0,H*.42,0]},detail:{position:[L*.85,H*1.4,W*1.2],target:[L*.35,H*.86,W*.3]}},notes:['Geometry follows published envelope, leg and apparent edge dimensions. Internal bracing and concealed joints are illustrative.','Finish appearance is an approximation; actual wood varies.']};
}
