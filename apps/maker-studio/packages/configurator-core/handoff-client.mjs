// The browser keeps a request identity before sending, so a lost response can
// be retried without making another build. No price is trusted by the service.
export async function submitForReview(product,config,{fetcher=fetch,storage=localStorage,reference=''}={}) {
  if(typeof reference!=='string'||reference.length>120)throw new Error('Build reference must be text of at most 120 characters.');
  const evaluated=product.evaluate(config),key='maker-handoff:'+product.id;
  const manifestResponse=await fetcher('/api/handoff/products/'+encodeURIComponent(product.id)+'?version='+encodeURIComponent(product.version));
  let manifest;try{manifest=await manifestResponse.json();}catch{throw new Error('The local maker service is unavailable. Start Maker Studio and try again.');}
  if(!manifestResponse.ok||!manifest.releaseId)throw new Error(manifest.error||'The product release could not be checked.');
  const selection=JSON.stringify({version:product.version,releaseId:manifest.releaseId,config:evaluated.config,quote:evaluated.quote,reference});
  let previous;try{previous=JSON.parse(storage.getItem(key));}catch{/* A corrupt local hint cannot change a server record. */}
  const request=previous?.selection===selection?previous:{selection,saved:false,payload:{
    id:crypto.randomUUID(),accessToken:(crypto.randomUUID()+crypto.randomUUID()).replaceAll('-',''),
    productId:product.id,productVersion:product.version,releaseId:manifest.releaseId,config:evaluated.config,expectedQuote:evaluated.quote,reference,
    ...(previous?.saved?{revises:previous.payload.id,previousAccessToken:previous.payload.accessToken}:{}),
  }};
  // Fail before submitting if durable client retry storage is unavailable.
  storage.setItem(key,JSON.stringify(request));
  const response=await fetcher('/api/handoff/builds',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(request.payload)});
  let result;try{result=await response.json();}catch{throw new Error('The local maker service is unavailable. Start Maker Studio and try again.');}
  if(!response.ok)throw new Error(result.error||'The build could not be saved.');
  storage.setItem(key,JSON.stringify({...request,saved:true}));
  return {id:result.build.id,accessToken:request.payload.accessToken};
}
export const reviewPath = ({id,accessToken}) => '/handoff/build/'+id+'#access='+accessToken;
