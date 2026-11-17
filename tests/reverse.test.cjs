const test=require('node:test');const assert=require('node:assert/strict');const fs=require('node:fs');const path=require('node:path');
const html=fs.readFileSync(path.join(__dirname,'../discounts.html'),'utf8');
const vm=require('node:vm');
const home=fs.readFileSync(path.join(__dirname,'../index.html'),'utf8');
const ctx={};vm.runInNewContext(home.match(/<script id="math">([\s\S]*?)<\/script>/)[1],ctx);
test('dedicated original amount options calculate and format amounts',()=>{
 assert.equal(ctx.calculate('original-increase',150,25),120);
 assert.equal(ctx.calculate('original-decrease',80,20),100);
 for(const mode of ['original-increase','original-decrease']){
  assert.equal(ctx.formatResult(120,mode),'120');
  assert.ok(home.includes(`value="${mode}"`));
 }
});
test('reverse increase complements existing discount explanation',()=>{
 const s=html.match(/<section[^>]*id="reverse"[\s\S]*?<\/section>/)[0];
 assert.match(s,/Original amount = final amount ÷ \(1 \+ r ÷ 100\)/);
 assert.match(s,/id="reverse-increase"/);assert.match(s,/150 ÷ 1\.25 = <strong>120<\/strong>/);
 assert.match(s,/150 × 0\.75 = 112\.5/);assert.equal(150/(1+25/100),120);assert.equal(120*(1+25/100),150);assert.equal(150*.75,112.5);
 assert.match(s,/Original amount before an increase/);assert.match(s,/150 and 25/);assert.match(s,/without a percent sign/);
 assert.doesNotMatch(s,/150 and 125|80 and 80|dedicated reverse-price mode/);
});
// Independent oracle: decode IEEE-754 inputs to exact BigInt rationals,
// solve the forward equation 100*final = original*(100 +/- rate),
// then bound the implementation's answer within four representable steps.
function rational(x){
 const view=new DataView(new ArrayBuffer(8));view.setFloat64(0,x);
 const bits=view.getBigUint64(0),exp=Number((bits>>52n)&2047n);
 let n=bits&((1n<<52n)-1n);if(exp)n+=1n<<52n;
 const shift=exp?exp-1023-52:-1074;
 return shift>=0?[n<<BigInt(shift),1n]:[n,1n<<BigInt(-shift)];
}
function adjacent(x,steps){
 const v=new DataView(new ArrayBuffer(8));v.setFloat64(0,x);
 v.setBigUint64(0,v.getBigUint64(0)+BigInt(steps));return v.getFloat64(0);
}
function checkOracle(mode,a,b){
 const [an,ad]=rational(a),[bn,bd]=rational(b);
 const n=100n*an*bd,d=ad*(100n*bd+(mode==='original-increase'?bn:-bn));
 assert.ok(d>0n);
 const actual=ctx.calculate(mode,a,b);assert.ok(Number.isFinite(actual)&&actual>=0);
 if(a>0)assert.ok(actual>0);
 const lo=actual>Number.MIN_VALUE*4?adjacent(actual,-4):0;
 const hi=adjacent(actual,4);
 const [ln,ld]=rational(lo);assert.ok(ln*d<=n*ld,`${mode} ${a} ${b}: low bound`);
 if(Number.isFinite(hi)){const [hn,hd]=rational(hi);assert.ok(hn*d>=n*hd,`${mode} ${a} ${b}: high bound`);}
 return actual;
}
const near100=adjacent(100,-1);
test('exact rational oracle: ordinary, near-100, huge and subnormal inputs',()=>{
 assert.ok(near100<100);assert.equal(adjacent(near100,1),100);
 for(const mode of ['original-increase','original-decrease']){
  for(const a of [0,80,150,1e-10,1e-300])
   for(const b of [0,20,25,99.9999,near100])checkOracle(mode,a,b);
  assert.equal(ctx.calculate(mode,Number.MAX_VALUE,0),Number.MAX_VALUE);
  assert.equal(ctx.calculate(mode,120,0),120);
  checkOracle(mode,Number.MIN_VALUE,0);
 }
 checkOracle('original-increase',Number.MAX_VALUE,Number.MAX_VALUE);
 checkOracle('original-increase',Number.MAX_VALUE,200);
 checkOracle('original-increase',1e-300,200);
 checkOracle('original-decrease',Number.MIN_VALUE,50);
 checkOracle('original-decrease',1,near100);
 checkOracle('original-increase',10,20);
 checkOracle('original-decrease',150,10);
 assert.equal(ctx.calculate('original-decrease',150,25),200);
 assert.equal(ctx.calculate('original-increase',300,200),100);
 console.log('Rational boundary fixtures',JSON.stringify({near100,at999999:checkOracle('original-decrease',1,99.9999),atNearest:checkOracle('original-decrease',1,near100)}));
});
test('reverse domain, overflow and explicit output underflow errors',()=>{
 for(const mode of ['original-increase','original-decrease']){
  for(const [a,b] of [[-1,20],[1,-20]])assert.throws(()=>ctx.calculate(mode,a,b),/nonnegative/);
  for(const [a,b] of [[Infinity,20],[1,Infinity],[NaN,1],[1,NaN],['',1],[1,'']])assert.throws(()=>ctx.calculate(mode,a,b),/finite/);
  assert.equal(ctx.calculate(mode,0,25),0);
  assert.equal(ctx.formatResult(-0,mode),'0');
 }
 assert.throws(()=>ctx.calculate('original-decrease',0,100),/unique original/);
 assert.throws(()=>ctx.calculate('original-decrease',1,100),/inconsistent/);
 assert.throws(()=>ctx.calculate('original-decrease',1,100.01),/below 100/);
 assert.throws(()=>ctx.calculate('original-decrease',Number.MAX_VALUE,50),/supported range/);
 assert.throws(()=>ctx.calculate('original-decrease',Number.MAX_VALUE,near100),/supported range/);
 assert.throws(()=>ctx.calculate('original-increase',Number.MIN_VALUE,200),/too small/);
 assert.throws(()=>ctx.calculate('original-increase',1e-300,Number.MAX_VALUE),/too small/);
 // Signed and >100 old-mode behavior is deliberately unchanged.
 assert.equal(ctx.calculate('of',-10,200),-20);
 assert.equal(ctx.calculate('ratio',-20,10),-200);
 assert.equal(ctx.calculate('change',-10,-5),-50);
});
test('new amount formatting, static help and unnamed form controls',()=>{
 for(const mode of ['original-increase','original-decrease']){
  for(const value of [0,120,1e-10,Number.MIN_VALUE,Number.MAX_VALUE]){
   assert.equal(ctx.formatResult(value,mode),ctx.formatResult(value,'of'));
   assert.doesNotMatch(ctx.formatResult(value,mode),/[%$]/);
  }
  assert.equal(ctx.formatResult(1e-10,mode),new Intl.NumberFormat(undefined,{notation:'scientific',maximumSignificantDigits:7}).format(1e-10));
 }
 assert.equal(ctx.formatResult(ctx.calculate('original-decrease',150,10),'original-decrease'),new Intl.NumberFormat(undefined,{maximumFractionDigits:6}).format(166.66666666666666));
 assert.match(home,/Original amount = final amount ÷ \(1 − r ÷ 100\)/);
 assert.match(home,/Original amount = final amount ÷ \(1 \+ r ÷ 100\)/);
 assert.match(home,/without a percent sign/);
 assert.doesNotMatch(home.match(/<form id="calculator">[\s\S]*?<\/form>/)[0],/\bname=/);
});
test('reverse domain distinguishes undefined from inconsistent data',()=>{
 assert.match(html,/100% decrease[\s\S]*undefined/);assert.match(html,/nonzero final amount is inconsistent/);
 assert.match(html,/positive original amount/);assert.match(html,/rounded inputs/);assert.match(html,/Increase rate/);
});
