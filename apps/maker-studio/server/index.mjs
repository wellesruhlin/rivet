import {fileURLToPath} from 'node:url';
import {createApp} from './app.mjs';
const port=Number(process.env.MAKER_API_PORT||5193);
const server=createApp({storage:process.env.MAKER_STORAGE||fileURLToPath(new URL('../../../work/maker-studio-builds/',import.meta.url)),allowedOrigins:(process.env.MAKER_ALLOWED_ORIGINS||'').split(',').map(s=>s.trim()).filter(Boolean)});
server.listen(port,'127.0.0.1',()=>console.log(`Maker configuration service http://127.0.0.1:${port}`));
for(const signal of ['SIGINT','SIGTERM'])process.on(signal,()=>server.close(()=>process.exit(0)));
