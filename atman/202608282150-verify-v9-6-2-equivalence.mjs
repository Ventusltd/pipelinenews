#!/usr/bin/env node
import { chromium } from "playwright";
import { writeFile } from "node:fs/promises";

const args=Object.fromEntries(process.argv.slice(2).reduce((a,v,i,x)=>v.startsWith("--")?[...a,[v.slice(2),x[i+1]]]:a,[]));
const candidate=args.candidate, baseline=args.baseline, report=args.report;
if(!candidate||!baseline||!report) throw new Error("--candidate, --baseline and --report are required");
const checks=[]; const sessions=[];
const gate=(id,pass,evidence)=>checks.push({id,pass:Boolean(pass),evidence});

async function observe(label,url,viewport){
  const page=await browser.newPage({viewport,deviceScaleFactor:viewport.width===390?3:1,isMobile:viewport.width===390,hasTouch:viewport.width===390});
  const started=Date.now(), requests=[],consoleErrors=[],pageErrors=[],failed=[];
  page.on("request",r=>requests.push(new URL(r.url()).pathname));
  page.on("console",m=>{if(m.type()==="error")consoleErrors.push(m.text())});
  page.on("pageerror",e=>pageErrors.push(e.message));
  page.on("requestfailed",r=>failed.push(`${r.url()} :: ${r.failure()?.errorText}`));
  await page.goto(url,{waitUntil:"domcontentloaded",timeout:120000});
  if(label==="candidate") await page.waitForFunction(()=>document.body.dataset.fastReady==="true",null,{timeout:120000});
  else await page.waitForFunction(()=>document.querySelector("#resultsMeta")?.dataset.totalCount==="7680",null,{timeout:120000});
  const readyMs=Date.now()-started;
  const expectedNews=label==="candidate"?"136":"133";
  await page.waitForFunction(value=>document.querySelector("#newsMeta")?.textContent.includes(value),expectedNews,{timeout:120000});
  const core=await page.evaluate(()=>({
    total:Number(document.querySelector("#resultsMeta")?.dataset.totalCount),
    filtered:Number(document.querySelector("#resultsMeta")?.dataset.filteredCount),
    capacity:document.querySelector("#v1")?.textContent.trim(),
    largest:document.querySelector("#v3")?.textContent.trim(),
    columns:document.querySelectorAll(".tablewrap thead th").length,
    rows:document.querySelectorAll("#tbody>tr").length,
    rootOverflow:document.scrollingElement.scrollWidth-document.documentElement.clientWidth,
    tableClient:document.querySelector(".tablewrap")?.clientWidth,
    tableScroll:document.querySelector(".tablewrap")?.scrollWidth,
    tableOverflow:getComputedStyle(document.querySelector(".tablewrap")).overflowX,
    news:document.querySelector("#newsMeta")?.textContent.trim(),
    dom:document.querySelectorAll("*").length,
  }));
  gate(`${label}-${viewport.width}-canonical`,core.total===7680&&core.filtered===7680&&core.capacity.includes("356,474.09")&&core.largest.includes("4,100"),core);
  gate(`${label}-${viewport.width}-columns`,core.columns===11,core.columns);
  gate(`${label}-${viewport.width}-news`,core.news.includes(expectedNews),core.news);
  if(label==="candidate") gate(`${label}-${viewport.width}-100-rows-per-page`,core.rows===100,{observed:core.rows,required:100});
  if(viewport.width===390){
    gate(`${label}-390-contained-root`,core.rootOverflow<=1,core.rootOverflow);
    gate(`${label}-390-table-horizontal-scroll`,core.tableScroll>core.tableClient&&["auto","scroll"].includes(core.tableOverflow),core);
  }
  if(label==="candidate"){
    gate(`${label}-${viewport.width}-relationship-zero-startup`,!requests.some(x=>x.includes("202608282044-federated-relationships")||x.includes("202608282044-relationship-governance-status")),requests.filter(x=>x.includes("202608282044")));
    gate(`${label}-${viewport.width}-first-paint`,readyMs<=5000,{ready_ms:readyMs,maximum_ms:5000});
  }
  await page.locator("#search").fill("East Pye");
  await page.waitForFunction(()=>document.querySelector("#resultsMeta")?.dataset.filteredCount==="1");
  gate(`${label}-${viewport.width}-search-east-pye`,await page.locator("#repd-17494").count()===1,await page.locator("#resultsMeta").textContent());
  await page.locator("#clearFilters").click(); await page.waitForFunction(()=>document.querySelector("#resultsMeta")?.dataset.filteredCount==="7680");
  await page.locator('#tech [data-technology="solar"]').click(); await page.waitForFunction(()=>document.querySelector("#resultsMeta")?.dataset.filteredCount==="3563");
  gate(`${label}-${viewport.width}-solar-filter`,true,3563);
  await page.locator("#clearFilters").click(); await page.locator("#sortProjects").selectOption("updated_desc");
  gate(`${label}-${viewport.width}-sort-desc`,await page.locator("#repdUpdatedHeader").getAttribute("aria-sort")==="descending","descending");
  await page.locator("#sortProjects").selectOption("updated_asc");
  gate(`${label}-${viewport.width}-sort-asc`,await page.locator("#repdUpdatedHeader").getAttribute("aria-sort")==="ascending","ascending");
  await page.locator("#clearFilters").click();
  const downloadPromise=page.waitForEvent("download"); await page.locator("#exportInline").click(); const download=await downloadPromise;
  gate(`${label}-${viewport.width}-csv-export`,download.suggestedFilename().endsWith(".csv"),download.suggestedFilename());
  gate(`${label}-${viewport.width}-atlas-links`,await page.locator("a.atlaslink").count()>0,await page.locator("a.atlaslink").count());
  if(label==="candidate"){
    await page.locator("#federatedRelationshipOpen").click();
    await page.waitForFunction(()=>document.querySelector("#federatedRelationshipHost")?.dataset.federatedRelationshipState==="ready",null,{timeout:30000});
    const lazy={module:requests.filter(x=>x.endsWith("/202608282044-federated-relationships.js")).length,payload:requests.filter(x=>x.endsWith("/202608282044-relationship-governance-status.json")).length,rows:await page.locator("#federatedRelationshipHost tbody tr").count(),abstain:await page.locator("#federatedRelationshipHost td",{hasText:"ABSTAIN"}).count()};
    gate(`${label}-${viewport.width}-relationship-lazy-once`,lazy.module===1&&lazy.payload===1,lazy);
    gate(`${label}-${viewport.width}-relationship-abstention`,lazy.rows===3&&lazy.abstain===3,lazy);
  }
  gate(`${label}-${viewport.width}-console-cors`,consoleErrors.length===0&&pageErrors.length===0&&failed.length===0,{consoleErrors,pageErrors,failed});
  sessions.push({label,viewport,ready_ms:readyMs,core,requests:requests.length,console_errors:consoleErrors.length,page_errors:pageErrors.length,failed_requests:failed.length});
  await page.close();
}

const browser=await chromium.launch({headless:true});
try{
  for(const viewport of [{width:1440,height:1000},{width:390,height:844}]){
    await observe("baseline",baseline,viewport);
    await observe("candidate",candidate,viewport);
  }
}catch(error){gate("browser-completion",false,error.stack||error.message)}finally{await browser.close()}
const failures=checks.filter(x=>!x.pass);
const result={schema:"pipelinenews.v9-6-2-equivalence-report.v1",generation:"202608282150",candidate_generation:"202608282044",source_commit:process.env.GITHUB_SHA,workflow_run_id:process.env.GITHUB_RUN_ID,playwright_version:"1.55.0",sessions,checks,summary:{checks:checks.length,passed:checks.length-failures.length,failed:failures.length},promotion_eligible:failures.length===0,state:{candidate:"ARTIFACT_ONLY",current_pointer_changed:false,pages_changed:false,catalogue_changed:false}};
await writeFile(report,JSON.stringify(result,null,2)+"\n");
process.stdout.write(JSON.stringify(result.summary)+"\n");
if(failures.length) process.exitCode=1;
