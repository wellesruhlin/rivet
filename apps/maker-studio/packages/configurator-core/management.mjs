export const CONNECTOR_PROVIDERS=['Spreadsheet / CSV','Shopify','QuickBooks','Xero','Katana','MRPeasy','Odoo','ERPNext','Fishbowl','Cin7','Business Central','NetSuite','Acumatica','Other'];
export const EXPORT_FIELDS={
  'id':'Order ID','createdAt':'Order date','build.id':'Build ID','build.productId':'Product ID','build.productVersion':'Product version','build.releaseId':'Product release','quote.id':'Quote ID','quote.itemCode':'Client item code','quote.quantity':'Quantity','quote.currency':'Currency','quote.unitMinor':'Unit price (minor units)','quote.shippingMinor':'Shipping (minor units)','quote.taxMinor':'Tax (minor units)','quote.totalMinor':'Total (minor units)','manufacturing.status':'Production status','build.config':'Configuration JSON',
};
export const DEFAULT_MAPPING=[['order_id','id'],['build_id','build.id'],['product_id','build.productId'],['item_code','quote.itemCode'],['quantity','quote.quantity'],['currency','quote.currency'],['unit_minor','quote.unitMinor'],['shipping_minor','quote.shippingMinor'],['tax_minor','quote.taxMinor'],['total_minor','quote.totalMinor'],['manufacturing_status','manufacturing.status'],['configuration_json','build.config']].map(([column,field])=>({column,field}));
export const RESOURCE_KINDS=['price-lists','policies','connectors'];
const object=v=>v!==null&&typeof v==='object'&&!Array.isArray(v);
const slug=v=>typeof v==='string'&&/^[a-z][a-z0-9-]{1,63}$/.test(v);
export function validateManaged(kind,draft,product){
  const issues=[],add=(field,message)=>issues.push({field,message});
  if(!RESOURCE_KINDS.includes(kind)||!object(draft))return [{field:'draft',message:'Choose a supported resource and supply a draft object.'}];
  const fields=kind==='price-lists'?['id','name','productId','currency','mode','baseMinor','adjustments','notes']:kind==='policies'?['id','name','productId','enabled','exclusions','notes']:['id','name','provider','transport','enabled','isDefault','endpoint','credentialRef','mapping','notes'];
  for(const key of Object.keys(draft))if(!fields.includes(key))add(key,`Unknown field: ${key}. Credentials must not be stored in configuration.`);
  if(!slug(draft.id))add('id','Use 2–64 lowercase letters, numbers and hyphens for the ID.');
  if(typeof draft.name!=='string'||!draft.name.trim()||draft.name.length>120)add('name','Name is required (up to 120 characters).');
  if(typeof draft.notes!=='string'||draft.notes.length>2000)add('notes','Notes must be text, up to 2,000 characters.');
  const rules=(list,amount)=>{
    if(!Array.isArray(list)||list.length>100){add(amount?'adjustments':'exclusions','Use up to 100 rules.');return;}
    for(const [i,r] of list.entries()){
      const prefix=(amount?'adjustments':'exclusions')+'.'+i;
      if(!object(r)){add(prefix,'Each rule must be an object.');continue;}
      const allowed=amount?['label','field','value','amountMinor']:['field','value','message'];
      if(Object.keys(r).some(k=>!allowed.includes(k)))add(prefix,'Rule contains unknown fields.');
      const field=product?.fields.find(f=>f.id===r.field);
      if(!field)add(prefix+'.field','Choose an existing configuration field.');
      else if(typeof r.value!==field.type||field.type==='number'&&!Number.isFinite(r.value))add(prefix+'.value',`Match values must be ${field.type}.`);
      if(typeof (amount?r.label:r.message)!=='string'||!(amount?r.label:r.message).trim()||(amount?r.label:r.message).length>240)add(prefix,'Give the rule a label or explanation, up to 240 characters.');
      if(amount&&(!Number.isSafeInteger(r.amountMinor)||Math.abs(r.amountMinor)>1000000000))add(prefix+'.amountMinor','Adjustments must be integer minor units within ±1,000,000,000.');
    }
  };
  if(kind!=='connectors'){
    if(!product||draft.productId!==product.id||draft.id!==product.id)add('productId','Use an existing product ID for this list and its ID.');
    if(kind==='policies'){if(typeof draft.enabled!=='boolean')add('enabled','Enabled must be true or false.');rules(draft.exclusions,false);}
    else{
      if(draft.currency!==product?.currency)add('currency','Use the product currency. Currency conversion is not automatic.');
      if(!['reference-plus-rules','fixed-plus-rules','quote-only'].includes(draft.mode))add('mode','Choose a supported pricing mode.');
      if(draft.mode==='fixed-plus-rules'&&(!Number.isSafeInteger(draft.baseMinor)||draft.baseMinor<1||draft.baseMinor>1000000000))add('baseMinor','Fixed base must be positive integer minor units.');
      if(draft.mode!=='fixed-plus-rules'&&draft.baseMinor!==null)add('baseMinor','Base must be null unless using fixed pricing.');
      rules(draft.adjustments,true);
    }
  }else{
    if(!CONNECTOR_PROVIDERS.includes(draft.provider))add('provider','Choose a supported destination label.');
    if(!['manual-file','api-planned'].includes(draft.transport))add('transport','Choose file delivery or planned API adapter.');
    for(const key of ['enabled','isDefault'])if(typeof draft[key]!=='boolean')add(key,`${key} must be true or false.`);
    if(draft.transport==='api-planned'&&(draft.enabled||draft.isDefault))add('enabled','API adapters are not installed yet. Save this profile as inactive.');
    if(draft.isDefault&&!draft.enabled)add('isDefault','The default file connector must be enabled.');
    if(typeof draft.credentialRef!=='string'||draft.credentialRef&&!/^[A-Z][A-Z0-9_]{2,80}$/.test(draft.credentialRef))add('credentialRef','Use an environment-variable name, not a credential value.');
    if(typeof draft.endpoint!=='string')add('endpoint','Endpoint must be text.');
    else if(draft.endpoint){try{const u=new URL(draft.endpoint);if(u.protocol!=='https:'||u.username||u.password||u.search||u.hash)throw Error();}catch{add('endpoint','Use an HTTPS base URL without credentials, query strings or fragments.');}}
    if(!Array.isArray(draft.mapping)||draft.mapping.length<2||draft.mapping.length>50)add('mapping','Add 2–50 export columns.');
    else {const columns=new Set();for(const [i,m] of draft.mapping.entries()){
      if(!object(m)||Object.keys(m).some(k=>!['column','field'].includes(k))||typeof m.column!=='string'||!m.column.trim()||m.column.length>80||/^[\s]*[=+@-]/.test(m.column)||/[\r\n]/.test(m.column)||columns.has(m.column))add('mapping.'+i,'Column names must be unique, plain text up to 80 characters.');
      columns.add(m?.column);if(!Object.hasOwn(EXPORT_FIELDS,m?.field||''))add('mapping.'+i+'.field','Choose an available export field.');
    }for(const required of ['id','quote.itemCode','quote.quantity'])if(!draft.mapping.some(m=>m?.field===required))add('mapping','Include order ID, client item code and quantity for reliable handoff.');}
  }
  return issues;
}
export const MANAGEMENT_CONTRACT={schemaVersion:1,basePath:'/api/handoff/manage',authentication:'Local maker session cookie from /api/handoff/login. Loopback only.',workflow:['Read /bundle and preserve revision numbers.','Edit draft objects; prices use integer minor units.','POST /proposals/validate with {changes:[{kind,id,revision,draft}],source:"agent"}.','POST /proposals/apply with the same body to save validated drafts atomically.','Review draft differences in /manage. Publish each resource with its current revision.'],resources:RESOURCE_KINDS,fields:{'price-lists':['id','name','productId','currency','mode','baseMinor','adjustments:[{label,field,value,amountMinor}]','notes'],policies:['id','name','productId','enabled','exclusions:[{field,value,message}]','notes'],connectors:['id','name','provider','transport','enabled','isDefault','endpoint','credentialRef','mapping:[{column,field}]','notes']},pricingModes:['reference-plus-rules','fixed-plus-rules','quote-only'],providers:CONNECTOR_PROVIDERS,exportFields:EXPORT_FIELDS,notes:['Agent source is a self-reported audit label, not an identity or permission.','Saving drafts never publishes. Published versions and accepted order snapshots stay immutable.','A planned API profile stores setup metadata only. It does not connect, test credentials or send requests.','Do not put secrets into config. credentialRef is an environment-variable name only.']};
MANAGEMENT_CONTRACT.endpoints=[
  {method:'GET',path:'/catalog',returns:'Products, typed configuration fields, choices and reference price rows'},
  {method:'GET',path:'/bundle',returns:'{schemaVersion,generatedAt,resources:[{kind,id,revision,draft,published}]}'},
  {method:'GET',path:'/contract',returns:'This API contract'},
  {method:'GET',path:'/history',returns:'Configuration change history'},
  {method:'POST',path:'/proposals/validate',body:'{source:"ui"|"agent",changes:[{kind,id,revision,draft}]}',returns:'Field differences; no mutation'},
  {method:'POST',path:'/proposals/apply',body:'Same proposal shape',returns:'Saved records; all changes commit together or none do'},
  {method:'POST',path:'/publish/:kind/:id',body:'{revision,source:"ui"|"agent"}',returns:'Record with a new immutable published version'},
  {method:'POST',path:'/connectors/test',body:'{draft:connectorConfiguration}',returns:'Local validation and sample CSV, or adapter-needed. No network transmission.'},
];
MANAGEMENT_CONTRACT.recipeApi={basePath:'/api/studio',authentication:'Same maker session cookie',endpoints:[
  {method:'GET',path:'/recipes',returns:'Recipe IDs, draft revisions and latest published versions'},
  {method:'GET',path:'/recipes/:id',returns:'{revision,draft,versions}'},
  {method:'PUT',path:'/recipes/:id',body:'{recipe,revision}',returns:'Validated saved draft'},
  {method:'POST',path:'/recipes/:id/publish',body:'{revision}',returns:'New immutable recipe version'},
  {method:'POST',path:'/recipes/:id/clone',body:'{id,title}',returns:'New unpublished quote-only recipe'},
  {method:'GET',path:'/materials',returns:'{revision,presets}'},
  {method:'PUT',path:'/materials',body:'{revision,presets}',returns:'Validated saved material presets'},
]};
