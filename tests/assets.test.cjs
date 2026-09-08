const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const root=path.join(__dirname,'..');
const read=f=>fs.readFileSync(path.join(root,f),'utf8');
const sw=read('sw.js');
const version=sw.match(/aktien-liste-v(\d+)/)[1];
for(const page of ['index.html','anmelden.html','verwaltung.html','positionen.html'])test(page+' loads contact before solver with matching cache version',()=>{const html=read(page);for(const file of ['touch-contact.js','black-glass.js','black-glass.css'])assert.ok(html.includes(file+'?v='+version),file);assert.ok(html.indexOf('touch-contact.js')<html.indexOf('black-glass.js'));});
test('all precache assets exist locally',()=>{for(const url of JSON.parse(sw.match(/const PRECACHE = (\[[\s\S]*?\]);/)[1]))assert.ok(fs.existsSync(path.join(root,url.split('?')[0])),url);});
test('all classic inline scripts and root browser scripts parse',()=>{for(const file of fs.readdirSync(root)){if(file.endsWith('.js')){const result=require('node:child_process').spawnSync(process.execPath,['--input-type=module','--check'],{input:read(file),encoding:'utf8'});assert.equal(result.status,0,file+': '+result.stderr);}if(file.endsWith('.html'))for(const m of read(file).matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)){if(/\bsrc\s*=|type\s*=\s*["'](?:module|application\/)/i.test(m[1]))continue;new vm.Script(m[2],{filename:file});}}});
function worker(){const handlers={},puts=[];let fetched=0;const response={ok:true,redirected:false,url:'https://example.test/index.html',headers:{get:()=>null},clone(){return this;}};const ctx={URL,self:{location:{origin:'https://example.test'},addEventListener:(n,fn)=>handlers[n]=fn},caches:{match:async()=>undefined,open:async()=>({put:(...args)=>puts.push(args)})},fetch:async()=>{fetched++;return response;}};vm.runInNewContext(sw,ctx);return {response,puts,get fetched(){return fetched;},async request(path,extra={}){let result;handlers.fetch({request:{url:'https://example.test'+path,method:'GET',headers:{get:()=>''},...extra},respondWith:p=>result=p});await result;await Promise.resolve();}};}
test('API, login, administration and POST bypass service-worker caching',async()=>{const w=worker();for(const url of ['/.netlify/functions/status','/anmelden.html','/verwaltung.html'])await w.request(url);await w.request('/index.html',{method:'POST'});assert.equal(w.fetched,0);assert.equal(w.puts.length,0);});
test('successful app navigation caches an offline shell',async()=>{const w=worker();await w.request('/',{mode:'navigate'});assert.equal(w.puts.length,1);assert.equal(w.puts[0][0],'/index.html');});
test('authentication redirect cannot replace cached app shell',async()=>{const w=worker();w.response.redirected=true;await w.request('/',{mode:'navigate'});assert.equal(w.puts.length,0);});
test('login-marked responses cannot replace cached app shell',async()=>{const w=worker();w.response.headers.get=()=> '1';await w.request('/',{mode:'navigate'});assert.equal(w.puts.length,0);});
