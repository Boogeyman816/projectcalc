const assert=require('node:assert/strict');const path=require('node:path');const {pathToFileURL}=require('node:url');const {chromium}=require('playwright');const {default:AxeBuilder}=require('@axe-core/playwright');
(async()=>{const b=await chromium.launch({channel:'msedge',headless:true});try{
 const c=await b.newContext({locale:'en-US'});await c.route(/^https?:/,r=>r.abort());const p=await c.newPage();const requests=[];const errors=[];p.on('request',r=>requests.push(r.url()));p.on('pageerror',e=>errors.push(e.message));
 const url=pathToFileURL(path.join(__dirname,'../index.html')).href;await p.goto(url);await p.getByRole('link',{name:'About and data handling',exact:true}).focus();await p.keyboard.press('Enter');assert.equal(new URL(p.url()).hash,'#about-methods');
 const count=requests.length;const before=p.url();
 for(const [mode,a,z,out] of [['of','15','200','30'],['ratio','25','200','12.5%'],['change','80','100','25%']]){await p.locator('#mode').selectOption(mode);await p.locator('#a').fill(a);await p.locator('#b').fill(z);await p.locator('#b').press('Enter');assert.equal(await p.locator('#result').textContent(),out);}
 assert.equal(p.url(),before);assert.equal(requests.length,count);assert.deepEqual(await c.cookies(),[]);assert.equal(await p.evaluate(()=>localStorage.length+sessionStorage.length),0);
 console.log('PASS candidate: three calculation modes, no calculation-triggered requests/URL changes/cookies/storage');
 for(const width of [320,375,768,1280]){await p.setViewportSize({width,height:900});assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth),width);assert.deepEqual((await new AxeBuilder({page:p}).withTags(['wcag2a','wcag2aa','wcag21aa']).analyze()).violations.map(v=>v.id),[]);console.log(`PASS about ${width}px reflow/axe`);}
 const noJS=await b.newContext({javaScriptEnabled:false});await noJS.route(/^https?:/,r=>r.abort());const q=await noJS.newPage();await q.goto(url);assert.equal(await q.locator('#about-methods').isVisible(),true);assert.deepEqual(errors,[]);console.log('PASS keyboard about navigation, no-JS description, no page errors');
}finally{await b.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
