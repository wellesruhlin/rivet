import folsomArt from './data/folsom-art.json' with {type:'json'};
import folsomCatalog from './data/folsom.json' with {type:'json'};
import meierCatalog from './data/meier.json' with {type:'json'};
import grassCatalog from './data/grass.json' with {type:'json'};
export const asset=path=>`${import.meta.env?.BASE_URL||'./'}brands/${path}`;
export const colors={black:'#202426',blue:'#168acc',green:'#91c927',pink:'#e8489b',purple:'#7944a2',orange:'#f68232',red:'#d7383c',turquoise:'#23b8af',cork:'#bd9165',white:'#efefea',transparent:'#cbd6d0'};
export const brands={
 folsom:{id:'folsom',name:'Folsom',origin:'Handcrafted in Denver',tag:'Built to order',accent:'#24a8e9',source:'https://www.folsomskis.com/built-to-order',basePrice:1650,...folsomCatalog,defaultGraphic:'japow',graphicCatalog:folsomArt,graphics:folsomArt.art.map(a=>[a.id,a.name]),
 layups:{standard:{label:'Standard',description:'Poplar and bamboo core, with 90% fiberglass and 10% carbon. Folsom’s balanced everyday construction.',woods:['poplar','bamboo'],carbon:false},aggressive:{label:'Aggressive',description:'Maple, poplar and bamboo with a fiberglass–carbon layup. Approximately 25% stiffer than Standard for a more powerful ride.',woods:['maple','poplar','bamboo'],carbon:false},tour:{label:'Tour',description:'Aspen and poplar with a full carbon and Graphene Oxide layup. Approximately 300 g lighter per ski than Standard.',woods:['aspen','poplar'],carbon:true}}},
 meier:{id:'meier',name:'Meier',origin:'Handmade in Colorado',tag:'Craft your own',accent:'#729f41',source:'https://meierskis.com/pages/custom-skis',basePrice:1099,...meierCatalog,graphics:meierCatalog.models.map(m=>[m.id,m.name]),layups:{}},
 grass:{id:'grass',name:'Grass Sticks',origin:'Handmade in Steamboat Springs',tag:'Built by hand. Made for you.',accent:'#9ccd2f',source:'https://www.grasssticks.com/shop#!/Grass-Sticks-Ski-Poles/c/23444012',basePrice:134.95,...grassCatalog,graphics:[],layups:{}}
};
export const title=s=>s.replace(/(^|[- ])\w/g,x=>x.replace('-',' ').toUpperCase());
export const observed='2026-09-26';

