const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.join(__dirname,'..');
const read=f=>fs.readFileSync(path.join(root,f),'utf8');
test('discount guide has unique metadata and accessible static structure',()=>{
 const guide=read('discounts.html'),home=read('index.html');
 assert.match(guide,/<html lang="en">/);assert.match(guide,/<main id="main">/);
 assert.equal((guide.match(/<h1[ >]/g)||[]).length,1);
 for(const re of [/<title>(.*?)<\/title>/,/<meta name="description" content="([^"]+)"/]){
  assert.ok(guide.match(re));assert.notEqual(guide.match(re)[1],home.match(re)[1]);
 }
 assert.match(guide,/<link rel="canonical" href="https:\/\/mypercentagecalc.net\/discounts.html">/);
 assert.doesNotMatch(guide,/<script|<iframe/i);
});
test('guide teaches all three operations, caveats and correct calculator inputs',()=>{
 const g=read('discounts.html');
 for(const text of ['Discount amount vs final price','Recover the original price','Successive discounts','100%','round','tax','What is X% of Y?','X is what percent of Y?','80 and 80','20 and 100','10 and 80','free calculator']) assert.ok(g.includes(text),text);
 for(const id of ['discount','reverse','successive','limits']) assert.ok(g.includes(`id="${id}"`));
});
test('worked example numbers agree with independently evaluated formulas',()=>{
 const g=read('discounts.html');
 const cases=[[120*.25,'$30'],[120*(1-.25),'$90'],[80/(1-.20),'$100'],[100*(1-.20),'$80'],[80*.10,'$8'],[100*.20,'$20'],[80*(1+.20),'$96'],[100-72,'$28'],[100-20,'80%'],[80/100,'0.8'],[20+10,'30%'],[100*(1-.20)*(1-.10),'$72'],[(1-(1-.20)*(1-.10))*100,'28%']];
 for(const [actual,display] of cases){assert.ok(Math.abs(actual-Number(display.replace(/[$%]/g,'')))<1e-10);assert.ok(g.includes(display),display);}
});
test('homepage discovers guide while preserving original anchor navigation',()=>{
 const h=read('index.html');assert.match(h,/<nav[\s\S]*href="discounts.html"[\s\S]*<\/nav>/);
 for(const id of ['calculator-section','how-it-works','examples','faq'])assert.ok(h.includes(`href="#${id}"`));
});
test('all local HTML links and anchors resolve and sitemap covers both pages',()=>{
 const files=fs.readdirSync(root).filter(f=>f.endsWith('.html'));
 for(const file of files){
  const html=read(file);const ids=[...html.matchAll(/\bid="([^"]+)"/g)].map(m=>m[1]);assert.equal(new Set(ids).size,ids.length,file);
  for(const [,href] of html.matchAll(/href="([^"]+)"/g)){
   if(/^[a-z]+:/i.test(href)||href.startsWith('//'))continue;
   const [p,anchor]=href.split('#');const target=p||file;assert.ok(files.includes(target),`${file}: ${href}`);
   if(anchor)assert.ok(read(target).includes(`id="${anchor}"`),href);
  }
 }
 const locations=[...read('sitemap.xml').matchAll(/<loc>(.*?)<\/loc>/g)].map(m=>m[1]);
 assert.deepEqual(locations.sort(),['https://mypercentagecalc.net/','https://mypercentagecalc.net/discounts.html']);
 for(const loc of locations){const u=new URL(loc);assert.ok(fs.existsSync(path.join(root,u.pathname==='/'?'index.html':u.pathname.slice(1))));}
});
