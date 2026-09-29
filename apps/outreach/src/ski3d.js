import {across,strip,rail} from '@rivet/ski-geometry';
import {rockerProfiles,tailShapes,profileHeight,folsomBindings} from '@rivet/brand-folsom';
import {asset} from './catalog.js';

export const modelDimensions=(model,length)=>model.dimsByLength?.[length]||model.dims;
const interpolate=(values,u)=>{const p=Math.max(0,Math.min(1,u))*(values.length-1),i=Math.min(values.length-2,Math.floor(p));return values[i]+(values[i+1]-values[i])*(p-i);};

export function skiShape(config,ctx){
 const m=ctx.model, L=(config.length||m.lengths[0])*10;
 const [tip,waist,tail]=modelDimensions(m,config.length);
 const outline=ctx.brand.outlines?.[m.id];
 // Trace each model's published planform, then calibrate to its length-specific dimensions.
 // One continuous interpolation avoids the detached cap/shoulder of the old generic curve.
 const tipU=outline.widths.slice(0,104).reduce((best,v,i,all)=>v>all[best]?i:best,0)/256;
 const tailU=(outline.widths.slice(160).reduce((best,v,i,all)=>v>all[best]?i:best,0)+160)/256;
 const waistU=(outline.widths.slice(88,190).reduce((best,v,i,all)=>v<all[best]?i:best,0)+88)/256;
 const anchors=[[0,tip/outline.tip],[Math.max(.02,tipU),tip/outline.tip],[waistU,waist/outline.waist],[Math.min(.98,tailU),tail/outline.tail],[1,tail/outline.tail]];
 const widthAt=u=>{const i=Math.max(1,anchors.findIndex(p=>p[0]>=u)),[a,x]=anchors[i-1],[b,y]=anchors[i],t=Math.max(0,Math.min(1,(u-a)/(b-a)));const finish=ctx.brand.id==='folsom'&&['Flat','Touring'].includes(config.tail);const sampleU=finish&&u>.94?.94+(u-.94)*(config.tail==='Flat'?.7:.8):u;return Math.max(.4,interpolate(outline.widths,sampleU)*(x+(y-x)*t*t*(3-2*t)));};
 const asymmetric=m.id==='norheim-telemark-skis-1';
 const centerAt=asymmetric?u=>(interpolate(outline.centers,u)-interpolate(outline.centers,.5))*waist/outline.waist:undefined;
 const powder=config.profile?.includes('Powder')||config.profile?.includes('Reverse');
 const heightAt=u=>ctx.brand.id==='folsom'?profileHeight(config.profile,u):Math.pow(Math.max(0,(.2-u)/.2),2)*55+Math.pow(Math.max(0,(u-.83)/.17),2)*(config.tail==='Flat'?10:30)+(powder?0:4*Math.sin(Math.PI*u));
 return {key:`${m.id}|${L}|${config.profile}|${config.tail}`,lengthMm:L,tipMm:tip,waistMm:waist,tailMm:tail,mountMm:-70,widthAt,heightAt,centerAt,mirrorPair:asymmetric,thicknessAt:u=>2.6+10*Math.pow(Math.sin(Math.PI*u),1.2),steelWidthMm:2,steelHeightMm:2,baseMm:1.4,steelStartU:.018,stations:Array.from({length:257},(_,i)=>i/256)};
}
export function storedArt(id){try{return id?localStorage.getItem(`studio-art-${id}`):null;}catch{return null;}}
export function skiLayers(brand,c,ctx){
 const art=brand.id==='meier'&&c.design==='upload'?storedArt(c.artId):null;
 const graphic=c.graphic||brand.graphics[0][0];
 const length=(c.length||ctx.model.lengths[0])*10,width=Math.max(...modelDimensions(ctx.model,c.length));
 const side=s=>art?[{href:asset('meier/wood.webp')},{href:art,x:width*(1-(c.scale||100)/100)/2,y:length*((c.position||50)/100-.35),width:width*(c.scale||100)/100,height:length*.7*(c.scale||100)/100}]:[{href:asset(`${brand.id}/${graphic}-${s}.webp`)}];
 return {left:side('l'),right:side('r')};
}
export function createSki3d(brand){
 const layup=(c,ctx)=>ctx.model.id==='hayden'?{label:'Junior bamboo',description:'Bamboo core with fiberglass composite and Everyday Rocker.',woods:['bamboo'],carbon:false}:brand.layups[c.layup]||{label:ctx.model.name+' wood core',description:ctx.model.core,woods:ctx.model.id==='doc'?['aspen','poplar']:['poplar','maple'],carbon:false};
 return {
  animateShape:brand.id==='folsom',
  binding(id){const b=folsomBindings.find(b=>b.id===id);return b?{key:b.id,url:asset('folsom/bindings/'+b.id+'.glb'),caption:b.name,colorway:'Black'}:null;},
  views:[{value:'Topsheet',label:'Front',camera:'front'},{value:'Base',label:'Back',camera:'back'},{value:'Sidewall',label:'Sidewall',camera:'sidewall'},...(brand.id==='folsom'?[{value:'Profile',label:'Profile',camera:'profile'},{value:'Bindings',label:'Bindings',camera:'bindings'}]:[]),{value:'3D',label:'3D',camera:'orbit'},...(brand.id==='folsom'?[{value:'Construction',label:'Inside',camera:'construction'}]:[]),{value:'Technical',label:'Tech Specs',camera:'tech'}],
  shape:skiShape,
  surfaces(c,ctx){return {key:`${c.graphic}|${c.artId}|${c.design}|${c.scale}|${c.position}`,top:skiLayers(brand,c,ctx),base:{left:[{fill:'#202326'}],right:[{fill:'#202326'}]},finish:brand.id==='meier'?'wood':'nylon',sidewall:'#191c1d'};},
  construction(c,ctx){const l=layup(c,ctx);return {key:c.layup||c.model,veneer:false,stack:()=>[
   {id:'top',key:'top',material:'topsheet',artwork:'top',bounds:across(),bottom:s=>s.thicknessMm-.5,top:s=>s.thicknessMm,explode:[0,.16,0]},
   {id:'upper',key:'composite',material:l.carbon?'carbon':'triax',bounds:across(.6),bottom:s=>s.thicknessMm-1.5,top:s=>s.thicknessMm-.6,explode:[0,.12,0]},
   ...Array.from({length:9},(_,i)=>({id:`core-${i}`,key:'core',material:l.woods[i%l.woods.length],bounds:strip(i,9),bottom:()=>3.2,top:s=>s.thicknessMm-1.6,explode:[0,.07,0]})),
   ...[-1,1].map(side=>({id:`wall${side}`,key:'wall',material:'sidewall',bounds:rail(side,0,2.8),bottom:()=>2.6,top:s=>s.thicknessMm-.6,explode:[side*.01,.07,0]})),
   {id:'lower',key:'composite',material:l.carbon?'carbon':'triax',bounds:across(.8),bottom:()=>1.5,top:()=>2.8,explode:[0,.035,0]},
   {id:'base',key:'base',material:'base',artwork:'base',bounds:across(1.6),bottom:()=>0,top:()=>1.4,explode:[0,0,0]},
   ...[-1,1].map(side=>({id:`edge${side}`,key:'edge',material:'steel',bounds:rail(side,0,1.8),bottom:()=>0,top:()=>2,explode:[side*.008,0,0]}))
  ],legend:[{key:'top',name:'Protective topsheet',spec:'Your selected Folsom artwork',color:'#78959e'},{key:'composite',name:c.model==='hayden'?'Fiberglass':l.carbon?'Carbon layup':'Fiberglass + carbon',spec:c.model==='hayden'?'Fiberglass composite':l.carbon?'100% carbon + Graphene Oxide':'90% fiberglass · 10% carbon',color:'#b0bdb0'},{key:'core',name:l.label+' core',spec:l.woods.map(w=>w[0].toUpperCase()+w.slice(1)).join(' · '),color:'#be9c5d'},{key:'wall',name:'Sidewalls',spec:'Full-length protection',color:'#717878'},{key:'base',name:'Ski base',spec:'Shown in black',color:'#414545'},{key:'edge',name:'Steel edges',spec:'Perimeter reinforcement',color:'#999fa3'}]};},
  heading(c,ctx,{sample,cameraView}){const l=layup(c,ctx);return {eyebrow:sample?'':brand.origin,title:sample?'Custom Skis':ctx.model.name,lines:sample?[]:cameraView==='profile'?[c.profile,rockerProfiles[c.profile]?.description]:cameraView==='construction'?[`${l.label} construction`,l.description]:[ctx.model.summary],finish:cameraView==='profile'?`${c.tail} tail · illustrative profile`:cameraView==='construction'?'Illustrative layer thickness and placement':cameraView==='back'?'Black base · topsheet artwork is on the front':brand.id==='meier'&&c.design==='upload'?(storedArt(c.artId)?'Your artwork · placement preview':'Upload your artwork to preview it'):brand.graphics.find(g=>g[0]===c.graphic)?.[1]};},
  techSpecs(c,ctx){const m=ctx.model,r=m.radii[m.lengths.indexOf(c.length)];return [['Length',`${c.length} cm`],['Tip / waist / tail',modelDimensions(m,c.length).join(' / ')+' mm'],['Turn radius',Number.isFinite(r)?`${r} m`:m.radiusNote||'Not published for this length'],...(c.profile?[['Profile',c.profile]]:[]),['Construction',layup(c,ctx).label],['Made in','Colorado, USA']];},
  disclosure(c,ctx,camera){return [...(camera==='bindings'?['Marker models are exterior studies made in Blender from public Squire 11 and Jester 16 reference photographs. Folsom lists Squire and Jester without a model year, color or brake size; those details and boot compatibility require confirmation.']:[]),`Planform traced from ${brand.name}’s ${ctx.model.name} product image and scaled to published dimensions. Rocker and thickness are illustrative, not manufacturing measurements.`, 'Artwork comes from the maker’s public catalog. Base color, natural wood grain and the final custom tail finish are confirmed by the maker.'];}
 };
}
