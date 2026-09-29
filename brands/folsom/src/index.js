// Folsom Custom Skis (Denver): built-to-order shapes, the graphics library, layups, rocker
// and tail options and Marker bindings, from the public site. Independent outreach demo.
import catalog from './data/catalog.json' with {type:'json'};
import art from './data/art.json' with {type:'json'};
import outlines from './data/outlines.json' with {type:'json'};
export {rockerProfiles,tailShapes,profileHeight,folsomBindings} from './options.js';
export const brand={id:'folsom',name:'Folsom',origin:'Handcrafted in Denver',tag:'Built to order',accent:'#24a8e9',source:'https://www.folsomskis.com/built-to-order',basePrice:1650,...catalog,defaultGraphic:'japow',graphicCatalog:art,graphics:art.art.map(a=>[a.id,a.name]),outlines,
 layups:{standard:{label:'Standard',description:'Poplar and bamboo core, with 90% fiberglass and 10% carbon. Folsom’s balanced everyday construction.',woods:['poplar','bamboo'],carbon:false},aggressive:{label:'Aggressive',description:'Maple, poplar and bamboo with a fiberglass–carbon layup. Approximately 25% stiffer than Standard for a more powerful ride.',woods:['maple','poplar','bamboo'],carbon:false},tour:{label:'Tour',description:'Aspen and poplar with a full carbon and Graphene Oxide layup. Approximately 300 g lighter per ski than Standard.',woods:['aspen','poplar'],carbon:true}}};
