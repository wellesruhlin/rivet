"use client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
export function Brand(){return <a href="/" className="brand" aria-label="Rivet CPQ home"><span className="brand-crop"><img src="/rivet-logo.png" alt="Rivet" width="2172" height="724" /></span><span className="brand-descriptor">CPQ</span></a>}
export function SiteHeader(){
const [open,setOpen]=useState(false);
return <><a className="skip-link" href="#main">Skip to content</a><header className="site-header wrap"><Brand />
<Button className="mobile-menu" variant="outline" aria-expanded={open} aria-controls="site-nav" onClick={()=>setOpen(!open)}>{open?"Close":"Menu"}</Button>
<nav id="site-nav" className={open?"site-nav is-open":"site-nav"} aria-label="Main navigation">
<a href="/#experience" onClick={()=>setOpen(false)}>The experience</a><a href="/#how-it-works" onClick={()=>setOpen(false)}>How it works</a><a href="/#pricing" onClick={()=>setOpen(false)}>Pricing</a>
<Button asChild variant="outline" className="rivet-button nav-cta"><a href="/#request" onClick={()=>setOpen(false)}>Show us your product</a></Button></nav></header></>;
}
