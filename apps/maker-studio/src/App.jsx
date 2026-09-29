import {lazy,Suspense,useCallback,useEffect,useMemo,useRef,useState} from 'react';
import {Bookmark,Share2,X,RotateCcw} from 'lucide-react';
import {tableProduct} from '@maker/ref-parsons';
import {encodeConfiguration,decodeConfiguration} from '@maker/configurator-core';
import Configurator from './components/Configurator.jsx';
const Studio=lazy(()=>import('./components/Studio.jsx'));
import Sources from './components/Sources.jsx';
import {request,productRequest,downloadJson} from './api.js';
const SAVE_KEY='maker-studio:ref-parsons:v1';
function loadLink(){try{return location.hash.startsWith('#build=')?{config:decodeConfiguration(tableProduct,location.hash.slice(7)),error:''}:{config:tableProduct.defaults,error:''};}catch(error){return {config:tableProduct.defaults,error:error.message};}}
function savedExists(){try{return !!localStorage.getItem(SAVE_KEY);}catch{return false;}}
export default function App(){
  const [initial]=useState(loadLink),[config,setConfig]=useState(initial.config),[step,setStep]=useState(0),[view,setView]=useState('Studio'),[notice,setNotice]=useState(initial.error),[showSources,setShowSources]=useState(false),[busy,setBusy]=useState(false),[hasSave,setHasSave]=useState(savedExists);
  const [serverState,setServerState]=useState('pending'),[serverResult,setServerResult]=useState(null);const requestSerial=useRef(0);
  const localResult=useMemo(()=>tableProduct.evaluate(config),[config]);
  const result=serverResult&&JSON.stringify(serverResult.config)===JSON.stringify(config)?serverResult:localResult;
  const update=useCallback(patch=>{try{setConfig(tableProduct.change(config,patch).config);}catch(error){setNotice(error.message);}},[config]);
  useEffect(()=>{const abort=new AbortController(),serial=++requestSerial.current;setServerState('pending');const timer=setTimeout(()=>{request('quote',productRequest(tableProduct,config),abort.signal).then(data=>{if(serial===requestSerial.current){setServerResult(data);setServerState('ready');}}).catch(error=>{if(error.name!=='AbortError'&&serial===requestSerial.current)setServerState('error');});},100);return()=>{clearTimeout(timer);abort.abort();};},[config]);
  useEffect(()=>{const onHash=()=>{const loaded=loadLink();setConfig(loaded.config);if(loaded.error)setNotice(loaded.error);};addEventListener('hashchange',onHash);return()=>removeEventListener('hashchange',onHash);},[]);
  useEffect(()=>{if(!notice)return;const timer=setTimeout(()=>setNotice(''),8500);return()=>clearTimeout(timer);},[notice]);
  async function save(exportOnly=false){if(busy)return;setBusy(true);try{const snapshot=await request('builds',productRequest(tableProduct,config));if(exportOnly){downloadJson(snapshot,`ref-parsons-${snapshot.id.slice(0,8)}.json`);setNotice('Build specification exported. No order has been placed.');}else{try{localStorage.setItem(SAVE_KEY,JSON.stringify(snapshot));setHasSave(true);setNotice(`Build saved on this computer. Reference ${snapshot.id.slice(0,8)}.`);}catch{downloadJson(snapshot,`ref-parsons-${snapshot.id.slice(0,8)}.json`);setNotice('Browser storage is unavailable. Your saved build was downloaded instead.');}}}catch(error){setNotice(`Could not save: ${error.message}`);}finally{setBusy(false);}}
  async function share(){const url=new URL(location.href);url.hash=`build=${encodeConfiguration(tableProduct,config)}`;history.replaceState(null,'',url);try{await navigator.clipboard.writeText(url.href);setNotice('Build link copied. It restores your exact size and finish.');}catch{setNotice('Your build is now in the address bar. Copy the URL to share it.');}}
  function restore(){try{const saved=JSON.parse(localStorage.getItem(SAVE_KEY));if(saved.productId!==tableProduct.id||saved.productVersion!==tableProduct.version)throw new Error('The saved catalog version has changed.');setConfig(tableProduct.normalize(saved.config));setNotice('Saved size and finish restored. Current reference price rechecked.');}catch(error){setNotice(`Could not restore: ${error.message}`);}}
  return <div className="app"><header className="header"><a className="brand" href="#" aria-label="ref. table demo">ref.</a><span className="header-divider"/><span className="product-name">Parsons dining table</span><nav aria-label="Product demos"><a href="/studio">Product Studio</a><span>/</span><a href="http://127.0.0.1:5178/" target="_blank" rel="noreferrer">Ski demo</a></nav><div className="header-actions">{hasSave&&<button title="Restore saved build" aria-label="Restore saved build" onClick={restore}><RotateCcw size={17}/></button>}<button aria-label="Save build" onClick={()=>save()} disabled={busy||serverState!=='ready'}><Bookmark size={19}/><span>Save build</span></button><button aria-label="Share" onClick={share}><Share2 size={19}/><span>Share</span></button></div></header>
    <main><Suspense fallback={<section className="studio" aria-label="Loading table preview"><div className="studio-title"><h1>Made for your everyday.</h1><p>Preparing your table…</p></div></section>}><Studio config={config} view={view} setView={setView}/></Suspense><Configurator config={config} update={update} step={step} setStep={setStep} result={result} serverState={serverState} onSave={()=>save()} onExport={()=>save(true)} onSources={()=>setShowSources(true)} busy={busy}/></main>
    {notice&&<div className="toast" role="status"><span>{notice}</span><button aria-label="Dismiss notification" onClick={()=>setNotice('')}><X size={16}/></button></div>}{showSources&&<Sources onClose={()=>setShowSources(false)}/>}
  </div>;
}
