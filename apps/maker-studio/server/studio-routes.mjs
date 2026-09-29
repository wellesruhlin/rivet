import {compileRecipe} from '@maker/product-recipes';

export function studioRoutes(store){
  return async function route(req,res,url,readBody,send){
    const p=url.pathname;
    if(req.method==='GET'&&p==='/api/catalog'){send(200,await store.catalog());return true;}
    const publicMatch=p.match(/^\/api\/catalog\/([a-z][a-z0-9-]{1,63})$/);
    if(req.method==='GET'&&publicMatch){send(200,await store.published(publicMatch[1],url.searchParams.get('version')||undefined));return true;}
    if(!p.startsWith('/api/studio/'))return false;
    if(req.method==='GET'&&p==='/api/studio/recipes'){send(200,await store.list());return true;}
    if(p==='/api/studio/materials'){
      if(req.method==='GET'){send(200,await store.materials());return true;}
      if(req.method==='PUT'){const body=await readBody();send(200,await store.saveMaterials(body.presets,body.revision));return true;}
    }
    const match=p.match(/^\/api\/studio\/recipes\/([a-z][a-z0-9-]{1,63})(?:\/(clone|publish))?$/);
    if(!match)return false;const [,id,action]=match;
    if(req.method==='GET'&&!action){send(200,await store.get(id));return true;}
    if(req.method==='PUT'&&!action){const body=await readBody();send(200,await store.save(id,body.recipe,body.revision));return true;}
    if(req.method==='POST'&&action){const body=await readBody();send(200,action==='clone'?await store.clone(id,body.id,body.title):await store.publish(id,body.revision));return true;}
    return false;
  };
}
export async function resolveProduct(store,legacy,input){
  const original=legacy.get(input.productId);if(original?.version===input.productVersion)return original;
  try{return compileRecipe(await store.published(input.productId,input.productVersion));}
  catch(error){if(error.status===404&&original)throw Object.assign(new Error('Catalog version changed. Reload and review this build.'),{status:409});throw error;}
}
