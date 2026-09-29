// Grass Sticks (Steamboat Springs): bamboo ski poles, accessories, gifts and the kids'
// growth program, from the public shop. Independent outreach demo; not affiliated.
import catalog from './data/catalog.json' with {type:'json'};
export {colors,title} from './palette.js';
export {strapDesigns,engravingPrice,grassGroups} from './options.js';
// The id stays 'grass': saved builds, links and asset paths use it.
export const brand={id:'grass',name:'Grass Sticks',origin:'Handmade in Steamboat Springs',tag:'Built by hand. Made for you.',accent:'#9ccd2f',source:'https://www.grasssticks.com/shop#!/Grass-Sticks-Ski-Poles/c/23444012',basePrice:134.95,...catalog,graphics:[],layups:{}};
