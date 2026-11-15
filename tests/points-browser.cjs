const assert=require('node:assert/strict');
const path=require('node:path');
const {pathToFileURL}=require('node:url');
const {chromium}=require('playwright');
const {default:AxeBuilder}=require('@axe-core/playwright');
(async()=>{
 const browser=await chromium.launch({channel:'msedge',headless:true});
 try{
  const context=await browser.newContext({locale:'en-US'});await context.route(/^https?:/,r=>r.abort());
  const page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
  const url=pathToFileURL(path.join(__dirname,'../index.html')).href;await page.goto(url);
  const link=page.getByRole('link',{name:'Percentage points',exact:true});await link.focus();await page.keyboard.press('Enter');
  assert.equal(new URL(page.url()).hash,'#percentage-points');assert.equal(await page.locator('#percentage-points h2').textContent(),'Percentage change vs percentage points');
  for(const width of [320,375,768,1280]){
   await page.setViewportSize({width,height:900});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth),width);
   const axe=await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21aa']).analyze();assert.deepEqual(axe.violations.map(v=>v.id),[]);
   console.log(`PASS points ${width}px: reflow and automated WCAG A/AA`);
  }
  await page.locator('#percentage-points').getByRole('link',{name:'free calculator',exact:true}).click();assert.equal(new URL(page.url()).hash,'#calculator-section');
  await page.locator('#mode').selectOption('change');
  assert.equal(await page.locator('#label-a').textContent(),'Original value');assert.equal(await page.locator('#label-b').textContent(),'New value');
  for(const [a,b,result] of [['10','15','50%'],['20','15','-25%'],['-10','-5','-50%'],['0','5','Cannot divide by zero. Enter a nonzero original value.']]){
   await page.locator('#a').fill(a);await page.locator('#b').fill(b);await page.locator('#b').press('Enter');assert.equal(await page.locator('#result').textContent(),result);
  }
  const noJS=await browser.newContext({javaScriptEnabled:false});await noJS.route(/^https?:/,r=>r.abort());const staticPage=await noJS.newPage();await staticPage.goto(url+'#percentage-points');
  assert.equal(await staticPage.locator('#percentage-points').isVisible(),true);assert.deepEqual(errors,[]);
  console.log('PASS points keyboard navigation, calculator labels and four worked inputs, no-JS content, no page errors');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
