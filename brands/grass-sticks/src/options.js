import {colors,title} from './palette.js';
import {formatMoney} from '@arc/configurator/engine';
const option=(value,label=value,text)=>({value,label,text});
export const strapDesigns=['Bridgers','Dark Side','Fantasia','Flow','Idaho 9','Lone 2','Lone Peak','Mount Tam','Purple Haze','Sacagawea','Spanish Peaks','Teton','The Grand','Wasatch Front'];
export const engravingPrice=text=>text.trim()?14+Math.ceil(Math.max(0,text.trim().length-6)/2)*1.25:0;
export function grassGroups({widgets,price}){
 const pole=(c,ctx)=>ctx.model?.kind==='poles'||ctx.model?.kind==='service';
 const service=c=>c.model==='length-change';
 const gift=(c,ctx)=>ctx.model?.kind==='gift';
 const basket=(c,ctx)=>pole(c,ctx)||c.model==='baskets';
 const visible=(test)=>({visible:test});
 const fixedUnless=(test,empty='')=>(c,ctx)=>test(c,ctx)?undefined:empty;
 const groups=[
  {id:'length',type:'number',label:'Length · cm',step:'size',min:40,max:200,default:(c,ctx)=>pole(c,ctx)?c.model==='kids'||service(c)?95:120:null,fixed:fixedUnless(pole,null),reason:(v,c,ctx)=>v>(ctx.model?.maxLength||200)?`This product is limited to ${ctx.model.maxLength} cm.`:'',format:v=>v?`${v} cm`:'',bom:pole,ui:{size:true,widget:widgets.length,...visible(pole)}},
  {id:'quantityType',type:'choice',label:'Trekking setup',step:'size',options:()=>[option('pair','Trekking pole pair'),option('single','Single hiking stick · −$45')],fixed:fixedUnless(c=>c.model==='trekking'),default:()=> 'pair',price:v=>v==='single'?-45:0,bom:c=>c.model==='trekking',ui:{display:'cards',...visible(c=>c.model==='trekking')}},
  {id:'grip',type:'choice',label:'Grip color',step:'options',options:()=>['black','cork','blue','green','pink','purple','orange','red','turquoise'].map(v=>({...option(v,title(v)+(v==='cork'?` · +${formatMoney(price('grip:cork',14))}`:'')),color:colors[v]})),fixed:fixedUnless(pole),default:()=> 'green',price:v=>v==='cork'?price('grip:cork',14):0,bom:pole,ui:{widget:widgets.swatches,...visible(pole)}},
  {id:'basket',type:'choice',label:'Basket size',step:'options',options:c=>[...(service(c)?[option('reuse','Reuse my baskets')]:[]),{...option('tiny','Tiny · 2 in',service(c)?'Black only · +$12':c.model==='touring'||c.model==='trekking'?'Black only':'Unavailable'),disabled:!['touring','trekking','length-change'].includes(c.model)},option('medium','Medium · 4 in',service(c)?'Replacement · +$12':'All-mountain size'),{...option('powder','Powder · 4.75 in',service(c)?'Black only · +$12':'Currently unavailable'),disabled:!service(c)}],fixed:(c,ctx)=>!basket(c,ctx)?'':c.model==='trekking'?'tiny':undefined,default:c=>service(c)?'reuse':'medium',price:(v,c)=>service(c)&&v!=='reuse'?12:0,bom:basket,ui:{display:'cards',...visible(basket)}},
  {id:'basketColor',type:'choice',label:'Basket color',step:'options',options:()=>['black','white','transparent','blue','green','pink','purple','orange','red','turquoise'].map(v=>({...option(v,title(v)),color:colors[v]})),fixed:(c,ctx)=>!basket(c,ctx)||c.basket==='reuse'?'':c.basket!=='medium'?'black':undefined,default:()=> 'green',bom:(c,ctx)=>basket(c,ctx)&&c.basket!=='reuse',ui:{widget:widgets.swatches,...visible((c,ctx)=>basket(c,ctx)&&c.basket==='medium')}},
  {id:'strap',type:'choice',label:'Straps',step:'options',options:c=>[...(service(c)?[option('reuse','Reuse my straps')]:[]),option('fixed','Beige fixed'),option('adjustable','Beige adjustable'),...(!service(c)?[option('none','No straps')]:[]),option('mtn','Printed MTN Straps')],fixed:fixedUnless(pole),default:c=>service(c)?'reuse':'fixed',price:(v,c)=>v==='mtn'?19.99:v==='adjustable'?price('strap:adjustable',10):v==='none'?-3:v==='fixed'&&service(c)?8:0,bom:pole,ui:{display:'list',...visible(pole)}},
  {id:'strapDesign',type:'choice',label:'MTN Straps design',step:'options',options:()=>strapDesigns.map(v=>option(v)),default:()=>strapDesigns[0],fixed:fixedUnless(c=>c.strap==='mtn'||c.model==='mtn-straps'),bom:c=>c.strap==='mtn'||c.model==='mtn-straps',ui:{widget:widgets.straps,...visible(c=>c.strap==='mtn'||c.model==='mtn-straps')}},
  ...['engraving1','engraving2'].map((id,i)=>({id,type:'text',label:`Engraving · pole ${i+1}`,step:'options',maxLength:40,share:false,fixed:fixedUnless((c,ctx)=>ctx.model?.kind==='poles'&&c.model!=='trekking'),ui:{placeholder:'Optional · up to 40 characters',...visible((c,ctx)=>ctx.model?.kind==='poles'&&c.model!=='trekking')}})),
  {id:'engravingCharge',type:'choice',label:'Engraving',step:'options',fixed:()=> 'calculated',format:(v,c)=>[c.engraving1,c.engraving2].filter(Boolean).join(' / '),price:(v,c)=>engravingPrice(c.engraving1||'')+engravingPrice(c.engraving2||''),bom:c=>!!(c.engraving1||c.engraving2),ui:{visible:()=>false}},
  {id:'originalOrder',type:'text',label:'Original Kids Sticks order reference',step:'options',maxLength:120,share:false,fixed:fixedUnless(service),ui:{placeholder:'Order number, name or email · stays on this device',...visible(service)}},
  {id:'giftFormat',type:'choice',label:'Gift card format',step:'options',options:()=>[option('digital','Printable or emailable'),option('physical','Physical card + bamboo key chain · +$5')],default:()=> 'digital',fixed:fixedUnless(gift),price:v=>v==='physical'?5:0,bom:gift,ui:{display:'cards',...visible(gift)}},
 ];
 const upgrades=[['giftEngraving','Engraving',14],['giftMtn','Printed adjustable MTN Straps',19.99],['giftCork','Cork grips',14],['giftAdjustable','Adjustable straps',10],['giftTouring','Touring grips',12],['giftBaskets','Extra baskets',10],['giftTorch','Torched sticks',17],['giftHat','Add a hat',22]];
 for(const [id,label,amount] of upgrades){const allowed=(c,ctx)=>gift(c,ctx)&&(c.model!=='gift-kids'||['giftMtn','giftAdjustable','giftBaskets','giftHat'].includes(id));const cost=c=>c.model==='gift-kids'?(id==='giftMtn'?18:id==='giftHat'?20:amount):amount;groups.push({id,type:'toggle',label,step:'options',fixed:fixedUnless(allowed,false),price:(v,c)=>v?cost(c):0,bom:(c,ctx)=>allowed(c,ctx)&&c[id],ui:{...visible(allowed)}});}
 groups.push({id:'included',type:'choice',label:'Included with your product',step:'options',fixed:()=> 'included',bom:false,ui:{visible:c=>['coat-kit','tip-covers'].includes(c.model),widget:widgets.productInfo}});
 return groups;
}


