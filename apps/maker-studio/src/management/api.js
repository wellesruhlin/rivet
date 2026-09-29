export async function managedApi(path,body){
  const response=await fetch('/api/handoff/'+path,{method:body?'POST':'GET',...(body?{headers:{'Content-Type':'application/json'},body:JSON.stringify(body)}:{})});
  let data;try{data=await response.json();}catch{throw new Error('The maker service is unavailable. Start the local API and refresh.');}
  if(!response.ok)throw Object.assign(new Error(data.error||'Request failed.'),{status:response.status,issues:data.issues});return data;
}
export function downloadJson(value,name){const url=URL.createObjectURL(new Blob([JSON.stringify(value,null,2)],{type:'application/json'}));const a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
