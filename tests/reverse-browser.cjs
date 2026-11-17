// Local-only QA. A task-owned loopback server observes actual requests, including
// no-JS reloads. All external attempts are recorded AND fail, even if aborted.
const assert=require('node:assert/strict');
const path=require('node:path');const fs=require('node:fs');const http=require('node:http');
const {chromium}=require('playwright');const {default:AxeBuilder}=require('@axe-core/playwright');
const root=path.join(__dirname,'..');
const inc='original-increase',dec='original-decrease';
const sentinels=['731927.24681','37.19483'];
const snapshot=async(p,c)=>({...(await p.evaluate(()=>({
 url:location.href,historyLength:history.length,historyState:history.state,
 local:Object.entries(localStorage),session:Object.entries(sessionStorage),
 cookie:document.cookie,historyCalls:window.qaHistoryCalls||[]
}))),cookies:await c.cookies()});
(async()=>{
 const received=[],attempts=[],external=[],errors=[];
 const server=http.createServer((req,res)=>{
  let body='';req.on('data',chunk=>body+=chunk);req.on('end',()=>{
   received.push({url:req.url,method:req.method,body});
   const file=new URL(req.url,'http://localhost').pathname;
   if(file==='/favicon.ico'){res.writeHead(204);res.end();return;}
   if(!['/','/index.html','/discounts.html'].includes(file)){res.writeHead(404);res.end();return;}
   res.writeHead(200,{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store'});
   res.end(fs.readFileSync(path.join(root,file==='/index.html'||file==='/'?'index.html':'discounts.html')));
  });
 });
 let browser;
 try{
  await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(0,'127.0.0.1',resolve);});
  const origin=`http://127.0.0.1:${server.address().port}`;
  console.log('Task-owned local server',origin);
  browser=await chromium.launch({channel:'msedge',headless:true});
  async function context(javaScriptEnabled){
   const c=await browser.newContext({locale:'en-US',javaScriptEnabled});
   c.on('request',r=>attempts.push({url:r.url(),method:r.method(),body:r.postData()}));
   await c.route('**/*',route=>{
    if(new URL(route.request().url()).origin!==origin){external.push(route.request().url());return route.abort();}
    return route.continue();
   });
   c.on('page',p=>{p.on('pageerror',e=>errors.push(e.message));p.on('console',m=>{if(m.type()==='error')errors.push(m.text());});});
   return c;
  }
  const c=await context(true);
  await c.addInitScript(()=>{
   window.qaHistoryCalls=[];
   for(const key of ['pushState','replaceState']){
    const original=history[key];history[key]=function(...args){window.qaHistoryCalls.push([key,...args]);return original.apply(this,args);};
   }
  });
  const p=await c.newPage();
  await p.goto(origin+'/discounts.html#reverse-increase');
  assert.equal(await p.locator('#reverse-increase').textContent(),'Recover an amount before an increase');
  await p.locator('#reverse').getByRole('link',{name:'free calculator',exact:true}).click();
  await p.waitForLoadState('networkidle');
  assert.equal(new URL(p.url()).hash,'#calculator-section');
  const before=await snapshot(p,c),count=attempts.length,serverCount=received.length;
  assert.equal(await p.locator('#result').getAttribute('aria-live'),'polite');
  // Select both new options using the keyboard, not only selectOption().
  await p.locator('#mode').focus();await p.keyboard.press('Home');
  for(let i=0;i<3;i++)await p.keyboard.press('ArrowDown');
  assert.equal(await p.locator('#mode').inputValue(),inc);
  assert.equal(await p.getByLabel('Final amount',{exact:true}).count(),1);
  assert.equal(await p.getByLabel('Increase rate (%)',{exact:true}).count(),1);
  await p.keyboard.press('End');assert.equal(await p.locator('#mode').inputValue(),dec);
  assert.equal(await p.getByLabel('Decrease rate (%)',{exact:true}).count(),1);
  async function run(mode,a,b,want,button=false){
   await p.locator('#mode').selectOption(mode);
   assert.equal(await p.locator('#result').textContent(),'Enter two numbers to get started.');
   await p.locator('#a').fill(a);await p.locator('#b').fill(b);
   assert.equal(await p.locator('#result').textContent(),'Press Calculate to update the result.');
   if(button)await p.getByRole('button',{name:'Calculate',exact:true}).click();else await p.locator('#b').press('Enter');
   const got=await p.locator('#result').textContent();
   if(want instanceof RegExp)assert.match(got,want);else assert.equal(got,want);
  }
  for(const row of [
   [inc,'150','25','120'],[dec,'80','20','100'],[dec,'150','25','200'],
   [inc,'10','20','8.333333'],[dec,'150','10','166.666667'],
   [inc,'120','0','120'],[dec,'120','0','120'],[dec,'0','20','0'],[inc,'0','200','0'],[inc,'300','200','100'],
   [inc,'-1','20',/nonnegative/],[dec,'1','-20',/nonnegative/],[dec,'0','100',/unique original/],
   [dec,'1','100',/inconsistent/],[dec,'1','100.01',/below 100/],
   [dec,'1.7976931348623157e308','50',/supported range/],
   [inc,'5e-324','200',/too small/],[inc,'1e-10','0','1E-10'],[dec,'1e-10','0','1E-10'],
   [inc,'5e-324','0','5E-324'],[dec,'5e-324','0','5E-324'],
   [dec,'1','99.9999','999,999.999967'],[dec,'1','99.99999999999999','7,036,874,417,766,400'],
   ['of','-10','200','-20'],['ratio','25','200','12.5%'],['change','-10','-5','-50%']
  ])await run(...row);
  // Both submission routes with unique nonconfidential sentinels.
  for(const mode of [inc,dec]){
   await run(mode,...sentinels,/^[\d,.]+$/,true);
   await run(mode,...sentinels,/^[\d,.]+$/);
   for(const id of ['a','b']){
    await p.locator('#a').fill('150');await p.locator('#b').fill('25');await p.locator('#'+id).fill('');
    await p.getByRole('button',{name:'Calculate',exact:true}).click();
    assert.equal(await p.locator('#'+id).evaluate(el=>el.validity.valueMissing),true);
    assert.equal(await p.evaluate(()=>document.activeElement.id),id);
   }
   // A nonfinite number cannot be submitted via a number input; browser flags invalid/empty.
   await p.locator('#a').fill('1e309');await p.locator('#b').fill('25');
   assert.equal(await p.locator('#a').evaluate(el=>el.validity.valid),false);
  }
  await p.waitForTimeout(150);
  assert.equal(attempts.length,count);assert.equal(received.length,serverCount);
  assert.deepEqual(await snapshot(p,c),before);
  console.log('PASS JS: keyboard options/labels, Enter/button, aria-live errors/stale resets, domains/format/boundaries; zero new attempted or received requests; URL/history/storage/cookies unchanged');
  for(const mode of [inc,dec]){
   await run(mode,String(Number.MAX_VALUE),'0',new Intl.NumberFormat('en-US',{maximumFractionDigits:6}).format(Number.MAX_VALUE));
   for(const width of [320,375,768,1280]){
    await p.setViewportSize({width,height:900});
    assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth),width);
    assert.deepEqual((await new AxeBuilder({page:p}).withTags(['wcag2a','wcag2aa','wcag21aa']).analyze()).violations.map(v=>v.id),[]);
    console.log(`PASS ${mode} ${width}px extreme result reflow/axe`);
   }
  }
  // Native submission with JS disabled: reloads are allowed, input transmission is not.
  const noJS=await context(false),q=await noJS.newPage();
  await q.goto(origin+'/index.html');await q.waitForLoadState('networkidle');
  assert.equal(await q.locator('noscript').isVisible(),true);
  assert.match(await q.locator('#how-it-works').textContent(),/Original amount = final amount/);
  const noJSBefore=await snapshot(q,noJS),noJSCount=attempts.length,noJSServer=received.length;
  for(const mode of [inc,dec])for(const button of [false,true]){
   await q.locator('#mode').selectOption(mode);await q.locator('#a').fill(sentinels[0]);await q.locator('#b').fill(sentinels[1]);
   await Promise.all([q.waitForEvent('load'),button?q.getByRole('button',{name:'Calculate',exact:true}).click():q.locator('#b').press('Enter')]);
   await q.waitForLoadState('networkidle');
   const u=new URL(q.url());assert.equal(u.origin,origin);assert.equal(u.pathname,'/index.html');assert.equal(u.search,'');
  }
  assert.ok(attempts.length>noJSCount,'no-JS reload requests were observed');
  for(const r of attempts.slice(noJSCount)){
   assert.equal(new URL(r.url).search,'');assert.equal(r.method,'GET');assert.ok(!r.body);
  }
  for(const r of received.slice(noJSServer)){assert.equal(new URL(r.url,origin).search,'');assert.equal(r.method,'GET');assert.equal(r.body,'');}
  for(const r of [...attempts,...received])for(const s of sentinels)assert.ok(!JSON.stringify(r).includes(s),'input transmission attempt');
  const noJSAfter=await snapshot(q,noJS);
  for(const key of ['local','session','cookie','cookies','historyState'])assert.deepEqual(noJSAfter[key],noJSBefore[key]);
  console.log('PASS no-JS: formulas visible; four native submissions reload without inputs/query/body; storage/cookies unchanged',JSON.stringify({requests:attempts.length-noJSCount,historyBefore:noJSBefore.historyLength,historyAfter:noJSAfter.historyLength}));
  assert.deepEqual(external,[]);assert.deepEqual(errors,[]);
  console.log('PASS no external attempts or console/page errors');
 }finally{
  if(browser)await browser.close();
  await new Promise(resolve=>server.close(resolve));
  assert.equal(server.listening,false);console.log('Task-owned local server closed');
 }
})().catch(e=>{console.error(e);process.exitCode=1;});
