import {join} from 'node:path';
import {ConfigurationError} from '@arc/configurator/product';
import {createHandoffStore,fail} from './handoff-store.mjs';
import {canonical,productRelease} from './handoff-release.mjs';
import {resolveProduct} from './studio-routes.mjs';
import {createManagementStore} from './management-store.mjs';
import {managementCatalog} from './management-catalog.mjs';
import {managementRoutes} from './management-routes.mjs';

export function handoffRoutes({storage,recipes,products,options}) {
  const store=createHandoffStore(join(storage,'handoff'),options);
  const management=createManagementStore(join(storage,'handoff'));
  const getCatalog=async()=>{const catalog=await managementCatalog(recipes,products);management.ensure(catalog);return catalog;};
  const routeManagement=managementRoutes(management,getCatalog);
  let loginAttempts=[];
  const releaseFor=async input=>{const product=await resolveProduct(recipes,products,input);return {product,release:await productRelease(product,recipes,products)};};
  const session=req=>req.headers.cookie?.split(';').map(x=>x.trim()).find(x=>x.startsWith('maker_session='))?.slice(14);
  const cookie=(res,token)=>res.setHeader('Set-Cookie',[`maker_session=${token}; HttpOnly; SameSite=Strict; Path=/api; Max-Age=${token?28800:0}`,'maker_session=; HttpOnly; SameSite=Strict; Path=/api/handoff; Max-Age=0']);
  const authorizeOperator=req=>{if(!store.authenticated(session(req)))fail(401,'Sign in to the maker workspace first.');};
  async function route(req,res,url,readBody,send) {
    if(!url.pathname.startsWith('/api/handoff/'))return false;
    // This first adapter is explicitly a single-workspace, loopback pilot.
    // Reject forwarded/public hosts as well as cross-origin browser writes.
    if(!/^(127\.0\.0\.1|localhost)(:\d+)?$/.test(req.headers.host||''))fail(403,'The handoff pilot is available on this computer only.');
    const path=url.pathname.slice('/api/handoff/'.length),token=session(req),operator=store.authenticated(token);
    const post=async()=>{if(req.method!=='POST')fail(405,'Use POST for this action.');return readBody();};
    const requireOperator=()=>{if(!operator)fail(401,'Sign in to the maker desk first.');};
    const authorized=id=>{if(!operator)store.authorize(id,req.headers.authorization?.replace(/^Bearer /,''));};
    if(path==='session'&&req.method==='GET'){send(200,{operator,setupRequired:store.setupRequired(),mode:'local-pilot'});return true;}
    if(['setup','login','logout'].includes(path)){
      const body=await post();
      if(path==='logout'){store.logout(token);cookie(res,'');send(200,{operator:false});return true;}
      const time=Date.now();loginAttempts=loginAttempts.filter(t=>time-t<60000);if(loginAttempts.length>=10)fail(429,'Too many sign-in attempts. Try again in one minute.');loginAttempts.push(time);
      if(path==='setup')store.setup(body.password);
      cookie(res,store.login(body.password));send(200,{operator:true});return true;
    }
    if(path.startsWith('manage/')){requireOperator();await routeManagement(path.slice(7),req,readBody,send);return true;}
    await getCatalog();
    const manifest=path.match(/^products\/([a-z][a-z0-9-]{1,63})$/);
    if(manifest&&req.method==='GET'){const {product,release}=await releaseFor({productId:manifest[1],productVersion:url.searchParams.get('version')});send(200,{productId:product.id,productVersion:product.version,releaseId:release.id});return true;}
    if(path==='builds'){
      if(req.method==='GET'){requireOperator();send(200,store.list());return true;}
      const input=await post();if(typeof input.productId!=='string'||typeof input.productVersion!=='string')fail(422,'Product and version are required.');
      const {product,release}=await releaseFor(input),evaluated=product.evaluate(input.config);
      if(input.releaseId!==undefined&&input.releaseId!==release.id)fail(409,'The product release changed. Reload and review the build before submitting again.');
      const issues=Object.keys(product.defaults).filter(key=>!Object.hasOwn(input.config||{},key)||canonical(input.config[key])!==canonical(evaluated.config[key])).map(field=>({field,message:`Review ${field}: the submitted value is incomplete or no longer allowed.`}));
      if(issues.length)throw new ConfigurationError(issues);
      if(evaluated.quote.status==='incomplete')fail(422,'Complete the product selection before requesting review.');
      if(canonical(input.expectedQuote)!==canonical(evaluated.quote))fail(409,'Pricing changed. Reload the configurator and review the updated price.');
      management.checkProduct(evaluated);
      send(201,{build:store.create(input,evaluated,release)});return true;
    }
    const match=path.match(/^builds\/([a-f\d-]{36})(?:\/(quote|withdraw|accept|export|acknowledge|release|file))?$/i);
    if(!match)fail(404,'Handoff route not found.');
    const [,id,action]=match;
    authorized(id);
    if(!action&&req.method==='GET'){const result=store.detail(id);if(operator&&!result.order){try{result.quoteSuggestion=management.suggest(result.build);}catch(e){result.quoteSuggestion={error:e.message};}}send(200,result);return true;}
    if(action==='accept'){
      // Acceptance always requires the customer's build capability, even when
      // the same local browser also has a maker session.
      store.authorize(id,req.headers.authorization?.replace(/^Bearer /,''));
      const input=await post(),{build}=store.detail(id);
      const {release}=await releaseFor(build);
      const existing=store.detail(id).order;
      const policy=existing?null:management.checkProduct(build);
      send(200,store.accept(id,input,release.id,{connector:existing?.connector||management.connector(),policyVersion:policy?.version||null}));return true;
    }
    requireOperator();
    if(action==='file'&&req.method==='GET'){
      const format=url.searchParams.get('format'),file=store.file(id,format);
      res.writeHead(200,{'Content-Type':format==='csv'?'text/csv; charset=utf-8':'application/json; charset=utf-8','Content-Disposition':`attachment; filename="${file.name}"`,'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});res.end(file.body);return true;
    }
    if(action==='release'&&req.method==='GET'){send(200,store.release(store.detail(id).build.releaseId));return true;}
    const input=await post();
    if(action==='quote'){const {build}=store.detail(id),{release}=await releaseFor(build),suggestion=management.suggest(build);send(201,store.approve(id,input,release.id,suggestion));}
    else if(action==='withdraw')send(200,store.revoke(id,input.quoteId));
    else if(action==='export')send(200,store.export(id));
    else if(action==='acknowledge')send(200,store.acknowledge(id,input));
    else fail(404,'Handoff action not found.');
    return true;
  }
  return {route,authorizeOperator,close:()=>{store.close();management.close();}};
}
