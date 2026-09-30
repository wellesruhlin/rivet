import {useState} from 'react';
import {submitForReview,reviewPath} from '@arc/configurator/product/handoff-client';
export default function RequestReview({product,config}) {
  const [busy,setBusy]=useState(false),[error,setError]=useState('');
  async function submit(){setBusy(true);setError('');try{location.assign(reviewPath(await submitForReview(product,config)));}catch(e){setError(e.message);setBusy(false);}}
  return <div><button onClick={submit} disabled={busy}>{busy?'Saving…':'Request maker review'}</button><p className="ps-help">Local pilot: save an exact build for quoting and order export.</p>{error&&<p role="alert">{error}</p>}</div>;
}
