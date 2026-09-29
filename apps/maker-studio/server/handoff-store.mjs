import {DatabaseSync} from 'node:sqlite';
import {mkdirSync} from 'node:fs';
import {join} from 'node:path';
import {randomBytes,randomUUID,scryptSync,timingSafeEqual} from 'node:crypto';
import {canonical,digest} from './handoff-release.mjs';

export const fail = (status,message) => { throw Object.assign(new Error(message),{status}); };
const uuid = value => typeof value === 'string' && /^[a-f\d]{8}(-[a-f\d]{4}){3}-[a-f\d]{12}$/i.test(value);
const text = (value,name,max=240) => { if(typeof value !== 'string'||!value.trim()||value.length>max)fail(422,`${name} is required (up to ${max} characters).`); return value.trim(); };
const integer = (value,name,min,max) => {if(!Number.isSafeInteger(value)||value<min||value>max)fail(422,`${name} must be a whole number from ${min} to ${max}.`);return value;};
const csvCell = value => '"'+String(value??'').replace(/^[\s]*[=+@-]/,m=>"'"+m).replaceAll('"','""')+'"';
export function packetFiles(packet) {
  // One sales line per configured product. Specifications stay structured in
  // JSON; this is deliberately not an invented factory bill of materials.
  const b=packet.build,q=packet.quote;
  const headings=['schema_version','order_id','build_id','quote_id','product_id','product_version','release_id','item_code','quantity','currency','unit_minor','shipping_minor','tax_minor','total_minor','manufacturing_status','configuration_json'];
  const row=[1,packet.id,b.id,q.id,b.productId,b.productVersion,b.releaseId,q.itemCode,q.quantity,q.currency,q.unitMinor,q.shippingMinor,q.taxMinor,q.totalMinor,packet.manufacturing.status,canonical(b.config)];
  const mapping=packet.connector?.mapping;
  const mapped=mapping?[mapping.map(m=>m.column),mapping.map(m=>{const value=m.field.split('.').reduce((v,key)=>v?.[key],packet);return value&&typeof value==='object'?canonical(value):value;})]:[headings,row];
  return {json:JSON.stringify(packet,null,2)+'\n',csv:'\uFEFF'+mapped.map(r=>r.map(csvCell).join(',')).join('\r\n')+'\r\n'};
}

