import { spawn, spawnSync } from 'node:child_process';
import { randomBytes, randomUUID } from 'node:crypto';
import { strict as assert } from 'node:assert';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { readFileSync } from 'node:fs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const php = process.env.PHP_BIN || 'php';
const phpArgs = process.env.PHP_EXTENSION_DIR ? ['-d', `extension_dir=${process.env.PHP_EXTENSION_DIR}`, '-d', 'extension=pdo_mysql'] : [];
const database = 'pelada_test_' + randomBytes(6).toString('hex');
const password = randomBytes(24).toString('base64url');
const port = process.env.TEST_API_PORT || '8091';
const env = {...process.env, DB_DATABASE: database, DB_HOST: process.env.TEST_DB_HOST || '127.0.0.1', DB_PORT: process.env.TEST_DB_PORT || '3307', DB_USERNAME: process.env.TEST_DB_USER || 'root', DB_PASSWORD: process.env.TEST_DB_PASSWORD || '', APP_ENV: 'development', SESSION_SECURE: 'false', APP_ORIGIN: 'http://localhost:4200', SESSION_IDLE_SECONDS: '3', SESSION_MAX_SECONDS: '28800'};
function run(file, args=[], input) { const r = spawnSync(php, [...phpArgs, file, ...args], {cwd:root, env, input, encoding:'utf8'}); if(r.status !== 0) throw new Error(r.error?.message || r.stderr || r.stdout); return r.stdout; }
console.log(run('api/tests/unit.php').trim());
console.log(run('api/tests/prepare.php', [], JSON.stringify({database,password})).trim());
console.log(run('api/console.php',['create-admin','--name=Administrador de teste','--email=admin@example.test'],password+'\n').trim());
run('api/tests/opening.php');
const repeatedAdmin=spawnSync(php,[...phpArgs,'api/console.php','create-admin','--name=Outro','--email=outro@example.test'],{cwd:root,env,input:password,encoding:'utf8'});
assert.equal(repeatedAdmin.status,1,'Não pode recriar o primeiro administrador');
const server = spawn(php, [...phpArgs, '-S', `127.0.0.1:${port}`, 'api/router.php'], {cwd:root, env, stdio:['ignore','pipe','pipe']});
let serverErrors=''; server.stderr.on('data',d => serverErrors += d);
const base = `http://127.0.0.1:${port}/api`;
let cookie='', token='', count=0;
async function request(path, method='GET', data, options={}) {
  const response = await fetch(base+path, {method, headers:{'Content-Type':'application/json', ...(cookie ? {Cookie:cookie}:{}), ...(method!=='GET' && token ? {'X-CSRF-Token':token}:{}), ...options.headers}, body:data === undefined ? undefined : JSON.stringify(data)});
  const setCookie=response.headers.get('set-cookie'); if(setCookie) cookie=setCookie.split(';')[0];
  const body=await response.json(); return {status:response.status,body,headers:response.headers};
}
async function check(path, method, data, status, options) { const r=await request(path,method,data,options); assert.equal(r.status,status,`${method} ${path}: ${JSON.stringify(r.body)}`); count++; return r.body; }
const period='year=2026&month=10';
const finance=async()=> (await check('/finance?'+period,'GET',undefined,200)).data;
const events=async kind=>(await check(`/events?kind=${kind}&${period}`,'GET',undefined,200)).data;
let created=false;
try {
  for(let i=0;i<100;i++) { try {await request('/session'); created=true; break;} catch {await new Promise(r=>setTimeout(r,100));} }
  assert.ok(created,'PHP server did not start: '+serverErrors);
  let s=await check('/session','GET',undefined,200); token=s.csrfToken; assert.equal(s.user,null);
  const r=await request('/session'); assert.match(r.headers.get('set-cookie')||cookie,/pelada_session/);
  await check('/events?kind=monthly&'+period,'GET',undefined,200);
  await check('/events?kind=monthly','GET',undefined,422);
  await check('/events?kind=monthly&year=2026&month=13','GET',undefined,422);
  await check('/people','GET',undefined,401);
  for(const resource of ['events','expenses']) for(const method of ['POST','PUT','DELETE']) await check('/'+resource+(method==='POST'?'':'/1'),method,{},401);
  await check('/login','POST',{email:'admin@example.test',password},403,{headers:{'X-CSRF-Token':''}});
  await check('/login','POST',{email:'admin@example.test',password:'incorrect'},401);
  s=await check('/login','POST',{email:'admin@example.test',password},200); token=s.csrfToken; assert.equal(s.user.role,'admin');
  await check('/events','POST',{},403,{headers:{'X-CSRF-Token':''}});
  await check('/expenses','POST',{},403,{headers:{Origin:'https://untrusted.test'}});
  // Every event has separate participation; João can attend both 01/10 and 08/10.
  const saved=[];
  for(const [kind,date,amount,names] of [['monthly','2026-10-01','100.00',['João Teste','Pedro Teste']],['daily','2026-10-01','30.00',['João Teste']],['daily','2026-10-08','30.00',['João Teste']],['barbecue','2026-10-15','20.00',['João Teste','Convidado Teste']]]) {
    const draft={kind,date,amount,title:kind+date,requestKey:randomUUID(),participants:names.map((name,i)=>({name,amount,paid:i===0}))};
    const id=(await check('/events','POST',draft,201)).id; saved.push({id,draft});
    const replay=await check('/events','POST',draft,201); assert.equal(replay.id,id);
  }
  let f=await finance(); assert.equal(f.expected,'300.00'); assert.equal(f.received,'180.00'); assert.equal(f.pending,'120.00'); assert.equal(f.accumulatedBalance,'2165.48');
  assert.equal((await events('daily')).length,2);
  await check('/events','POST',{...saved[0].draft,requestKey:randomUUID()},409);
  const monthly=(await events('monthly'))[0];
  await check(`/events/${monthly.id}`,'PUT',{...monthly,version:0},409);
  const edited={...monthly,participants:monthly.participants.map(p=>({...p,paid:true}))};
  await check(`/events/${monthly.id}`,'PUT',edited,200); assert.equal((await finance()).received,'280.00');
  let updated=(await events('monthly'))[0];
  updated.participants.forEach(p=>p.paid=false);
  await check(`/events/${updated.id}`,'PUT',updated,200); assert.equal((await finance()).received,'80.00');
  updated=(await events('monthly'))[0]; updated.participants[0].amount='125.25'; updated.participants[0].paid=true;
  await check(`/events/${updated.id}`,'PUT',updated,200); assert.equal((await finance()).received,'205.25');
  // A failed participant association rolls back people, event and payments together.
  await check('/events','POST',{kind:'daily',date:'2026-10-22',amount:'10.00',title:'rollback',requestKey:randomUUID(),participants:[{name:'Rollback unique',paid:true},{personId:9999999,paid:false}]},422);
  assert.equal((await events('daily')).length,2); assert.equal((await check('/people?search=Rollback','GET',undefined,200)).data.length,0);
  await check('/events','POST',{kind:'daily',date:'2026-10-23',amount:'10.00',title:'duplicates',requestKey:randomUUID(),participants:[{name:'Repetido',paid:true},{name:'Repetido',paid:true}]},422);
  const expenseDraft={date:'2026-10-20',year:2026,month:10,amount:'50.25',category:'field',description:'Despesa de teste',requestKey:randomUUID()};
  const expenseId=(await check('/expenses','POST',expenseDraft,201)).id;
  assert.equal((await check('/expenses','POST',expenseDraft,201)).id,expenseId);
  f=await finance(); assert.equal(f.expenses,'50.25'); assert.equal(f.balance,'155.00');
  let expense=(await check('/expenses?'+period,'GET',undefined,200)).data[0];
  await check(`/expenses/${expense.id}`,'PUT',{...expense,month:10,year:2026,amount:'60.00'},200);
  assert.equal((await finance()).expenses,'60.00');
  expense=(await check('/expenses?'+period,'GET',undefined,200)).data[0];
  await check(`/expenses/${expense.id}`,'DELETE',{version:1},409);
  await check(`/expenses/${expense.id}`,'DELETE',{version:expense.version},200);
  assert.equal((await finance()).expenses,'0.00');
  const bbq=(await events('barbecue'))[0]; await check(`/events/${bbq.id}`,'DELETE',{version:bbq.version},200);
  assert.equal((await finance()).revenues.barbecue.received,'0.00');
  const next=(await check('/finance?year=2026&month=11','GET',undefined,200)).data;
  assert.equal(next.received,'0.00'); assert.equal(next.previousBalance,(await finance()).accumulatedBalance);
  const earlier=(await check('/finance?year=2026&month=9','GET',undefined,200)).data; assert.equal(earlier.accumulatedBalance,null);
  await check('/logout','POST',{},200); await check('/people','GET',undefined,401);
  // Verify independent IP/account throttling with a new account bucket.
  s=await check('/session','GET',undefined,200); token=s.csrfToken;
  for(let i=0;i<5;i++) await check('/login','POST',{email:'missing@example.test',password:'wrong'},401);
  await check('/login','POST',{email:'missing@example.test',password:'wrong'},429);
  s=await check('/login','POST',{email:'admin@example.test',password},200); token=s.csrfToken;
  await new Promise(r=>setTimeout(r,4100)); await check('/people','GET',undefined,401);
  console.log(`${count} verificações HTTP passaram (autenticação, CSRF, CRUD, precisão, filtros, transações, concorrência, saldo, logout, expiração e limite de tentativas).`);
  console.log(run('api/tests/legacy.php').trim());
} finally {
  server.kill();
  await new Promise(r=>server.once('exit',r));
  console.log(run('api/tests/cleanup.php',[database]).trim());
}
