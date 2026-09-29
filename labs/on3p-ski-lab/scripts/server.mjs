import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
// The shared kernel is served from the Rivet package so the page and Node use one copy.
const shared=path.resolve(root,'../../packages/ski-geometry/src');
const mime={'.html':'text/html','.css':'text/css','.mjs':'text/javascript','.js':'text/javascript','.json':'application/json','.png':'image/png','.jpg':'image/jpeg','.woff2':'font/woff2','.md':'text/plain; charset=utf-8','.blend':'application/octet-stream','.glb':'model/gltf-binary'};
http.createServer((req,res)=>{try{const url=new URL(req.url,'http://127.0.0.1');const requested=decodeURIComponent(url.pathname);const pkg=requested.startsWith('/pkg/ski-geometry/');const base=pkg?shared:root;const file=pkg?path.resolve(shared,'.'+requested.slice('/pkg/ski-geometry'.length)):path.resolve(root,'.'+(requested==='/'?'/index.html':requested));if(!file.startsWith(base+path.sep)||!fs.existsSync(file)||!fs.statSync(file).isFile()){res.writeHead(404);res.end('Not found');return;}res.setHeader('Content-Type',mime[path.extname(file)]||'application/octet-stream');res.setHeader('Cache-Control','no-store');fs.createReadStream(file).pipe(res);}catch{res.writeHead(400);res.end('Invalid request');}}).listen(Number(process.env.PORT||5190),'127.0.0.1',()=>console.log('ON3P geometry study: http://127.0.0.1:5190/'));
