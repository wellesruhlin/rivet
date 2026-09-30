import {useEffect,useRef,useState} from 'react';
import {ArrowRight,Check,ChevronLeft,Download,ExternalLink} from 'lucide-react';
import {sizes,finishes,findFinish,previewLimits,catalog} from '@maker/ref-parsons';
import {formatMoney} from '@arc/configurator/product';

function DimensionInput({field,value,update}) {
  const [draft,setDraft]=useState(String(value));useEffect(()=>setDraft(String(value)),[value]);
  const limit=previewLimits[field];const valid=draft.trim()!==''&&Number.isFinite(Number(draft))&&Number(draft)>=limit.min&&Number(draft)<=limit.max&&Number.isInteger(Number(draft)*4);
  function commit(){if(valid)update({[field]:Number(draft)});}
  return <div className="dimension-control"><label htmlFor={field}>{field[0].toUpperCase()+field.slice(1)}<span>{limit.min}–{limit.max} in</span></label><div><input id={field} type="number" min={limit.min} max={limit.max} step=".25" value={draft} onChange={e=>setDraft(e.target.value)} onBlur={commit} onKeyDown={e=>{if(e.key==='Enter')commit();}} aria-invalid={!valid}/><span>in</span></div><input aria-label={`${field} slider`} type="range" min={limit.min} max={limit.max} step=".25" value={value} onChange={e=>update({[field]:Number(e.target.value)})}/>{!valid&&<small role="alert">Enter {limit.min}–{limit.max} in, in ¼-inch steps.</small>}</div>;
}
export function Swatch({finish,large=false}) {return <span className={`swatch ${large?'large':''}`} style={{'--swatch':finish.color,backgroundImage:`linear-gradient(${finish.color}88, ${finish.color}88), url(/materials/${finish.texture}.png)`}}/>;}

export default function Configurator({config,update,step,setStep,result,serverState,onSave,onExport,onSources,busy}) {
  const panel=useRef(null);
  useEffect(()=>{if(panel.current)panel.current.scrollTop=0;},[step]);
  const finish=findFinish(config.finish),size=sizes.find(s=>s.id===config.size);const price=result.quote;
  return <aside ref={panel} className="config-panel" aria-label="Configure your table">
    <nav className="steps" aria-label="Configuration steps">{['Size','Finish','Review'].map((title,i)=><button key={title} className={step===i?'active':''} aria-current={step===i?'step':undefined} onClick={()=>setStep(i)}><span>0{i+1}</span> {title}</button>)}</nav>
    <div className="panel-body">
    {step===0&&<>
      <h2>Find your proportions.</h2><p className="intro">Choose a standard size, or explore dimensions for your space.</p>
      <div className="sizes" role="group" aria-label="Standard sizes">{sizes.map(s=><button aria-pressed={config.size===s.id} className={config.size===s.id?'selected':''} key={s.id} onClick={()=>update({size:s.id})}><span>{s.length} × {s.width} in</span>{config.size===s.id&&<Check size={18}/>}</button>)}</div>
      <button className={`custom-size ${config.size==='custom'?'selected':''}`} aria-pressed={config.size==='custom'} onClick={()=>update({size:'custom'})}>Custom dimensions{config.size==='custom'&&<Check size={18}/>}</button>
      {config.size==='custom'&&<div className="custom-controls">{['length','width','height'].map(field=><DimensionInput key={field} field={field} value={config[field]} update={update}/>)}<p className="fine">Preview ranges only. The maker confirms feasibility and price.</p></div>}
      <div className="current-finish"><h3>Your finish</h3><div><Swatch finish={finish} large/><p><span>{finish.name}</span><button className="text-button" onClick={()=>setStep(1)}>Change</button></p></div></div>
    </>}
    {step===1&&<>
      <h2>A material expression.</h2><p className="intro">Choose the wood and finish that feels at home.</p>
      {['Oak','Walnut','Maple'].map(family=><fieldset className="finish-family" key={family}><legend>{family}</legend><div className="finishes">{finishes.filter(f=>f.family===family).map(f=><button key={f.id} title={f.name} className={config.finish===f.id?'selected':''} aria-pressed={config.finish===f.id} onClick={()=>update({finish:f.id})}><Swatch finish={f}/><span>{f.name.replace(` ${family}`,'')}</span>{config.finish===f.id&&<Check size={14}/>}</button>)}</div></fieldset>)}
      <p className="material-note">Wood has its own character. Grain and colour are illustrative; confirm your finish with the maker’s physical samples.</p>
    </>}
    {step===2&&<>
      <h2>Your table, considered.</h2><p className="intro">A complete specification, ready to keep or discuss with the maker.</p>
      <dl className="review-spec">{result.specification.filter(s=>!['Maker','Product'].includes(s.label)).map(s=><div key={s.label}><dt>{s.label}</dt><dd>{s.value}</dd></div>)}</dl>
      {price.status==='requires-quote'&&<p className="quote-note">This custom size needs a maker quote. Your specification will include the exact dimensions; it will not include an invented price.</p>}
      <div className="review-actions"><button onClick={onExport} disabled={busy||serverState!=='ready'}><Download size={16}/> Export build JSON</button><a href={catalog.source} target="_blank" rel="noreferrer">View maker’s product <ExternalLink size={15}/></a></div>
    </>}
    </div>
    <footer className="panel-footer"><p className="seating">{config.height} in high{size?` · ${size.seats} seats`:' · Custom proportions'}</p><div className="price" aria-live="polite">{price.totalMinor===null?'Quote required':`CAD ${formatMoney(price.totalMinor,'CAD').replace('CA','')}`}</div><p className="price-caption">{price.totalMinor===null?'Price confirmed by the maker':'Published reference price'}{serverState==='pending'?' · Checking…':serverState==='error'?' · Offline preview':''}</p>
      <button className="primary" disabled={busy||(step===2&&serverState!=='ready')} onClick={()=>step<2?setStep(step+1):onSave()}>{busy?'Saving…':step===0?'Continue to finish':step===1?'Review your table':'Save this build'}<ArrowRight size={22}/></button>
      {step>0&&<button className="back-button" onClick={()=>setStep(step-1)}><ChevronLeft size={15}/>Back to {step===1?'size':'finish'}</button>}
      <div className="disclosure"><span>Independent concept · No order is placed</span><button onClick={onSources}>Product sources</button></div>
    </footer>
  </aside>;
}
