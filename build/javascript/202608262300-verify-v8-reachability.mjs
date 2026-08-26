import assert from "node:assert/strict";
import { chromium } from "playwright";
const stamp=process.env.BUILD_STAMP;
const browser=await chromium.launch({headless:true});
const page=await browser.newPage({viewport:{width:390,height:844}});
await page.goto("http://127.0.0.1:4173/releases/"+stamp+"-v8-candidate.html",{waitUntil:"networkidle"});
await page.waitForFunction(()=>document.querySelector("#resultsMeta")?.dataset.totalCount==="7680",null,{timeout:30000});
const ids=new Set(), nodes=[];
for(let step=0;step<200;step+=1){
  const rows=page.locator("#tbody > tr");
  const count=await rows.count(); assert.ok(count>0&&count<=60);
  for(const id of await rows.evaluateAll(items=>items.map(item=>item.id))) ids.add(id);
  nodes.push(await page.locator("*").count());
  const next=page.locator('[data-window="next"]');
  if(!await next.count()) throw new Error("Candidate truncates records: NEXT control absent");
  if(await next.isDisabled()) break;
  await next.click();
}
assert.equal(ids.size,7680,"every canonical project must be reachable");
const baseline=Math.max(...nodes);
for(let i=0;i<20;i+=1){await page.selectOption("#sortProjects",i%2?"updated_desc":"updated_asc");await page.waitForTimeout(50);}
const after=await page.locator("*").count();
assert.ok(after<15000&&after<=baseline+1000);
console.log(JSON.stringify({reachable:ids.size,max_dom_elements:baseline,after_sort_dom_elements:after}));
await browser.close();

