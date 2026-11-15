// Local-only guide QA; uses the same externally provisioned modules as browser.cjs.
const assert=require('node:assert/strict');
const path=require('node:path');
const {pathToFileURL}=require('node:url');
const {chromium}=require('playwright');
const {default:AxeBuilder}=require('@axe-core/playwright');
(async()=>{
 const browser=await chromium.launch({channel:'msedge',headless:true});
 try{
  const context=await browser.newContext({locale:'en-US'});
  await context.route(/^https?:/,route=>route.abort());
  const page=await context.newPage();const errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  const home=pathToFileURL(path.join(__dirname,'../index.html')).href;
  const guide=pathToFileURL(path.join(__dirname,'../discounts.html')).href;
  await page.goto(home);await page.getByRole('link',{name:'Discounts guide',exact:true}).click();
  assert.equal(page.url(),guide);
  assert.equal(await page.locator('h1').textContent(),'Discounts and reverse percentages');
  for(const width of [320,375,768,1280]){
   await page.setViewportSize({width,height:900});
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth),width);
   const axe=await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21aa']).analyze();
   assert.deepEqual(axe.violations.map(v=>v.id),[]);
   console.log(`PASS guide ${width}px: no overflow, automated WCAG A/AA checks`);
  }
  await page.goto(guide);await page.keyboard.press('Tab');
  assert.equal(await page.evaluate(()=>document.activeElement.getAttribute('href')),'#main');
  await page.keyboard.press('Enter');assert.equal(new URL(page.url()).hash,'#main');
  await page.getByRole('link',{name:'Free calculator',exact:true}).click();
  assert.equal(page.url(),home+'#calculator-section');
  for(const [mode,a,b,expected] of [['of','25','120','30'],['ratio','80','80','100%'],['of','20','100','20'],['of','10','80','8'],['ratio','28','100','28%']]){
   await page.locator('#mode').selectOption(mode);await page.locator('#a').fill(a);await page.locator('#b').fill(b);await page.locator('#b').press('Enter');
   assert.equal(await page.locator('#result').textContent(),expected);
  }
  const noJS=await browser.newContext({javaScriptEnabled:false});const staticPage=await noJS.newPage();await staticPage.goto(guide);
  for(const id of ['discount','reverse','successive','limits'])assert.equal(await staticPage.locator('#'+id).isVisible(),true);
  assert.deepEqual(errors,[]);
  console.log('PASS guide round-trip navigation, keyboard skip link, all documented calculator inputs, no-JS sections, no page errors');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
