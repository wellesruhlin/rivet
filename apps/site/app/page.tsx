import { SiteHeader,Brand } from "@/components/site-header";
import { SkiPreview } from "@/components/ski-preview";
import { ConceptForm } from "@/components/concept-form";
import { Button } from "@/components/ui/button";
import { MoveHorizontal,Layers,Paintbrush,Settings2 } from "lucide-react";
const features=[
{icon:MoveHorizontal,title:"Dimensions that fit.",text:"Lengths, sizes, and shapes that follow your product rules."},
{icon:Layers,title:"Materials that matter.",text:"Help buyers understand the choices beneath the surface."},
{icon:Paintbrush,title:"Finishes that feel right.",text:"Bring colors, artwork, and textures into the decision."},
{icon:Settings2,title:"The details that make it theirs.",text:"Components and accessories, with compatible choices."}];
export default function Home(){
return <><SiteHeader /><main id="main">
<section className="hero wrap" aria-labelledby="hero-heading"><div className="hero-copy">
<h1 id="hero-heading"><span>Let customers</span><span>build it before</span><span>you do.</span></h1>
<p>Interactive product configurators for independent manufacturers. Turn your options into a buying experience people can see, explore, and understand.</p>
<div className="hero-actions"><Button asChild className="rivet-button"><a href="/demo">Try the demo <span aria-hidden="true">↗</span></a></Button><a className="text-link" href="#request">Show us your product</a></div></div><SkiPreview /></section>
<section id="experience" className="experience wrap" aria-labelledby="experience-title"><div className="experience-intro"><h2 id="experience-title">Your craft.<br/>Their choices.</h2><p>Make every option clear, visual, and connected to the right price.</p><p className="experience-detail">You know what makes a great product. We turn that knowledge into an experience that helps buyers choose—and gives you a clear build to work from.</p><a className="text-link" href="/demo">Explore the full ski configurator ↗</a></div>
<div className="feature-list">{features.map(({icon:Icon,title,text},i)=><div className="feature-row" key={title}><Icon aria-hidden="true" strokeWidth={1.4}/><div><h3>{title}</h3><p>{text}</p></div><span className="feature-index">0{i+1}</span></div>)}</div></section>
<section id="how-it-works" className="process wrap" aria-labelledby="process-title"><h2 id="process-title" className="process-heading">From your product to their perfect build.</h2><div className="process-grid">
<article><span className="step-number">01</span><h3>Share your product</h3><p>Send us your website or catalog. We review what you make, how customers choose, and where a configurator could help.</p></article>
<article><span className="step-number">02</span><h3>See your concept</h3><p>For products that fit, we create a free private concept around one representative product, your branding, and meaningful choices.</p></article>
<article><span className="step-number">03</span><h3>Launch with confidence</h3><p>We agree the initial range, validate options and pricing with you, and set up the quote or order handoff before launch.</p></article></div></section>
<section id="pricing" className="pricing" aria-labelledby="pricing-title"><div className="wrap pricing-grid"><div><h2 id="pricing-title">Start with<br/>a product.</h2><p className="pricing-intro">A clear starting point for your first configurator.</p></div>
<div className="price-column"><p className="section-label">FOUNDING OFFER</p><p className="setup-price">$3,000</p><p>one-time setup</p><div className="monthly-price"><strong>$299</strong><span>/ month</span></div><p className="price-caption">Starts when you launch.</p></div>
<div className="price-includes"><ul><li>Agreed initial product range</li><li>Validated options and pricing</li><li>Branded experience and launch</li><li>Hosting, maintenance, and support</li></ul><Button asChild className="rivet-button"><a href="#request">Request a free concept <span aria-hidden="true">→</span></a></Button><p>See a representative concept before committing.</p></div></div>
<div className="wrap pricing-terms">Scope and ongoing catalog updates are agreed before work begins. Additional product ranges and custom integrations are quoted separately. No payment is taken on this site.</div></section>
<section id="request" className="request-section wrap" aria-labelledby="request-title"><div className="request-copy"><h2 id="request-title">Show us<br/>what you make.</h2><p>Share a little about your product. We’ll take a look and shape a concept around it.</p><div className="founder-note"><span className="founder-initials" aria-hidden="true">WR</span><div><strong>A direct line to the builder.</strong><p>Rivet is built by Welles Ruhlin in Colorado. You’ll work directly with me, from the first concept to launch.</p></div></div></div><ConceptForm /></section>
</main><footer className="footer wrap"><Brand /><p>Built by Welles Ruhlin in Colorado.</p><a href="#request">Let’s see what we can build.</a></footer></>;
}