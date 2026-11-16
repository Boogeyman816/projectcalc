const test=require('node:test');const assert=require('node:assert/strict');const fs=require('node:fs');const path=require('node:path');
const html=fs.readFileSync(path.join(__dirname,'../discounts.html'),'utf8');
test('reverse increase complements existing discount explanation',()=>{
 const s=html.match(/<section[^>]*id="reverse"[\s\S]*?<\/section>/)[0];
 assert.match(s,/Original amount = final amount ÷ \(1 \+ r ÷ 100\)/);
 assert.match(s,/id="reverse-increase"/);assert.match(s,/150 ÷ 1\.25 = <strong>120<\/strong>/);
 assert.match(s,/150 × 0\.75 = 112\.5/);assert.equal(150/(1+25/100),120);assert.equal(120*(1+25/100),150);assert.equal(150*.75,112.5);
 assert.match(s,/150 and 125/);assert.match(s,/120%/);assert.match(s,/not a percentage of growth/);
});
test('reverse domain distinguishes undefined from inconsistent data',()=>{
 assert.match(html,/100% decrease[\s\S]*undefined/);assert.match(html,/nonzero final amount is inconsistent/);
 assert.match(html,/positive original amount/);assert.match(html,/rounded inputs/);assert.match(html,/100 plus the increase rate/);
});
