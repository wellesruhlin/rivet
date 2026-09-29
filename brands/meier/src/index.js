// Meier Skis (Colorado): the current shapes with their house graphics, custom artwork and
// the artist program, from the public custom-skis page. Independent outreach demo.
import catalog from './data/catalog.json' with {type:'json'};
import outlines from './data/outlines.json' with {type:'json'};
export const brand={id:'meier',name:'Meier',origin:'Handmade in Colorado',tag:'Craft your own',accent:'#729f41',source:'https://meierskis.com/pages/custom-skis',basePrice:1099,...catalog,graphics:catalog.models.map(m=>[m.id,m.name]),outlines,layups:{}};
