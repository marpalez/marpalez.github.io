import {createServer} from 'node:http';
import {createReadStream} from 'node:fs';
import {stat} from 'node:fs/promises';
import {resolve,extname,sep} from 'node:path';
import {fileURLToPath} from 'node:url';
const root=fileURLToPath(new URL('../',import.meta.url));
const types={'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'text/javascript; charset=utf-8','.mjs':'text/javascript; charset=utf-8','.json':'application/json','.glb':'model/gltf-binary','.png':'image/png','.webp':'image/webp','.jpg':'image/jpeg','.woff2':'font/woff2','.pdf':'application/pdf','.svg':'image/svg+xml','.ico':'image/x-icon','.mp4':'video/mp4'};
createServer(async(req,res)=>{
  try{
    const pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname);
    if(pathname.split('/').some(p=>p.startsWith('.')&&p!=='')){res.writeHead(403).end();return;}
    let file=resolve(root,'.'+pathname);
    if(file!==root&&!(file+sep).startsWith(root)){res.writeHead(403).end();return;}
    let info=await stat(file);if(info.isDirectory()){file=resolve(file,'index.html');info=await stat(file);}
    if(!info.isFile()){res.writeHead(404).end();return;}
    res.writeHead(200,{'Content-Type':types[extname(file)]||'application/octet-stream','Content-Length':info.size,'Cache-Control':'no-cache'});
    if(req.method==='HEAD')res.end();else createReadStream(file).pipe(res);
  }catch{res.writeHead(404,{'Content-Type':'text/plain'}).end('Not found');}
}).listen(4173,'127.0.0.1',()=>console.log('Local portfolio: http://127.0.0.1:4173/3d/'));
