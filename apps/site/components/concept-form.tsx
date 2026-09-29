"use client";
import { useEffect,useRef,useState,type FormEvent } from "react";
import { conceptSchema } from "@/lib/request-validation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
export function ConceptForm(){
const [status,setStatus]=useState<"idle"|"saving"|"success">("idle"),[error,setError]=useState(""),[reference,setReference]=useState("");
const requestId=useRef("");
const formRef=useRef<HTMLFormElement>(null);
useEffect(()=>{
type Context={registerTool:(tool:unknown,options:{signal:AbortSignal})=>void|Promise<void>};
const context=(document as Document&{modelContext?:Context}).modelContext;
if(!context?.registerTool)return;
const lifecycle=new AbortController();
Promise.resolve(context.registerTool({name:"prepare_concept_request",title:"Prepare a Rivet concept request",description:"Fill the product concept form for review. This does not submit or send the request; the visitor must use Request a concept to send it.",inputSchema:{type:"object",properties:{name:{type:"string"},email:{type:"string"},website:{type:"string"},options:{type:"string"},notes:{type:"string"}},required:["name","email","website","options"],additionalProperties:false},annotations:{readOnlyHint:false,untrustedContentHint:false},execute(input:unknown){
if(!input||typeof input!=="object")throw new Error("Provide the requested form fields.");
const parsed=conceptSchema.parse({...input,requestId:crypto.randomUUID(),companyFax:""});
const form=formRef.current;if(!form)throw new Error("The form is not available after a request is submitted.");
for(const key of ["name","email","website","options","notes"] as const){const field=form.elements.namedItem(key);if(field instanceof HTMLInputElement||field instanceof HTMLTextAreaElement)field.value=parsed[key]}
form.scrollIntoView({behavior:"smooth",block:"center"});return {status:"prepared",submitted:false,website:parsed.website};
}},{signal:lifecycle.signal})).catch(()=>{});
return()=>lifecycle.abort();
},[]);
async function submit(event:FormEvent<HTMLFormElement>){
event.preventDefault();setError("");
const form=event.currentTarget;if(!form.reportValidity())return;
const data=new FormData(form),file=data.get("catalog");
if(file instanceof File&&file.size>5*1024*1024){setError("Choose a PDF, PNG, or JPEG smaller than 5 MB.");return}
if(!requestId.current)requestId.current=crypto.randomUUID();data.set("requestId",requestId.current);
setStatus("saving");
try{const res=await fetch("/api/concepts",{method:"POST",body:data});const result=await res.json() as {id?:string;error?:string};
if(!res.ok)throw new Error(result.error||"Your request could not be saved. Please try again.");
setReference(result.id?.slice(0,8).toUpperCase()||"");setStatus("success");
}catch(err){setStatus("idle");setError(err instanceof Error?err.message:"We couldn’t save your request. Please try again. Your details are still here.");}
}
if(status==="success")return <div className="form-success" role="status" tabIndex={-1}><span className="success-mark" aria-hidden="true">✓</span><h3>Your product is on our radar.</h3><p>Thanks for sharing it. Welles will review your details and follow up by email about fit and next steps.</p><p className="small">Request {reference}. A concept comes after we confirm the fit.</p><a href="/demo" className="text-link">Explore the full demo ↗</a></div>;
return <form ref={formRef} className="concept-form" onSubmit={submit} aria-label="Request a product concept">
<div className="form-pair"><label htmlFor="name">Your name<Input id="name" name="name" autoComplete="name" required maxLength={120} placeholder="Alex Taylor" /></label><label htmlFor="email">Business email<Input id="email" name="email" type="email" autoComplete="email" required maxLength={254} placeholder="alex@yourcompany.com" /></label></div>
<label htmlFor="website">Website or product link<Input id="website" name="website" type="text" inputMode="url" autoComplete="url" required maxLength={2000} placeholder="yourcompany.com / a catalog / a product page" /></label>
<label htmlFor="options">What can your customers customize?<Textarea id="options" name="options" required minLength={10} maxLength={4000} rows={4} placeholder="Tell us about your product, its options, and how you sell it today." /></label>
<label htmlFor="notes">Anything else? <span className="optional">Optional</span><Textarea id="notes" name="notes" maxLength={2000} rows={2} placeholder="What slows down quoting? Is there a date you’re working toward?" /></label>
<label htmlFor="catalog">Catalog or product photo <span className="optional">Optional</span><Input id="catalog" name="catalog" type="file" accept=".pdf,.png,.jpg,.jpeg" aria-describedby="file-hint" /><span id="file-hint" className="field-hint">One PDF, PNG, or JPEG, up to 5 MB. A link above is enough to get started.</span></label>
<div className="honeypot" aria-hidden="true"><label>Leave this empty<input name="companyFax" tabIndex={-1} autoComplete="off" /></label></div>
{error&&<p className="form-error" role="alert">{error}</p>}
<Button className="rivet-button form-submit" type="submit" disabled={status==="saving"}>{status==="saving"?"Saving your request…":"Request a concept"}<span aria-hidden="true">→</span></Button>
<p className="field-hint privacy-note">We use these details to review your product and contact you about your concept. Please share only materials you’re comfortable providing for that purpose.</p>
</form>;
}