export function createHandoffStore(directory,{now=()=>new Date(),exporter=packetFiles}={}) {
  mkdirSync(directory,{recursive:true});
  const db=new DatabaseSync(join(directory,'handoff.sqlite'));
  db.exec(`PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON; PRAGMA busy_timeout=5000;
    CREATE TABLE IF NOT EXISTS settings(key TEXT PRIMARY KEY,value TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS sessions(hash TEXT PRIMARY KEY,expires TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS releases(id TEXT PRIMARY KEY,evidence TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS builds(id TEXT PRIMARY KEY,token_hash TEXT NOT NULL,request_hash TEXT NOT NULL,payload TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS quotes(id TEXT PRIMARY KEY,build_id TEXT NOT NULL REFERENCES builds(id),request_hash TEXT NOT NULL,status TEXT NOT NULL,payload TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS orders(id TEXT PRIMARY KEY,build_id TEXT NOT NULL UNIQUE REFERENCES builds(id),quote_id TEXT NOT NULL UNIQUE REFERENCES quotes(id),payload TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS deliveries(id TEXT PRIMARY KEY,order_id TEXT NOT NULL UNIQUE REFERENCES orders(id),status TEXT NOT NULL,attempts INTEGER NOT NULL DEFAULT 0,error TEXT,json TEXT,csv TEXT,checksum TEXT,acknowledged_at TEXT,receipt TEXT);
    CREATE TABLE IF NOT EXISTS events(seq INTEGER PRIMARY KEY AUTOINCREMENT,build_id TEXT NOT NULL REFERENCES builds(id),at TEXT NOT NULL,kind TEXT NOT NULL,detail TEXT NOT NULL);`);
  const stamp=()=>now().toISOString();
  const get=(sql,...args)=>db.prepare(sql).get(...args);
  const run=(sql,...args)=>db.prepare(sql).run(...args);
  const all=(sql,...args)=>db.prepare(sql).all(...args);
  const transaction=fn=>{db.exec('BEGIN IMMEDIATE');try{const result=fn();db.exec('COMMIT');return result;}catch(e){db.exec('ROLLBACK');throw e;}};
  const event=(buildId,kind,detail={})=>run('INSERT INTO events(build_id,at,kind,detail) VALUES(?,?,?,?)',buildId,stamp(),kind,JSON.stringify(detail));
  const getBuild=id=>{const row=get('SELECT * FROM builds WHERE id=?',id);if(!row)fail(404,'Build not found.');return JSON.parse(row.payload);};
  const orderFor=id=>{const row=get('SELECT payload FROM orders WHERE build_id=?',id);return row?JSON.parse(row.payload):null;};
  const deliveryFor=id=>get('SELECT id,order_id AS orderId,status,attempts,error,checksum,acknowledged_at AS acknowledgedAt,receipt FROM deliveries WHERE order_id=?',id);
  const detail=id=>{
    const build=getBuild(id),order=orderFor(id);
    const quotes=all('SELECT payload,status FROM quotes WHERE build_id=? ORDER BY rowid DESC',id).map(r=>({...JSON.parse(r.payload),status:r.status}));
    return {build,quotes,order,delivery:order?deliveryFor(order.id):null,events:all('SELECT seq,at,kind,detail FROM events WHERE build_id=? ORDER BY seq',id).map(e=>({...e,detail:JSON.parse(e.detail)}))};
  };
  return {
    close:()=>db.close(),
    setupRequired:()=>!get("SELECT value FROM settings WHERE key='operator'"),
    setup(password){
      text(password,'Password',200);if(password.length<12)fail(422,'Use at least 12 characters for your maker password.');
      return transaction(()=>{if(get("SELECT value FROM settings WHERE key='operator'"))fail(409,'The maker account is already set up. Sign in.');const salt=randomBytes(16).toString('hex');run('INSERT INTO settings(key,value) VALUES(?,?)','operator',JSON.stringify({salt,hash:scryptSync(password,salt,64).toString('hex')}));});
    },
    login(password){
      if(typeof password!=='string'||password.length>200)fail(401,'Password was not recognized.');
      const row=get("SELECT value FROM settings WHERE key='operator'");if(!row)fail(409,'Set up your local maker account first.');
      const auth=JSON.parse(row.value),candidate=scryptSync(password,auth.salt,64);
      if(!timingSafeEqual(candidate,Buffer.from(auth.hash,'hex')))fail(401,'Password was not recognized.');
      const token=randomBytes(32).toString('hex');run('DELETE FROM sessions WHERE expires<=?',stamp());run('INSERT INTO sessions(hash,expires) VALUES(?,?)',digest(token),new Date(now().getTime()+8*3600000).toISOString());return token;
    },
    authenticated(token){return typeof token==='string'&&!!get('SELECT hash FROM sessions WHERE hash=? AND expires>?',digest(token),stamp());},
    logout(token){if(token)run('DELETE FROM sessions WHERE hash=?',digest(token));},
    authorize(id,token){if(typeof token!=='string'||!get('SELECT id FROM builds WHERE id=? AND token_hash=?',id,digest(token)))fail(404,'Build not found or access link is missing.');},
    create(input,evaluated,release){
      if(!uuid(input.id))fail(422,'A unique build request ID is required.');
      if(typeof input.accessToken!=='string'||!/^[a-f\d]{64}$/.test(input.accessToken))fail(422,'A secure build access key is required.');
      const reference=input.reference===undefined?'':String(input.reference);if(reference.length>120)fail(422,'Reference is too long.');
      const requestHash=digest({productId:input.productId,productVersion:input.productVersion,config:input.config,reference,revises:input.revises||null});
      return transaction(()=>{
        const existing=get('SELECT * FROM builds WHERE id=?',input.id);
        if(existing){if(existing.request_hash!==requestHash||existing.token_hash!==digest(input.accessToken))fail(409,'This request ID was already used for a different build.');return JSON.parse(existing.payload);}
        let revision=1,rootId=input.id;
        if(input.revises){this.authorize(input.revises,input.previousAccessToken);const previous=getBuild(input.revises);if(previous.productId!==input.productId)fail(422,'Revisions must use the same product.');revision=previous.revision+1;rootId=previous.rootId;}
        const build={schemaVersion:1,id:input.id,rootId,revision,revises:input.revises||null,createdAt:stamp(),purpose:'local-pilot',reference,releaseId:release.id,...evaluated};
        run('INSERT OR IGNORE INTO releases(id,evidence) VALUES(?,?)',release.id,JSON.stringify(release.evidence));
        run('INSERT INTO builds(id,token_hash,request_hash,payload) VALUES(?,?,?,?)',input.id,digest(input.accessToken),requestHash,JSON.stringify(build));
        event(build.id,'build.submitted',{revision});return build;
      });
    },
    detail,
    list(){return all('SELECT id FROM builds ORDER BY rowid DESC LIMIT 250').map(({id})=>{const {build,quotes,order,delivery}=detail(id);return {id,createdAt:build.createdAt,reference:build.reference,productId:build.productId,revision:build.revision,status:delivery?.status||(quotes[0]?.status==='approved'?(quotes[0].expiresAt>stamp()?'awaiting_acceptance':'quote_expired'):'needs_review'),totalMinor:order?.quote.totalMinor??quotes[0]?.totalMinor??build.quote.totalMinor,currency:build.quote.currency};});},
    approve(buildId,input,currentRelease,commercialContext=null){return transaction(()=>{
      if(!uuid(input.id))fail(422,'A unique quote request ID is required.');
      const requestHash=digest({buildId,...input}),existing=get('SELECT * FROM quotes WHERE id=?',input.id);
      if(existing){if(existing.request_hash!==requestHash)fail(409,'This quote request ID was already used.');return {...JSON.parse(existing.payload),status:existing.status};}
      const build=getBuild(buildId);if(orderFor(buildId))fail(409,'This build is already accepted. Create a revised build for changes.');
      if(build.releaseId!==currentRelease)fail(409,'Product rules changed. Submit a new revision before quoting.');
      if(input.feasibilityReviewed!==true)fail(422,'Confirm that the configured product has been reviewed.');
      const quantity=integer(input.quantity,'Quantity',1,10000),unitMinor=integer(input.unitMinor,'Unit price',1,1000000000),shippingMinor=integer(input.shippingMinor,'Shipping',0,1000000000),taxMinor=integer(input.taxMinor,'Tax',0,1000000000);
      const totalMinor=unitMinor*quantity+shippingMinor+taxMinor;
      const validityDays=integer(input.validityDays,'Quote validity',1,90);
      const quote={schemaVersion:1,id:input.id,buildId,createdAt:stamp(),expiresAt:new Date(now().getTime()+validityDays*86400000).toISOString(),currency:build.quote.currency,unitMinor,quantity,shippingMinor,taxMinor,totalMinor,itemCode:text(input.itemCode,'Client item code',80),leadTime:text(input.leadTime,'Lead time',160),terms:text(input.terms,'Terms',2000),approvedBy:'local-maker',feasibilityReviewed:true,releaseId:build.releaseId,commercialContext};
      run("UPDATE quotes SET status='superseded' WHERE build_id=? AND status='approved'",buildId);
      run('INSERT INTO quotes(id,build_id,request_hash,status,payload) VALUES(?,?,?,?,?)',quote.id,buildId,requestHash,'approved',JSON.stringify(quote));event(buildId,'quote.approved',{quoteId:quote.id});return {...quote,status:'approved'};
    });},
    revoke(buildId,quoteId){return transaction(()=>{const row=get('SELECT * FROM quotes WHERE id=? AND build_id=?',quoteId,buildId);if(!row)fail(404,'Quote not found.');if(orderFor(buildId))fail(409,'Accepted quotes cannot be withdrawn.');if(row.status==='approved'){run("UPDATE quotes SET status='withdrawn' WHERE id=?",quoteId);event(buildId,'quote.withdrawn',{quoteId});}return detail(buildId);});},
    accept(buildId,input,currentRelease,{connector=null,policyVersion=null}={}){return transaction(()=>{
      const row=get('SELECT * FROM quotes WHERE id=? AND build_id=?',input.quoteId||'',buildId);if(!row)fail(404,'Quote not found.');
      const quote=JSON.parse(row.payload),build=getBuild(buildId);
      if(input.totalMinor!==quote.totalMinor||input.currency!==quote.currency||input.confirmed!==true)fail(409,'Review and confirm the exact quote total before accepting.');
      const existing=orderFor(buildId);if(existing){if(existing.quote.id!==quote.id)fail(409,'A different quote was already accepted.');return existing;}
      if(row.status!=='approved')fail(409,'This quote is no longer available. Refresh and review the latest quote.');
      if(quote.expiresAt<=stamp())fail(409,'This quote expired. Ask the maker to renew it.');
      if(currentRelease!==build.releaseId)fail(409,'Product rules changed. The maker must review a new build revision.');
      if((quote.commercialContext?.policyVersion||null)!==policyVersion)fail(409,'Maker availability rules changed. Ask the maker to approve a fresh quote.');
      const order={schemaVersion:1,id:randomUUID(),createdAt:stamp(),purpose:'local-pilot',build,quote,connector,manufacturing:{status:'held',reason:'Maker-specific materials, quantities, routing and production approval are not configured.',bom:null},payment:{status:'not_collected'},external:{destination:connector?.id||'manual-file',id:null}};
      run('INSERT INTO orders(id,build_id,quote_id,payload) VALUES(?,?,?,?)',order.id,buildId,quote.id,JSON.stringify(order));run("UPDATE quotes SET status='accepted' WHERE id=?",quote.id);
      run('INSERT INTO deliveries(id,order_id,status) VALUES(?,?,?)',randomUUID(),order.id,'pending');event(buildId,'quote.accepted',{quoteId:quote.id,orderId:order.id});event(buildId,'handoff.queued',{destination:'manual-file'});return order;
    });},
    export(buildId){return transaction(()=>{
      const order=orderFor(buildId);if(!order)fail(409,'Accept a quote before exporting an order packet.');
      const delivery=deliveryFor(order.id);if(['exported','acknowledged'].includes(delivery.status))return delivery;
      run('UPDATE deliveries SET attempts=attempts+1 WHERE id=?',delivery.id);
      try{const files=exporter(order);if(typeof files.json!=='string'||typeof files.csv!=='string')throw new Error('Invalid export result.');run("UPDATE deliveries SET status='exported',error=NULL,json=?,csv=?,checksum=? WHERE id=?",files.json,files.csv,digest(files.json),delivery.id);event(buildId,'handoff.exported',{deliveryId:delivery.id});}
      catch{run("UPDATE deliveries SET status='failed',error=? WHERE id=?",'Export could not be created. Retry after checking the local service.',delivery.id);event(buildId,'handoff.failed',{deliveryId:delivery.id});}
      return deliveryFor(order.id);
    });},
    file(buildId,format){const order=orderFor(buildId);if(!order)fail(404,'Order not found.');if(!['json','csv'].includes(format))fail(404,'Export format not found.');const row=get('SELECT * FROM deliveries WHERE order_id=?',order.id);if(!row[format])fail(409,'Prepare the export first.');return {name:`maker-order-${order.id}.${format}`,body:row[format],checksum:row.checksum};},
    acknowledge(buildId,input){return transaction(()=>{const order=orderFor(buildId);if(!order)fail(404,'Order not found.');const d=deliveryFor(order.id);if(d.status==='acknowledged')return d;if(d.status!=='exported')fail(409,'Prepare and deliver the export before confirming receipt.');const receipt=text(input.receipt,'Destination receipt or external order reference',240);run("UPDATE deliveries SET status='acknowledged',acknowledged_at=?,receipt=? WHERE id=?",stamp(),receipt,d.id);event(buildId,'handoff.acknowledged',{receipt});return deliveryFor(order.id);});},
    release(id){const row=get('SELECT evidence FROM releases WHERE id=?',id);if(!row)fail(404,'Release not found.');return JSON.parse(row.evidence);},
  };
}
