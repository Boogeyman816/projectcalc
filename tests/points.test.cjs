const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const html=fs.readFileSync(path.join(__dirname,'../index.html'),'utf8');
const section=()=>{const match=html.match(/<section id="percentage-points"[\s\S]*?<\/section>/);assert.ok(match,'dedicated percentage-points section');return match[0];};
const ctx={};vm.runInNewContext(html.match(/<script id="math">([\s\S]*?)<\/script>/)[1],ctx);
test('points explanation is discoverable with accessible heading and calculator link',()=>{
 const s=section();assert.match(s,/<h2>Percentage change vs percentage points<\/h2>/);
 assert.match(html,/<nav[\s\S]*href="#percentage-points"[\s\S]*<\/nav>/);
 assert.match(s,/href="#calculator-section"/);
});
test('positive and negative examples match current signed-base calculation',()=>{
 const s=section();
 for(const [id,old,newValue,points,change] of [['points-rise',10,15,5,50],['points-fall',20,15,-5,-25],['points-negative',-10,-5,5,-50]]){
  const p=s.match(new RegExp('<p id="'+id+'">([\\s\\S]*?)<\\/p>'));assert.ok(p,id);
  assert.equal(newValue-old,points);assert.equal(ctx.calculate('change',old,newValue),change);
  assert.ok(p[1].includes(`${points} percentage points`));assert.ok(p[1].includes(`${change}%`));
 }
});
test('zero baseline is undefined in relative terms but has a points difference',()=>{
 const s=section();assert.match(s,/0% to 5%/);assert.match(s,/5 percentage points/);assert.equal(5-0,5);
 assert.throws(()=>ctx.calculate('change',0,5),/Cannot divide by zero/);
 assert.match(s,/undefined, not 0% or infinity/);
});
test('instructions distinguish mode output from points and retain interpretation caveats',()=>{
 const s=section();
 for(const text of ['Percentage change from X to Y','Original value','New value','10 and 15','20 and 15','-10 and -5','0 and 5','does not calculate percentage points','same measure','rounded','negative starting value','causation'])assert.ok(s.includes(text),text);
});
