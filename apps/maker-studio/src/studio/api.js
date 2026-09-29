export async function api(path,body,method=body?'POST':'GET',signal){
  const response=await fetch(`/api/${path}`,{method,signal,...(body?{headers:{'Content-Type':'application/json'},body:JSON.stringify(body)}:{})});
  const data=await response.json();if(!response.ok)throw Object.assign(new Error(data.error||'The local service is unavailable.'),{status:response.status,issues:data.issues});return data;
}
export function exportJSON(value,name){const url=URL.createObjectURL(new Blob([JSON.stringify(value,null,2)],{type:'application/json'}));const a=document.createElement('a');a.href=url;a.download=name;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);}
