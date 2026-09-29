import {useState} from 'react';
import {submitForReview,reviewPath} from '@maker/configurator-core/handoff-client';
import {skiProduct} from '../product-adapter.js';
import {bindingFor, bindingLabel} from '../bindings.js';
export default function HandoffRequest({config,previewBinding}) {
  const [busy,setBusy]=useState(false),[error,setError]=useState('');
  async function submit(){setBusy(true);setError('');try{
    if(previewBinding&&!bindingFor(previewBinding))throw new Error('Review the saved binding choice before submitting.');
    const reference=previewBinding?`Visual only, excluded: ${bindingLabel(previewBinding)} [${previewBinding}]`:'';
    const result=await submitForReview(skiProduct,config,{reference});
    location.assign((import.meta.env.VITE_MAKER_DESK_URL||'http://127.0.0.1:5192')+reviewPath(result));
  }catch(e){setError(e.message);setBusy(false);}}
  if(!['localhost','127.0.0.1'].includes(location.hostname))return null;
  return <section className="review-block" aria-label="Maker review"><h3 className="overline">Take it to the maker desk</h3><p className="fine" style={{margin:'12px 0'}}>Save this exact build for review, a confirmed quote and an order export. Local pilot only; nothing is sent to ON3P.</p><button className="outline-button" type="button" disabled={busy} onClick={submit}>{busy?'Saving your build…':'Request maker review'}</button>{error&&<p role="alert" className="fine" style={{marginTop:12}}>{error}</p>}</section>;
}
