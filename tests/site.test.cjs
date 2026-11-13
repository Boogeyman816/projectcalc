const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const html=fs.readFileSync(require('node:path').join(__dirname,'../index.html'),'utf8');
const context={};
vm.runInNewContext(html.match(/<script id="math">([\s\S]*?)<\/script>/)[1],context);
const c=context.calculate;
for(const [mode,a,b,expected] of [['of',15,200,30],['of',0,200,0],['of',150,20,30],['of',-10,200,-20],['ratio',25,200,12.5],['ratio',0,20,0],['change',80,100,25],['change',100,80,-20],['change',10,10,0],['change',100,0,-100]]){
 test(`${mode} ${a}, ${b} yields ${expected}`,()=>assert.equal(c(mode,a,b),expected));
}
for(const [mode,a,b] of [['ratio',2,0],['change',0,2],['of',Infinity,1],['of',NaN,1]]){
 test(`rejects invalid ${mode} ${a}, ${b}`,()=>assert.throws(()=>c(mode,a,b)));
}
test('declares the secure canonical URL',()=>assert.match(html,/<link rel="canonical" href="https:\/\/mypercentagecalc.net\/">/));
test('offers accessible section navigation with valid targets',()=>{
 assert.match(html,/<nav aria-label="On this page">/);
 for(const id of ['calculator-section','how-it-works','examples','faq']){
  assert.ok(html.includes(`href="#${id}"`),`missing ${id} navigation`);
  assert.ok(html.includes(`id="${id}"`),`missing ${id} target`);
 }
});
test('explains JavaScript requirement without hiding the formulas',()=>assert.match(html,/<noscript>[\s\S]*JavaScript[\s\S]*<\/noscript>/));
test('includes worked examples for discounts and percentage points',()=>{
 assert.match(html,/\$170/);
 assert.match(html,/percentage points/);
});
