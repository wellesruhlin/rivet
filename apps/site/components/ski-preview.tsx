"use client";
import { useState, type CSSProperties } from "react";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Button } from "@/components/ui/button";
export function SkiPreview(){
const [finish,setFinish]=useState("ember"),[length,setLength]=useState("184"),[review,setReview]=useState(false);
const price=finish==="ember"?849:899;
return <figure className="preview-figure"><div className="ski-preview">
<div className="product-stage"><img src={finish==="ember"?"/ski-ember.png":"/ski-forest.png"} alt={(finish==="ember"?"Orange and charcoal":"Forest green and oak")+" custom ski concept"} className="ski-render" style={{"--ski-scale":Number(length)/184} as CSSProperties} width="1024" height="1536" fetchPriority="high" /><span className="stage-label">ALL-MOUNTAIN / {length}</span></div>
<div className="preview-controls"><fieldset><legend>Finish</legend><RadioGroup value={finish} onValueChange={v=>{setFinish(v);setReview(false)}} className="swatches" aria-label="Ski finish">
<label className="swatch-label"><RadioGroupItem value="ember" className="swatch ember" aria-label="Ember and charcoal" /><span>Ember</span></label><label className="swatch-label"><RadioGroupItem value="forest" className="swatch forest" aria-label="Forest and oak" /><span>Forest</span></label></RadioGroup></fieldset>
<fieldset><legend>Length</legend><RadioGroup value={length} onValueChange={v=>{setLength(v);setReview(false)}} className="length-options" aria-label="Ski length">{["177","184","191"].map(v=><label className={length===v?"length-option selected":"length-option"} key={v}><RadioGroupItem value={v} aria-label={v+" centimeters"} /><span>{v} cm</span></label>)}</RadioGroup></fieldset>
<div className="demo-price" aria-live="polite"><span>Illustrative price</span><strong>${price}</strong></div><Button className="rivet-button preview-action" onClick={()=>setReview(true)}>Review build <span aria-hidden="true">→</span></Button></div>
{review&&<div className="build-review" role="region" aria-label="Demo build summary"><button className="review-close text-link" onClick={()=>setReview(false)}>Back to options</button><div><p className="section-label">YOUR DEMO BUILD</p><h3>{finish==="ember"?"Ember / charcoal":"Forest / oak"}</h3><p>{length} cm · ${price} illustrative total</p><p className="small">A clear configuration, ready to hand off. Demo only; no order is placed.</p></div><Button asChild className="rivet-button"><a href={"/api/demo-build?finish="+finish+"&length="+length} download="rivet-demo-build.txt">Download build sheet</a></Button></div>}</div>
<figcaption>Independent ski configurator concept. Try changing the finish.</figcaption></figure>
}