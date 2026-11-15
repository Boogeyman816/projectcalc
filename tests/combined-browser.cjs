const assert=require('node:assert/strict');const path=require('node:path');const {pathToFileURL}=require('node:url');
const {chromium}=require('playwright');const {default:AxeBuilder}=require('@axe-core/playwright');
(async()=>{const browser=await chromium.launch({channel:'msedge',headless:true});try{
 const context=await browser.newContext({locale:'en-US'});await context.route(/^https?:/,r=>r.abort());const page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
 const url=pathToFileURL(path.join(__dirname,'../index.html')).href;await page.goto(url);
 await page.getByRole('link',{name:'Combined rates',exact:true}).focus();await page.keyboard.press('Enter');assert.equal(new URL(page.url()).hash,'#combined-rates');
 for(const width of [320,375,768,1280]){await page.setViewportSize({width,height:900});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth),width);assert.deepEqual((await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21aa']).analyze()).violations.map(v=>v.id),[]);console.log(`PASS combined ${width}px reflow and axe WCAG A/AA`);}
 await page.locator('#combined-rates').getByRole('link',{name:'free calculator',exact:true}).click();assert.equal(new URL(page.url()).hash,'#calculator-section');await page.locator('#mode').selectOption('ratio');
 assert.equal(await page.locator('#label-a').textContent(),'Part');assert.equal(await page.locator('#label-b').textContent(),'Total');
 for(const [a,b,out] of [['18','20','90%'],['40','80','50%'],['58','100','58%'],['28','40','70%'],['0','20','0%'],['0','0','Cannot divide by zero. Enter a nonzero total.']]){await page.locator('#a').fill(a);await page.locator('#b').fill(b);await page.locator('#b').press('Enter');assert.equal(await page.locator('#result').textContent(),out);}
 const noJS=await browser.newContext({javaScriptEnabled:false});await noJS.route(/^https?:/,r=>r.abort());const staticPage=await noJS.newPage();await staticPage.goto(url+'#combined-rates');assert.equal(await staticPage.locator('#combined-rates').isVisible(),true);assert.deepEqual(errors,[]);
 console.log('PASS combined keyboard/navigation, ratio labels, six input cases, zero denominator, no-JS content, no page errors');
}finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
