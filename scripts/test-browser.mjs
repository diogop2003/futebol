import {spawn,spawnSync} from 'node:child_process';
import {mkdirSync,writeFileSync,readFileSync} from 'node:fs';
import {resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {strict as assert} from 'node:assert';
import {randomBytes} from 'node:crypto';

const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const chrome=process.env.CHROME_BIN||'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const php=process.env.PHP_BIN||'php';
const phpArgs=process.env.PHP_EXTENSION_DIR?['-d',`extension_dir=${process.env.PHP_EXTENSION_DIR}`,'-d','extension=pdo_mysql']:[];
const database='pelada_test_'+randomBytes(6).toString('hex'); const password=randomBytes(24).toString('base64url');
const env={...process.env,DB_DATABASE:database,DB_HOST:process.env.TEST_DB_HOST||'127.0.0.1',DB_PORT:process.env.TEST_DB_PORT||'3307',DB_USERNAME:process.env.TEST_DB_USER||'root',DB_PASSWORD:process.env.TEST_DB_PASSWORD||'',APP_ENV:'development',SESSION_SECURE:'false',APP_ORIGIN:'http://localhost:4201',API_PORT:'8001',PREVIEW_PORT:'4201'};
function run(file,args=[],input){const r=spawnSync(php,[...phpArgs,file,...args],{cwd:root,env,input,encoding:'utf8'});if(r.status!==0)throw new Error(r.error?.message||r.stderr||r.stdout);return r.stdout;}
console.log(run('api/tests/prepare.php',[],JSON.stringify({database,password})).trim());
console.log(run('api/console.php',['create-admin','--name=Administrador de teste','--email=admin@example.test'],password+'\n').trim());
run('api/tests/opening.php');
console.log(run('api/tests/legacy.php').trim());
mkdirSync(resolve(root,'test-results'),{recursive:true});
const api=spawn(php,[...phpArgs,'-S','127.0.0.1:8001','api/router.php'],{cwd:root,env,stdio:'ignore'});
const web=spawn(process.execPath,['scripts/preview.mjs'],{cwd:root,env,stdio:'ignore'});
const browser=spawn(chrome,['--headless=new','--disable-gpu','--no-first-run','--no-default-browser-check','--remote-debugging-port=9223',`--user-data-dir=${resolve(root,'.tools/chrome-qa')}`,'about:blank'],{cwd:root,stdio:'ignore'});
let ws, count=0; const pending=new Map(); const errors=[];
async function waitFor(fn,label){for(let i=0;i<150;i++){try{if(await fn())return;}catch{}await new Promise(r=>setTimeout(r,100));}throw new Error('Timeout: '+label);}
let id=0;
function send(method,params={}){const call=++id;return new Promise((yes,no)=>{const timer=setTimeout(()=>{pending.delete(call);no(new Error('CDP timeout '+method));},15000);pending.set(call,{yes:r=>{clearTimeout(timer);yes(r);},no});ws.send(JSON.stringify({id:call,method,params}));});}
async function evaluate(expression){const r=await send('Runtime.evaluate',{expression,awaitPromise:true,returnByValue:true});if(r.exceptionDetails)throw new Error(r.exceptionDetails.text);return r.result.value;}
async function navigate(path){await send('Page.navigate',{url:'http://localhost:4201'+path});await waitFor(()=>evaluate(`!!document.querySelector('h1') && !document.body.innerText.includes('Carregando registros') && !document.body.innerText.includes('Calculando indicadores')`),path);}
async function clickText(text,selector='button'){const found=await evaluate(`(()=>{const el=[...document.querySelectorAll(${JSON.stringify(selector)})].find(x=>x.textContent.trim()===${JSON.stringify(text)});if(!el)return false;el.click();return true;})()`);assert.ok(found,`Elemento ausente: ${text}`);}
async function fill(name,value){await evaluate(`(()=>{const e=document.querySelector('[name="${name}"]');if(!e)throw new Error('Campo ausente: ${name}');e.value=${JSON.stringify(value)};e.dispatchEvent(new Event('input',{bubbles:true}));e.dispatchEvent(new Event('change',{bubbles:true}));})()`);}
async function screenshot(name){const r=await send('Page.captureScreenshot',{format:'png',captureBeyondViewport:true});writeFileSync(resolve(root,`test-results/${name}.png`),Buffer.from(r.data,'base64'));}
try {
  await waitFor(async()=>{const r=await fetch('http://localhost:4201/');return r.ok;},'preview');
  let targets;await waitFor(async()=>{targets=await(await fetch('http://127.0.0.1:9223/json/list')).json();return targets.some(t=>t.type==='page');},'Chrome');
  ws=new WebSocket(targets.find(t=>t.type==='page').webSocketDebuggerUrl);await new Promise((yes,no)=>{ws.onopen=yes;ws.onerror=no;});
  ws.onmessage=event=>{const m=JSON.parse(event.data);if(m.id&&pending.has(m.id)){const p=pending.get(m.id);pending.delete(m.id);m.error?p.no(new Error(m.error.message)):p.yes(m.result);}if(m.method==='Runtime.exceptionThrown')errors.push(m.params.exceptionDetails.text);};
  await send('Page.enable');await send('Runtime.enable');
  for(const [device,width,height] of [['desktop',1440,1000],['tablet',768,1024],['mobile',390,844],['small-mobile',320,740]]){
    await send('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:width<600});
    for(const path of ['/?year=2026&month=10','/mensalistas?year=2026&month=10','/diaristas?year=2026&month=10','/churrasco?year=2026&month=10','/login']){
      await navigate(path);
      const layout=await evaluate('({viewport:innerWidth,scroll:document.documentElement.scrollWidth})');assert.ok(layout.scroll<=layout.viewport+1,`${device} ${path}: rolagem horizontal ${JSON.stringify(layout)}`);count++;
      if(path.startsWith('/?')){assert.ok((await evaluate('document.body.innerText')).includes('1.765,65'),'Saldo real não renderizado');await screenshot(`saldo-${device}`);}
    }
  }
  await navigate('/gerenciamento/monthly');await waitFor(()=>evaluate('location.pathname === "/login"'),'guard');count++;
  await waitFor(()=>evaluate('!!document.querySelector("[name=email]")'),'login form');
  await fill('email','admin@example.test');await fill('password',password);
  await waitFor(()=>evaluate('!document.querySelector("button[type=submit]").disabled'),'session');await clickText('Entrar','button');
  await waitFor(()=>evaluate('location.pathname.startsWith("/gerenciamento/") && !!document.querySelector(".record-list")'),'login');count++;
  const dialogHandler=async event=>{const m=JSON.parse(event.data);if(m.method==='Page.javascriptDialogOpening')await send('Page.handleJavaScriptDialog',{accept:true});};ws.addEventListener('message',dialogHandler);
  for(const [width,height] of [[1440,1000],[768,1024],[390,844],[320,740]]) {
    await send('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:width<600});
    for(const module of ['monthly','daily','barbecue','expenses']) {
      await navigate(`/gerenciamento/${module}?year=2026&month=11`);await clickText('+ Novo registro');
      assert.ok(await evaluate('document.documentElement.scrollWidth <= innerWidth'),`Editor ${module} ultrapassa ${width}px`);count++;
      await clickText('Cancelar');await waitFor(()=>evaluate('!document.querySelector(".editor")'),'cancelar formulário vazio');
    }
  }
  await navigate('/gerenciamento/monthly?year=2026&month=11');
  const monthlySource=await evaluate(`fetch('/api/events?kind=monthly&year=2026&month=10').then(r=>r.json()).then(r=>r.data[0])`);
  const financeBeforeImport=await evaluate(`fetch('/api/finance?year=2026&month=11').then(r=>r.json()).then(r=>r.data)`);
  await clickText('+ Novo registro');await clickText('Importar lista do mês anterior');
  await waitFor(()=>evaluate('document.body.innerText.includes("Lista de outubro/2026 copiada")'),'importar mensalistas');
  assert.equal(await evaluate('document.querySelectorAll(".participant-editor li").length'),monthlySource.participants.length);
  assert.equal(await evaluate('document.querySelectorAll(".payment-toggle.paid").length'),0);
  assert.equal(await evaluate('document.querySelector("[name=title]").value'),'');
  assert.ok(await evaluate('document.documentElement.scrollWidth <= innerWidth'),'Importação de mensalistas ultrapassa viewport móvel');count++;
  await screenshot('importar-mensalistas-mobile');
  await clickText('Cancelar');await waitFor(()=>evaluate('!document.querySelector(".editor")'),'cancelar lista importada');
  assert.deepEqual(await evaluate(`fetch('/api/events?kind=monthly&year=2026&month=11').then(r=>r.json()).then(r=>r.data)`),[]);
  assert.deepEqual(await evaluate(`fetch('/api/finance?year=2026&month=11').then(r=>r.json()).then(r=>r.data)`),financeBeforeImport);count++;
  await clickText('+ Novo registro');await clickText('Importar lista do mês anterior');
  await waitFor(()=>evaluate('document.body.innerText.includes("Lista de outubro/2026 copiada")'),'reimportar mensalistas');
  await clickText('Salvar');await waitFor(()=>evaluate('document.body.innerText.includes("Alterações salvas com sucesso")'),'salvar mensalistas importados');
  const imported=await evaluate(`fetch('/api/events?kind=monthly&year=2026&month=11').then(r=>r.json()).then(r=>r.data[0])`);
  assert.notEqual(imported.id,monthlySource.id);assert.equal(imported.date,'2026-11-01');
  assert.deepEqual(imported.participants,monthlySource.participants.map(p=>({...p,paid:false,paidAt:null})));
  assert.equal(imported.totals.received,'0.00');assert.equal(imported.totals.pending,monthlySource.totals.expected);count++;
  assert.deepEqual(await evaluate(`fetch('/api/events?kind=monthly&year=2026&month=10').then(r=>r.json()).then(r=>r.data[0])`),monthlySource);
  const financeAfterImport=await evaluate(`fetch('/api/finance?year=2026&month=11').then(r=>r.json()).then(r=>r.data)`);
  assert.equal(financeAfterImport.received,financeBeforeImport.received);assert.equal(financeAfterImport.accumulatedBalance,financeBeforeImport.accumulatedBalance);count++;
  await send('Page.navigate',{url:'http://localhost:4201/gerenciamento/daily?year=2026&month=11'});await waitFor(()=>evaluate('document.querySelector("h1")?.innerText === "Diárias" && !document.body.innerText.includes("Carregando registros")'),'diárias');
  await clickText('+ Novo registro');await fill('amount','30,00');await fill('newName','Participante navegador');await clickText('Adicionar');await clickText('Não pago');
  const noOverflow=await evaluate('document.documentElement.scrollWidth <= innerWidth');assert.ok(noOverflow,'Editor móvel ultrapassa viewport');count++;
  await screenshot('gerenciamento-mobile');
  await clickText('Salvar');await waitFor(()=>evaluate('document.body.innerText.includes("Alterações salvas com sucesso")'),'salvar');count++;
  await navigate('/diaristas?year=2026&month=11');assert.ok((await evaluate('document.body.innerText')).includes('Participante navegador'));count++;
  await navigate('/gerenciamento/expenses?year=2026&month=11');await clickText('+ Novo registro');await fill('amount','50,00');await fill('description','Despesa cancelada');
  await clickText('Cancelar');await waitFor(()=>evaluate('!document.querySelector(".editor")'),'cancelar gasto');count++;
  await navigate('/?year=2026&month=11');const body=await evaluate('document.body.innerText');assert.ok(body.includes('1.795,65'),'Saldo após pagamento deve subir R$30 e cancelamento não pode alterar despesas');count++;
  await clickText('Sair');await waitFor(()=>evaluate('!document.querySelector("nav").innerText.includes("Gerenciamento")'),'logout');count++;
  assert.deepEqual(errors,[],'Exceções no navegador');
  console.log(`${count} verificações de navegador passaram: 4 resoluções, páginas públicas, login, guard, importação de mensalistas, cadastro, pagamento, consulta pública, cancelamento e logout.`);
} finally {
  if(ws)ws.close(); browser.kill();web.kill();api.kill();
  console.log(run('api/tests/cleanup.php',[database]).trim());
}
