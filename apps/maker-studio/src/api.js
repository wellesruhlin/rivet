export async function request(path,data,signal) {
  const response=await fetch(`/api/${path}`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(data),signal});
  const result=await response.json();if(!response.ok)throw new Error(result.error||'The local service is unavailable.');return result;
}
export const productRequest=(product,config)=>({productId:product.id,productVersion:product.version,config});
export function downloadJson(value,filename) {const a=document.createElement('a');a.href=`/api/builds/${encodeURIComponent(value.id)}?download=1`;a.download=filename;document.body.append(a);a.click();a.remove();}
