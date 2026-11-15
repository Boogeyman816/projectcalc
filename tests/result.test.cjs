const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const html=fs.readFileSync(require('node:path').join(__dirname,'../index.html'),'utf8');
const context={};
vm.runInNewContext(html.match(/<script id="math">([\s\S]*?)<\/script>/)[1],context);
const {calculate,formatResult}=context;
for(const value of [1e-10,-1e-10,9.999999e-7,Number.MIN_VALUE]){
 test(`preserves tiny nonzero display ${value}`,()=>{
  assert.equal(formatResult(value,'of'),new Intl.NumberFormat(undefined,{notation:'scientific',maximumSignificantDigits:7}).format(value));
 });
}
for(const [value,mode] of [[30,'of'],[12.5,'ratio'],[-20,'change'],[0.000001,'of'],[1/3,'ratio'],[1e100,'of']]){
 test(`ordinary formatting ${value} ${mode}`,()=>assert.equal(formatResult(value,mode),new Intl.NumberFormat(undefined,{maximumFractionDigits:6}).format(value)+(mode==='of'?'':'%')));
}
test('negative zero is displayed as zero',()=>assert.equal(formatResult(-0,'change'),'0%'));
test('tiny percentage retains its unit',()=>assert.equal(formatResult(calculate('ratio',1e-12,1),'ratio'),formatResult(1e-10,'of')+'%'));
test('negative starting values follow the documented formula',()=>assert.equal(calculate('change',-10,-5),-50));
test('overflow is rejected rather than displayed as infinity',()=>assert.throws(()=>calculate('ratio',1e308,1e-308),/supported range/));
test('long results can wrap on narrow screens',()=>assert.match(html,/output\{[^}]*overflow-wrap:anywhere/));
