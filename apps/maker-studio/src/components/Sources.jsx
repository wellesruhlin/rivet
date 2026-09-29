import {useEffect,useRef} from 'react';
import {X,ExternalLink} from 'lucide-react';
import {catalog} from '@maker/ref-parsons';
export default function Sources({onClose}) {
  const dialog=useRef(null);useEffect(()=>{dialog.current.showModal();return()=>dialog.current?.close();},[]);
  return <dialog ref={dialog} className="sources-dialog" onCancel={onClose} onClick={e=>{if(e.target===e.currentTarget)onClose();}} aria-labelledby="sources-title"><div className="dialog-heading"><h2 id="sources-title">A study, with sources.</h2><button onClick={onClose} aria-label="Close sources"><X/></button></div><p>This is an independent configurator demonstration based on ref.’s published Parsons table. It is not affiliated with or approved by the maker.</p>
    <h3>Published by ref.</h3><ul><li>Four standard sizes, twelve finishes and their individual CAD prices.</li><li>30-inch height, 4 × 4-inch legs and a 3-inch mitered edge.</li><li>A 1.5–1.75-inch solid wood top, matte polyurethane finish and steel reinforcement.</li></ul>
    <h3>Illustrative in this model</h3><p>We use a 1.625-inch top within the published range. Concealed joinery, reinforcement count and placement, small edge bevels, wood grain and finish appearance are approximations. Exploded gaps are exaggerated.</p><p>Custom sliders use demo preview limits, not approved manufacturing limits. Custom dimensions require a quote; their price is deliberately left unset.</p>
    <div className="source-links"><a href={catalog.source} target="_blank" rel="noreferrer">Maker’s product & specifications <ExternalLink size={15}/></a><a href={catalog.dataSource} target="_blank" rel="noreferrer">Public variant data <ExternalLink size={15}/></a></div><p className="fine">Snapshot: {catalog.observed} · Catalog {catalog.version}. Reference prices exclude tax and shipping and may have changed. Save and export create demo records only.</p>
  </dialog>;
}
