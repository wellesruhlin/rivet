import {MANAGEMENT_CONTRACT,validateManaged} from '@arc/configurator/product/management';
import {packetFiles,fail} from './handoff-store.mjs';
export function managementRoutes(management,getCatalog){
  return async function route(path,req,readBody,send){
    const catalog=await getCatalog();
    if(req.method==='GET'){
      if(path==='catalog')send(200,catalog);
      else if(path==='bundle')send(200,management.bundle());
      else if(path==='contract')send(200,MANAGEMENT_CONTRACT);
      else if(path==='history')send(200,management.history());
      else fail(404,'Management resource not found.');
      return;
    }
    if(req.method!=='POST')fail(405,'Use POST for management changes.');
    const body=await readBody();
    if(path==='proposals/validate')return send(200,management.preview(body,catalog));
    if(path==='proposals/apply')return send(200,management.apply(body,catalog));
    const publish=path.match(/^publish\/(price-lists|policies|connectors)\/([a-z][a-z0-9-]{1,63})$/);
    if(publish)return send(200,management.publish(publish[1],publish[2],body.revision,catalog,body.source));
    if(path==='connectors/test'){
      const issues=validateManaged('connectors',body.draft);if(issues.length)throw Object.assign(new Error('Fix the connector configuration.'),{status:422,issues});
      if(body.draft.transport==='api-planned')return send(200,{status:'adapter-needed',message:'Configuration is valid. This API adapter is not installed, so no connection or credential test was performed.',networkRequestMade:false});
      const sample={schemaVersion:1,id:'PREVIEW-ORDER-001',createdAt:'2026-09-25T12:00:00Z',build:{id:'PREVIEW-BUILD-001',productId:'sample-product',productVersion:'1',releaseId:'sample-release',config:{finish:'Natural',length:72}},quote:{id:'PREVIEW-QUOTE-001',itemCode:'CLIENT-CUSTOM-ITEM',quantity:2,currency:'USD',unitMinor:10000,shippingMinor:2500,taxMinor:0,totalMinor:22500},manufacturing:{status:'held'},connector:body.draft};
      return send(200,{status:'file-ready',message:'Export mapping passed. Preview only; no order was created and nothing was sent.',networkRequestMade:false,csv:packetFiles(sample).csv});
    }
    fail(404,'Management action not found.');
  };
}
