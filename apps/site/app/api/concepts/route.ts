import { requestDb,requestBucket } from "@/db/requests";
import { conceptSchema } from "@/lib/request-validation";
export const dynamic="force-dynamic";
const MAX_BODY=6*1024*1024,MAX_FILE=5*1024*1024;
function json(data:unknown,status=200){return Response.json(data,{status,headers:{"Cache-Control":"no-store"}})}
export async function POST(request:Request){
try{
const origin=request.headers.get("origin");if(origin&&origin!==new URL(request.url).origin)return json({error:"Please submit this form from the Rivet website."},403);
if(!request.headers.get("content-type")?.startsWith("multipart/form-data"))return json({error:"Please use the request form."},415);
if(Number(request.headers.get("content-length")||0)>MAX_BODY)return json({error:"Please keep your file under 5 MB."},413);
const reader=request.body?.getReader();if(!reader)return json({error:"Your request was empty."},400);
const chunks:Uint8Array[]=[];let size=0;while(true){const {done,value}=await reader.read();if(done)break;size+=value.byteLength;if(size>MAX_BODY){await reader.cancel();return json({error:"Please keep your file under 5 MB."},413)}chunks.push(value)}
const bounded=new Response(new Blob(chunks as BlobPart[]),{headers:{"Content-Type":request.headers.get("content-type")!}});
const form=await bounded.formData();
const parsed=conceptSchema.safeParse(Object.fromEntries(["requestId","name","email","website","options","notes","companyFax"].map(k=>[k,String(form.get(k)||"")])));
if(!parsed.success)return json({error:parsed.error.issues[0].message},400);
const data=parsed.data,db=requestDb();
const existing=await db.prepare("SELECT id FROM concept_requests WHERE id = ?").bind(data.requestId).first();
if(existing)return json({id:data.requestId},200);
const now=Math.floor(Date.now()/1000);
const recent=await db.prepare("SELECT COUNT(*) AS count FROM concept_requests WHERE email = ? AND created_at > ?").bind(data.email,now-600).first<{count:number}>();
if((recent?.count||0)>=3)return json({error:"We have your recent requests. Please wait a few minutes before submitting another."},429);
let fileKey:string|null=null,fileName:string|null=null,fileType:string|null=null,fileSize:number|null=null;
const file=form.get("catalog");if(file instanceof File&&file.size>0){
if(file.size>MAX_FILE)return json({error:"Please choose a file smaller than 5 MB."},413);
const bytes=new Uint8Array(await file.slice(0,8).arrayBuffer());
fileType=bytes[0]===0x25&&bytes[1]===0x50&&bytes[2]===0x44&&bytes[3]===0x46&&bytes[4]===0x2d?"application/pdf":bytes[0]===0x89&&bytes[1]===0x50&&bytes[2]===0x4e&&bytes[3]===0x47&&bytes[4]===0x0d&&bytes[5]===0x0a&&bytes[6]===0x1a&&bytes[7]===0x0a?"image/png":bytes[0]===0xff&&bytes[1]===0xd8&&bytes[2]===0xff?"image/jpeg":null;
if(!fileType)return json({error:"Please attach a PDF, PNG, or JPEG file."},400);
fileName=file.name.replace(/[^a-zA-Z0-9._ -]/g,"_").slice(0,160)||"product-file";fileKey="concepts/"+data.requestId+"/"+fileName;fileSize=file.size;
await requestBucket().put(fileKey,file.stream(),{httpMetadata:{contentType:fileType},customMetadata:{requestId:data.requestId}});
}
await db.prepare("INSERT INTO concept_requests (id, name, email, website, options, notes, status, file_key, file_name, file_type, file_size, created_at) VALUES (?, ?, ?, ?, ?, ?, 'new', ?, ?, ?, ?, ?) ON CONFLICT(id) DO NOTHING").bind(data.requestId,data.name,data.email,data.website,data.options,data.notes,fileKey,fileName,fileType,fileSize,now).run();
return json({id:data.requestId},201);
}catch(error){console.error("Concept request could not be saved",error instanceof Error?error.message:"Storage error");return json({error:"We couldn’t save your request just now. Your details are still here—please try again."},503)}
}