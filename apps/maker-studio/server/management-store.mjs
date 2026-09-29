import {DatabaseSync} from 'node:sqlite';
import {mkdirSync} from 'node:fs';
import {join} from 'node:path';
import {DEFAULT_MAPPING,RESOURCE_KINDS,validateManaged} from '../packages/configurator-core/management.mjs';
import {canonical} from './handoff-release.mjs';
const fail=(status,message,issues)=>{throw Object.assign(new Error(message),{status,issues});};
export function createManagementStore(directory){
  mkdirSync(directory,{recursive:true});const db=new DatabaseSync(join(directory,'management.sqlite'));
  db.exec(`PRAGMA journal_mode=WAL; PRAGMA busy_timeout=5000;
    CREATE TABLE IF NOT EXISTS resources(kind TEXT NOT NULL,id TEXT NOT NULL,revision INTEGER NOT NULL,draft TEXT NOT NULL,PRIMARY KEY(kind,id));
    CREATE TABLE IF NOT EXISTS publications(kind TEXT NOT NULL,id TEXT NOT NULL,version INTEGER NOT NULL,at TEXT NOT NULL,payload TEXT NOT NULL,PRIMARY KEY(kind,id,version));
    CREATE TABLE IF NOT EXISTS changes(seq INTEGER PRIMARY KEY AUTOINCREMENT,at TEXT NOT NULL,source TEXT NOT NULL,kind TEXT NOT NULL,id TEXT NOT NULL,action TEXT NOT NULL,revision INTEGER NOT NULL,detail TEXT NOT NULL);`);
  const get=(sql,...v)=>db.prepare(sql).get(...v),all=(sql,...v)=>db.prepare(sql).all(...v),run=(sql,...v)=>db.prepare(sql).run(...v);
  const txn=fn=>{db.exec('BEGIN IMMEDIATE');try{const r=fn();db.exec('COMMIT');return r;}catch(e){db.exec('ROLLBACK');throw e;}};
  const published=(kind,id)=>{const row=get('SELECT * FROM publications WHERE kind=? AND id=? ORDER BY version DESC LIMIT 1',kind,id);return row?{version:row.version,at:row.at,draft:JSON.parse(row.payload)}:null;};
  const record=(kind,id)=>{const row=get('SELECT * FROM resources WHERE kind=? AND id=?',kind,id);if(!row)fail(404,'Management record not found.');return {...row,draft:JSON.parse(row.draft),published:published(kind,id)};};
  const event=(source,kind,id,action,revision,detail)=>run('INSERT INTO changes(at,source,kind,id,action,revision,detail) VALUES(?,?,?,?,?,?,?)',new Date().toISOString(),source,kind,id,action,revision,JSON.stringify(detail));
  const difference=(before,after)=>[...new Set([...Object.keys(before||{}),...Object.keys(after||{})])].filter(k=>canonical(before?.[k])!==canonical(after?.[k])).map(field=>({field,before:before?.[field]??null,after:after?.[field]??null}));
  const inspect=(change,catalog)=>{
    if(!change||!RESOURCE_KINDS.includes(change.kind)||typeof change.id!=='string'||!Number.isSafeInteger(change.revision)||change.revision<0)fail(422,'Each change requires a supported kind, ID and current revision.');
    const {kind,id,draft,revision}=change,issues=validateManaged(kind,draft,catalog.find(p=>p.id===draft?.productId));
    if(draft?.id!==id)issues.push({field:'id',message:'The record ID cannot change.'});
    if(issues.length)fail(422,'Fix the draft before saving.',issues);
    const row=get('SELECT * FROM resources WHERE kind=? AND id=?',kind,id);
    if((row?.revision||0)!==revision)fail(409,'This configuration changed in another window or agent run. Reload and review the current revision.');
    return {kind,id,revision,draft,diff:difference(row?JSON.parse(row.draft):{},draft)};
  };
  const proposal=(body,catalog)=>{
    if(!['ui','agent'].includes(body.source)||!Array.isArray(body.changes)||!body.changes.length||body.changes.length>50)fail(422,'Provide 1–50 changes and source ui or agent.');
    const keys=body.changes.map(c=>c.kind+':'+c.id);if(new Set(keys).size!==keys.length)fail(422,'Each record may appear only once per proposal.');
    return body.changes.map(c=>inspect(c,catalog));
  };
  return {
    close:()=>db.close(),
    ensure(catalog){txn(()=>{
      const seed=(kind,draft)=>{if(get('SELECT id FROM resources WHERE kind=? AND id=?',kind,draft.id))return;run('INSERT INTO resources(kind,id,revision,draft) VALUES(?,?,1,?)',kind,draft.id,JSON.stringify(draft));run('INSERT INTO publications(kind,id,version,at,payload) VALUES(?,?,1,?,?)',kind,draft.id,new Date().toISOString(),JSON.stringify(draft));};
      for(const p of catalog){seed('price-lists',{id:p.id,name:p.title+' quote defaults',productId:p.id,currency:p.currency,mode:'reference-plus-rules',baseMinor:null,adjustments:[],notes:'Uses the saved reference price where available. Maker review is always required.'});seed('policies',{id:p.id,name:p.title+' availability',productId:p.id,enabled:true,exclusions:[],notes:'Additional maker restrictions. Built-in product compatibility checks still apply.'});}
      seed('connectors',{id:'manual-file',name:'Spreadsheet handoff',provider:'Spreadsheet / CSV',transport:'manual-file',enabled:true,isDefault:true,endpoint:'',credentialRef:'',mapping:DEFAULT_MAPPING,notes:'Download the file, import it into the destination, then record its receipt.'});
    });},
    bundle(){return {schemaVersion:1,generatedAt:new Date().toISOString(),resources:all('SELECT kind,id FROM resources ORDER BY kind,id').map(r=>record(r.kind,r.id))};},
    record,published,
    preview(body,catalog){return {valid:true,changes:proposal(body,catalog)};},
    apply(body,catalog){return txn(()=>{const changes=proposal(body,catalog);for(const c of changes){if(!c.diff.length)continue;run('INSERT INTO resources(kind,id,revision,draft) VALUES(?,?,?,?) ON CONFLICT(kind,id) DO UPDATE SET revision=excluded.revision,draft=excluded.draft',c.kind,c.id,c.revision+1,JSON.stringify(c.draft));event(body.source,c.kind,c.id,'draft.saved',c.revision+1,c.diff);}return changes.map(c=>record(c.kind,c.id));});},
    publish(kind,id,revision,catalog,source='ui'){return txn(()=>{
      if(!['ui','agent'].includes(source))fail(422,'Source must be ui or agent.');
      const r=record(kind,id);inspect({kind,id,revision,draft:r.draft},catalog);
      if(r.published&&canonical(r.draft)===canonical(r.published.draft))return r;
      if(kind==='connectors'&&r.draft.isDefault){for(const other of all("SELECT id FROM resources WHERE kind='connectors' AND id<>?",id)){const active=published(kind,other.id);if(active?.draft.isDefault)fail(409,'Publish the existing default connector with Default turned off before choosing another.');}}
      const version=(r.published?.version||0)+1;run('INSERT INTO publications(kind,id,version,at,payload) VALUES(?,?,?,?,?)',kind,id,version,new Date().toISOString(),JSON.stringify(r.draft));run('UPDATE resources SET revision=revision+1 WHERE kind=? AND id=?',kind,id);event(source,kind,id,'version.published',revision+1,{version,changes:difference(r.published?.draft,r.draft)});return record(kind,id);
    });},
    history(){return all('SELECT * FROM changes ORDER BY seq DESC LIMIT 200').map(r=>({...r,detail:JSON.parse(r.detail)}));},
    checkProduct(build){const policy=published('policies',build.productId);if(policy){if(!policy.draft.enabled)fail(422,'This product is paused by the maker.');const excluded=policy.draft.exclusions.find(r=>build.config[r.field]===r.value);if(excluded)fail(422,excluded.message);}return policy;},
    suggest(build){const policy=this.checkProduct(build),price=published('price-lists',build.productId),draft=price?.draft;let amount=build.quote.totalMinor,applied=[];
      if(draft){if(draft.currency!==build.quote.currency)fail(409,'The maker price list currency changed. Update the list before quoting this build.');amount=draft.mode==='quote-only'?null:draft.mode==='fixed-plus-rules'?draft.baseMinor:amount;if(amount!==null){applied=draft.adjustments.filter(r=>build.config[r.field]===r.value);amount+=applied.reduce((n,r)=>n+r.amountMinor,0);if(!Number.isSafeInteger(amount)||amount<=0)fail(422,'The maker price rules produce an invalid total. Fix the price list before quoting.');}}
      return {unitMinor:amount,currency:build.quote.currency,priceList:price?{id:draft.id,version:price.version}:null,policyVersion:policy?.version||null,applied};
    },
    connector(){const active=all("SELECT id FROM resources WHERE kind='connectors'").map(r=>published('connectors',r.id)).find(r=>r?.draft.isDefault&&r.draft.enabled&&r.draft.transport==='manual-file');if(!active)fail(409,'Choose and publish an enabled file connector before accepting an order.');return {id:active.draft.id,version:active.version,name:active.draft.name,provider:active.draft.provider,transport:active.draft.transport,mapping:active.draft.mapping};},
  };
}
