import {useEffect,useRef,useState} from 'react';
import {RotateCcw,Rotate3D} from 'lucide-react';
import {tableProduct,findFinish} from '@maker/ref-parsons';
import {createStudio} from '../scene/renderer.js';
const modes=['Studio','Dimensions','Construction','Detail'];
export default function Studio({config,view,setView}) {
  const canvas=useRef(null),studio=useRef(null);const [error,setError]=useState(''),[labels,setLabels]=useState([]);
  useEffect(()=>{try{studio.current=createStudio(canvas.current,{onError:setError,onLabels:setLabels});}catch{setError('3D is unavailable on this device. You can still configure and review your table.');}return()=>{studio.current?.dispose();studio.current=null;};},[]);
  useEffect(()=>{studio.current?.update(tableProduct.scene(config));},[config]);
  useEffect(()=>{studio.current?.view(view);},[view]);
  const finish=findFinish(config.finish);
  return <section className="studio" aria-label="Interactive table preview">
    <div className="studio-title"><h1>Made for your everyday.</h1><p>Solid wood. Your proportions.</p></div>
    <div className="canvas-wrap"><canvas ref={canvas} aria-label={`${config.length} by ${config.width} inch Parsons table in ${finish.name}. Drag to rotate.`} tabIndex={0} onKeyDown={e=>{if(['ArrowLeft','ArrowRight'].includes(e.key)){e.preventDefault();studio.current?.rotate(e.key==='ArrowLeft'?-1:1);}}}/>{labels.map(label=><span className="dimension-label" key={label.id} style={{left:label.x,top:label.y,visibility:label.visible?'visible':'hidden'}}>{label.text}</span>)}</div>
    {error&&<div className="canvas-error" role="status">{error}<dl><dt>Dimensions</dt><dd>{config.length} × {config.width} × {config.height} in</dd><dt>Finish</dt><dd>{finish.name}</dd></dl></div>}
    {view==='Construction'&&<div className="construction-note"><strong>Built from the inside out.</strong><p>Solid hardwood · mitered edges · steel reinforcement</p><small>Separation exaggerated. Concealed joinery and bracing positions are illustrative.</small></div>}
    {view==='Detail'&&<div className="detail-note"><span>3 in mitered edge</span><span>4 × 4 in corner leg</span><span>Matte polyurethane finish</span></div>}
    <div className="studio-tools"><div className="view-switch" role="group" aria-label="Preview view">{modes.map(mode=><button key={mode} type="button" aria-pressed={view===mode} className={view===mode?'active':''} onClick={()=>setView(mode)}>{mode}</button>)}</div><button className="rotate-help" onClick={()=>studio.current?.reset()} aria-label="Reset camera"><RotateCcw size={19}/><span>Drag to explore</span></button></div>
    <div className="studio-spec"><span>{config.length} × {config.width} × {config.height} in</span><i/><span>{finish.name}</span><button onClick={()=>studio.current?.rotate()} aria-label="Rotate table"><Rotate3D size={19}/></button></div>
  </section>;
}
