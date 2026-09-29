import {useEffect,useRef,useState} from 'react';
import {RotateCcw} from 'lucide-react';
import {createStudio} from '../scene/renderer.js';
export default function ScenePreview({scene,price='Quote required',title='Product',modes=['Studio','Dimensions','Construction']}){
  const canvas=useRef(null),studio=useRef(null);const [labels,setLabels]=useState([]),[error,setError]=useState(''),[view,setView]=useState('Studio');
  useEffect(()=>{try{studio.current=createStudio(canvas.current,{onError:setError,onLabels:setLabels});}catch{setError('3D is unavailable on this device. Dimensions and saved specifications are still available.');}return()=>{studio.current?.dispose();studio.current=null;};},[]);
  useEffect(()=>{if(scene)studio.current?.update(scene);},[scene]);
  useEffect(()=>{studio.current?.view(view);},[view]);
  const c=scene?.config;
  return <section className="ps-scene" aria-label="Live product preview"><div className="ps-scene-toolbar"><div role="group" aria-label="Preview view">{modes.map(v=><button key={v} className={view===v?'active':''} aria-pressed={view===v} onClick={()=>setView(v)}>{v}</button>)}</div><button className="ps-icon" aria-label="Reset camera" onClick={()=>studio.current?.reset()}><RotateCcw size={16}/></button></div><div className="ps-canvas"><canvas ref={canvas} tabIndex={0} aria-label={`${title} interactive 3D model. Drag or use left and right arrows to rotate.`} onKeyDown={e=>{if(['ArrowLeft','ArrowRight'].includes(e.key)){e.preventDefault();studio.current?.rotate(e.key==='ArrowLeft'?-1:1);}}}/>{labels.map(l=><span className="dimension-label" key={l.id} style={{left:l.x,top:l.y,visibility:l.visible?'visible':'hidden'}}>{l.text}</span>)}</div>{error&&<p className="ps-render-error" role="status">{error}</p>}{view==='Construction'&&<p className="ps-reveal-note">Layers separated for inspection.<br/>Concealed construction is illustrative.</p>}<div className="ps-scene-footer"><span>{c?scene.shape==='round'?`Ø ${c.length} × ${c.height} in`:`${c.length} × ${c.width} × ${c.height} in`:'Preparing preview…'}</span><span>{price}</span></div></section>;
}
