const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');const path=require('node:path');const vm=require('node:vm');
const html=fs.readFileSync(path.join(__dirname,'../index.html'),'utf8');
const section=()=>{const m=html.match(/<section id="combined-rates"[\s\S]*?<\/section>/);assert.ok(m,'combined rates section');return m[0];};
const ctx={};vm.runInNewContext(html.match(/<script id="math">([\s\S]*?)<\/script>/)[1],ctx);
test('combined rate guide is discoverable and linked to calculator',()=>{const s=section();assert.match(s,/<h2>Combine percentages from unequal groups<\/h2>/);assert.match(html,/<nav[\s\S]*href="#combined-rates"[\s\S]*<\/nav>/);assert.match(s,/href="#calculator-section"/);});
test('group and combined arithmetic is correct within its example',()=>{
 const s=section();const p=s.match(/<p id="combined-example">([\s\S]*?)<\/p>/);assert.ok(p);
 for(const [a,b,want,text] of [[18,20,90,'18 of 20'],[40,80,50,'40 of 80'],[18+40,20+80,58,'58%']]){assert.ok(Math.abs(ctx.calculate('ratio',a,b)-want)<1e-10);assert.equal(ctx.formatResult(ctx.calculate('ratio',a,b),'ratio'),want+'%');assert.ok(p[1].includes(text));assert.ok(p[1].includes(want+'%'));}
 assert.equal((90+50)/2,70);assert.ok(p[1].includes('70%'));assert.equal(90*(20/100)+50*(80/100),58);
});
test('equal-size contrast and zero denominator are explained accurately',()=>{
 const s=section();assert.equal(ctx.calculate('ratio',18+10,20+20),70);assert.match(s,/18 of 20 and 10 of 20/);assert.match(s,/28 of 40/);
 assert.throws(()=>ctx.calculate('ratio',0,0),/Cannot divide by zero/);assert.match(s,/zero, the combined percentage is undefined/);
 assert.equal(ctx.calculate('ratio',0,20),0);assert.match(s,/0 of 20 is 0%/);
});
test('instructions and weighting caveats prevent unsupported interpretations',()=>{
 const s=section();for(const text of ['X is what percent of Y?','Part','Total','58 and 100','same outcome','non-overlapping','rounded','sample sizes','survey weights','not percentage change'])assert.ok(s.includes(text),text);
});
