// Optional browser QA: provide playwright and @axe-core/playwright through NODE_PATH.
const assert=require('node:assert/strict');
const {pathToFileURL}=require('node:url');
const path=require('node:path');
const {chromium}=require('playwright');
const {default:AxeBuilder}=require('@axe-core/playwright');
(async()=>{
 const browser=await chromium.launch({channel:'msedge',headless:true});
 try{
  const context=await browser.newContext({locale:'en-US'});
  const page=await context.newPage();
  const errors=[];
  page.on('pageerror',error=>errors.push(error.message));
  await page.goto(pathToFileURL(path.join(__dirname,'../index.html')).href);
  for(const [mode,a,b,label,labelB,expected] of [
   ['of','15','200','Percentage (%)','Number','30'],
   ['ratio','25','200','Part','Total','12.5%'],
   ['change','100','80','Original value','New value','-20%'],
   ['change','-10','-5','Original value','New value','-50%'],
   ['of','0.00000001','1','Percentage (%)','Number','1E-10']
  ]){
   await page.locator('#mode').selectOption(mode);
   assert.equal(await page.locator('#label-a').textContent(),label);
   assert.equal(await page.locator('#label-b').textContent(),labelB);
   await page.locator('#a').fill(a); await page.locator('#b').fill(b);
   await page.locator('#b').press('Enter');
   assert.equal(await page.locator('#result').textContent(),expected);
  }
  await page.locator('#mode').selectOption('ratio');
  await page.locator('#b').fill('0'); await page.locator('#b').press('Enter');
  assert.match(await page.locator('#result').textContent(),/Cannot divide by zero/);
  await page.evaluate(()=>{
   window.qaSubmissions=0;
   document.getElementById('calculator').addEventListener('submit',()=>window.qaSubmissions++);
  });
  for(const id of ['a','b']){
   await page.locator('#a').fill('15'); await page.locator('#b').fill('200');
   await page.locator('#'+id).fill('');
   assert.equal(await page.locator('#'+id).evaluate(el=>el.validity.valueMissing),true);
   const before=await page.locator('#result').textContent();
   await page.getByRole('button',{name:'Calculate',exact:true}).click();
   assert.equal(await page.evaluate(()=>window.qaSubmissions),0);
   assert.equal(await page.evaluate(()=>document.activeElement.id),id);
   assert.equal(await page.locator('#result').textContent(),before);
  }
  await page.locator('#mode').selectOption('of');
  await page.locator('#a').fill('100'); await page.locator('#b').fill('1e100');
  await page.locator('#b').press('Tab');
  assert.equal(await page.evaluate(()=>document.activeElement.type),'submit');
  await page.keyboard.press('Enter');
  assert.equal(await page.locator('#result').textContent(),new Intl.NumberFormat('en-US',{maximumFractionDigits:6}).format(1e100));
  for(const width of [320,375,768,1280]){
   await page.setViewportSize({width,height:900});
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth),width);
   const axe=await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21aa']).analyze();
   assert.deepEqual(axe.violations.map(v=>v.id),[]);
   console.log(`PASS ${width}px: long result reflow and automated WCAG A/AA checks`);
  }
  assert.deepEqual(errors,[]);
  const noJS=await browser.newContext({javaScriptEnabled:false});
  const staticPage=await noJS.newPage();
  await staticPage.goto(pathToFileURL(path.join(__dirname,'../index.html')).href);
  assert.equal(await staticPage.locator('noscript').isVisible(),true);
  assert.equal(await staticPage.locator('#examples').isVisible(),true);
  console.log('PASS modes, labels, keyboard submission, zero division, required input, no-JS content, no page errors');
 }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
