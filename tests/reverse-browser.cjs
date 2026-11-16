const assert=require('node:assert/strict');const path=require('node:path');const {pathToFileURL}=require('node:url');const {chromium}=require('playwright');
(async()=>{const b=await chromium.launch({channel:'msedge',headless:true});try{
 const c=await b.newContext({locale:'en-US'});await c.route(/^https?:/,r=>r.abort());const p=await c.newPage();const errors=[];p.on('pageerror',e=>errors.push(e.message));
 await p.goto(pathToFileURL(path.join(__dirname,'../discounts.html')).href+'#reverse-increase');assert.equal(await p.locator('#reverse-increase').textContent(),'Recover an amount before an increase');
 await p.locator('#reverse').getByRole('link',{name:'free calculator',exact:true}).click();assert.equal(new URL(p.url()).hash,'#calculator-section');await p.locator('#mode').selectOption('ratio');
 assert.equal(await p.locator('#label-a').textContent(),'Part');assert.equal(await p.locator('#label-b').textContent(),'Total');
 for(const [a,total,result] of [['150','125','120%'],['80','80','100%'],['150','100','150%'],['0','0','Cannot divide by zero. Enter a nonzero total.'],['5','0','Cannot divide by zero. Enter a nonzero total.']]){await p.locator('#a').fill(a);await p.locator('#b').fill(total);await p.locator('#b').press('Enter');assert.equal(await p.locator('#result').textContent(),result);}
 assert.deepEqual(errors,[]);console.log('PASS reverse increase navigation, ratio labels, increase/discount/zero-change examples and zero-denominator rejection; no page errors');
}finally{await b.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
