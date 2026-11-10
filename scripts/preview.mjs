import {createServer, request} from 'node:http';
import {readFile, stat} from 'node:fs/promises';
import {resolve, extname, sep} from 'node:path';
import {fileURLToPath} from 'node:url';
const root=fileURLToPath(new URL('../pelada-front/dist/pelada-web/browser/',import.meta.url));
const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript','.css':'text/css','.ico':'image/x-icon','.png':'image/png','.svg':'image/svg+xml'};
const port=Number(process.env.PREVIEW_PORT||4200);
const apiPort=Number(process.env.API_PORT||8000);
createServer(async(req,res)=>{
  if(req.url.startsWith('/api/')) {
    const upstream=request({hostname:'127.0.0.1',port:apiPort,path:req.url,method:req.method,headers:req.headers},r=>{res.writeHead(r.statusCode,r.headers);r.pipe(res);});
    upstream.on('error',()=>{res.writeHead(502,{'Content-Type':'application/json'});res.end(JSON.stringify({error:{message:'API indisponível.'}}));}); req.pipe(upstream); return;
  }
  try {
    let file=resolve(root,'.'+decodeURIComponent(new URL(req.url,'http://localhost').pathname));
    if(file!==resolve(root) && !file.startsWith(resolve(root)+sep)) {res.writeHead(403);res.end();return;}
    try { if(!(await stat(file)).isFile()) file=resolve(root,'index.html'); } catch { file=resolve(root,'index.html'); }
    const data=await readFile(file);res.writeHead(200,{'Content-Type':mime[extname(file)]||'application/octet-stream','Cache-Control':'no-store'});res.end(data);
  } catch { res.writeHead(500); res.end('Falha ao servir a aplicação.'); }
}).listen(port,'127.0.0.1',()=>console.log(`Local: http://localhost:${port}`));
