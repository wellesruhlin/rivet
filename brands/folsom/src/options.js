// Descriptions adapted from Folsom's public rocker/camber and Why Custom guides.
// Heights are illustrative visual parameters, not published manufacturing dimensions.
export const rockerProfiles={
 'Full Camber':{description:'Continuous camber for firm-snow precision and an energetic finish to each turn. Best suited to carving.',tip:.09,tail:.07,tipHeight:32,tailHeight:12,camber:8},
 'Traditional Rocker':{description:'A little early rise at the tip, with camber running toward the tail. Strong edge hold and a powerful turn finish.',tip:.14,tail:.08,tipHeight:43,tailHeight:14,camber:7},
 'Directional Rocker':{description:'Moderate tip rocker, a small amount at the tail, and camber underfoot. Easier turn entry with a supportive finish.',tip:.22,tail:.14,tipHeight:55,tailHeight:25,camber:6},
 'Everyday Rocker':{description:'Progressive rocker at both ends with camber underfoot. A versatile balance of float, quick turns and rebound.',tip:.27,tail:.23,tipHeight:62,tailHeight:47,camber:5},
 'Powder Rocker':{description:'More rise at the tip and tail for soft-snow float and easy release. A looser feel than the lower-rocker profiles.',tip:.33,tail:.29,tipHeight:78,tailHeight:63,camber:3},
 'Shallow Reverse Camber':{description:'A continuous, shallow rocker curve with no camber pocket. Smooth and easy to pivot in soft snow, with a surf-like feel.',reverse:true}
};
export const tailShapes={
 Round:'A rounded finish for a freeride-oriented build. Pairs naturally with a playful, rockered tail.',
 Flat:'A squared-off finish for a more traditional carving look and a defined edge for climbing-skin clips.',
 Touring:'A touring-oriented tail finish designed around climbing-skin attachment. Folsom confirms the final clip interface.',
 Swallowtail:'A split, surf-inspired tail intended for deep-snow skiing.'
};
export function profileHeight(profile,u){
 const p=rockerProfiles[profile]||rockerProfiles['Directional Rocker'];
 if(p.reverse)return 62*Math.pow(Math.abs((u-.5)/.5),2.3);
 const tip=p.tipHeight*Math.pow(Math.max(0,(p.tip-u)/p.tip),2);
 const tail=p.tailHeight*Math.pow(Math.max(0,(u-(1-p.tail))/p.tail),2);
 const center=(u-p.tip)/(1-p.tail-p.tip);
 return tip+tail+(center>0&&center<1?p.camber*Math.pow(Math.sin(Math.PI*center),2):0);
}
export const folsomBindings=[
 {id:'marker-squire',name:'Marker Squire',price:230,description:'A compact, lighter binding with a Triple Pivot Light toe and Hollow Linkage heel.',reference:'Squire 11',source:'https://markerbindings.com/en-us/p/squire-11-bindings-2026'},
 {id:'marker-jester',name:'Marker Jester',price:400,description:'A more substantial freeride binding with a Triple Pivot Elite toe and Inter Pivot heel.',reference:'Jester 16',source:'https://markerbindings.com/en-us/p/jester-16-bindings-2026'}
];
