import {createServer} from 'node:http';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {randomUUID} from 'node:crypto';
import {join} from 'node:path';
import {createSnapshot,ConfigurationError} from '@maker/configurator-core';
import {products} from './registry.mjs';
import {createRecipeStore} from './recipe-store.mjs';
import {studioRoutes,resolveProduct} from './studio-routes.mjs';
import {handoffRoutes} from './handoff-routes.mjs';

export function createApp({storage,studioStorage=join(storage,'product-studio'),handoffOptions,allowedOrigins=[]}) {
  if(!Array.isArray(allowedOrigins)||allowedOrigins.some(origin=>typeof origin!=='string'||!/^http:\/\/(127\.0\.0\.1|localhost):\d{1,5}$/.test(origin)||new URL(origin).port==='0'))throw new Error('Additional origins must be explicit HTTP loopback origins with a port.');
  const extraOrigins=new Set(allowedOrigins);
  const store=createRecipeStore(studioStorage),routeStudio=studioRoutes(store);
  const handoff=handoffRoutes({storage,recipes:store,products,options:handoffOptions});
  const server=createServer(async(req,res)=>{
    const send=(status,value)=>{res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});res.end(JSON.stringify(value));};
    try {
      const url=new URL(req.url,'http://localhost'),path=url.pathname;
      const readBody=async()=>{
        const origin=req.headers.origin;
        if(origin&&!extraOrigins.has(origin)&&!/^http:\/\/(127\.0\.0\.1|localhost):(5178|5192|5193|5278|5292|5293)$/.test(origin))throw Object.assign(new Error('Origin not allowed.'),{status:403});
        if(!req.headers['content-type']?.startsWith('application/json'))throw Object.assign(new Error('Use application/json.'),{status:415});
        let bytes=0;const chunks=[];
        for await(const chunk of req){bytes+=chunk.length;if(bytes>524288)throw Object.assign(new Error('Request is too large.'),{status:413});chunks.push(chunk);}
        let body;try{body=JSON.parse(Buffer.concat(chunks).toString('utf8'));}catch{throw Object.assign(new Error('Invalid JSON.'),{status:400});}
        if(!body||typeof body!=='object'||Array.isArray(body))throw Object.assign(new Error('Expected a request object.'),{status:400});return body;
      };
      if(await handoff.route(req,res,url,readBody,send))return;
      if(path.startsWith('/api/studio/'))handoff.authorizeOperator(req);
      if(await routeStudio(req,res,url,readBody,send))return;
      if(req.method==='GET'&&path==='/api/products')return send(200,[...products.values()].map(p=>({id:p.id,version:p.version,title:p.title})));
      if(req.method==='GET'&&/^\/api\/builds\/[a-f\d-]{36}$/.test(path)) {
        try{
          const snapshot=JSON.parse(await readFile(join(storage,path.split('/').at(-1)+'.json'),'utf8'));
          if(url.searchParams.get('download')==='1'){
            res.writeHead(200,{'Content-Type':'application/json; charset=utf-8','Content-Disposition':`attachment; filename="maker-build-${snapshot.id}.json"`,'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});
            return res.end(JSON.stringify(snapshot,null,2));
          }
          return send(200,snapshot);
        }catch(error){if(error.code==='ENOENT')return send(404,{error:'Build not found.'});throw error;}
      }
      if(req.method!=='POST'||!['/api/quote','/api/builds'].includes(path))return send(404,{error:'Route not found.'});
      const input=await readBody();
      if(typeof input.productId!=='string'||typeof input.productVersion!=='string')return send(400,{error:'Product ID and recipe version are required.'});
      const product=await resolveProduct(store,products,input);
      // Never accept a submitted total, SKU or BOM; all are regenerated here.
      if(path==='/api/quote')return send(200,product.evaluate(input.config));
      const snapshot=createSnapshot(product,input.config,{id:randomUUID()});
      await mkdir(storage,{recursive:true});await writeFile(join(storage,snapshot.id+'.json'),JSON.stringify(snapshot,null,2),{flag:'wx'});
      return send(201,snapshot);
    }catch(error){if(error instanceof ConfigurationError||error.status)return send(error.status||422,{error:error.message,issues:error.issues});console.error(error);send(500,{error:'The local service could not complete this request.'});}
  });
  server.on('close',handoff.close);
  return server;
}
