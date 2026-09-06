const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'C:/Users/vikra/OneDrive/Documents/GitHub/gridatlas-main-202609050200/node_modules/playwright');
const generation=process.argv[2],sub=process.argv.includes('--sub'),mobile=process.argv.includes('--mobile-actions');
if(!/^\d{12}$/.test(generation||''))throw Error('Generation required');
const root=path.resolve('releases',generation+'-pipelinenews');
const output=process.env.EVIDENCE_DIR||`C:/Users/vikra/OneDrive/Desktop/offline-screenshots/recovery-20260906/pipeline${generation.slice(-4)}`;
fs.mkdirSync(output,{recursive:true});
const registry=JSON.parse(fs.readFileSync(path.join(root,'data/202608291447-registry.json')));
const grid=JSON.parse(fs.readFileSync(path.join(root,registry.supplemental_assets.wider_grid_coverage.payload.path))).grid;
const station=sub?JSON.parse(fs.readFileSync(path.join(root,registry.supplemental_assets.wider_sub_coverage.payload.path))).substation:null;
const types={'.html':'text/html','.mjs':'text/javascript','.js':'text/javascript','.json':'application/json','.css':'text/css','.svg':'image/svg+xml'};
const server=http.createServer((req,res)=>{try{const pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname);const file=path.resolve(root,'.'+(pathname==='/'?'/index.html':pathname));if(!file.startsWith(root+path.sep))throw Error('Invalid path');res.setHeader('Content-Type',types[path.extname(file)]||'application/octet-stream');res.end(fs.readFileSync(file));}catch{res.statusCode=404;res.end();}});
(async()=>{
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 const base=process.env.BASE_URL||`http://127.0.0.1:${server.address().port}/`;
 const browser=await chromium.launch({headless:true,...(process.platform==='win32'?{channel:'chrome'}:{})});
 const results=[];
 try {
 for(const profile of [{name:'desktop',width:1440,height:900},{name:'phone',width:393,height:852}]){
  const page=await browser.newPage({viewport:profile,serviceWorkers:'block'}),errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.goto(base,{waitUntil:'networkidle'});
  await page.waitForSelector('#widerTechnology',{timeout:60000});
  const options=await page.locator('#widerTechnology option').evaluateAll(nodes=>nodes.map(n=>n.value).filter(Boolean));
  assert.equal(options.length,20);
  let observations=0,measured=0;
  for(const option of options){
   await page.selectOption('#widerTechnology',option);
   for(let batch=0;batch<100;batch++){
   const chips=await page.locator('[data-repd-metric]').evaluateAll(nodes=>nodes.map(n=>({ref:n.dataset.repdMetric,text:n.textContent,title:n.title})));
   assert.ok(await page.locator('.project-actions .action-metric').count(),'No metric state for '+option+' batch '+batch);
   if(mobile && profile.name==='phone'){
    const outside=await page.locator('.tablewrap tbody .project-actions > *').evaluateAll(nodes=>nodes.filter(node=>{const rect=node.getBoundingClientRect();return rect.left<0||rect.right>innerWidth+1;}).map(node=>node.textContent));
    assert.deepEqual(outside,[],'Phone actions outside viewport');
    const targets=await page.locator('.tablewrap tbody .action-link').evaluateAll(nodes=>nodes.every(node=>node.getBoundingClientRect().height>=44));
    assert.ok(targets,'MAP target too small');
   }
   for(const chip of chips){const index=chip.text.startsWith('SUB')?station:grid;const k=index?.[chip.ref]?.k;
    if(typeof k==='number'){assert.ok(chip.text.includes(k.toFixed(2)),JSON.stringify(chip));measured++;}
    else assert.ok(chip.text.includes('unavailable'));
    assert.ok(chip.title.includes('REPD '+chip.ref));observations++;
   }
   const next=page.locator('[data-window="next"]');
   if(await next.isDisabled())break;
   await next.click();
   if(batch===99)throw Error('Pager did not terminate');
   }
  }
  assert.ok(measured>500);
  await page.selectOption('#widerTechnology',options[0]);
  if(mobile)await page.locator('.tablewrap tbody tr').first().scrollIntoViewIfNeeded();
  await page.screenshot({path:path.join(output,profile.name+'.png'),fullPage:true});
  if(mobile)await page.screenshot({path:path.join(output,profile.name+'-actions.png')});
  assert.deepEqual(errors,[]);
  results.push({profile:profile.name,technologies:options.length,observations,measured,errors});
  await page.close();
 }
 // Deliberate source failure proves the existing table and original measurements remain usable.
 const page=await browser.newPage();
 await page.route('**/*-grid-coverage.json',route=>route.abort());
 if(sub)await page.route('**/*-sub-coverage.json',route=>route.abort());
 await page.goto(base,{waitUntil:'networkidle'});await page.waitForSelector('#widerTechnology',{timeout:60000});
 const first=await page.locator('#widerTechnology option').evaluateAll(nodes=>nodes.map(n=>n.value).find(Boolean));
 await page.selectOption('#widerTechnology',first);
 assert.ok(await page.locator('[data-repd-metric]').count());
 const runtime=await page.evaluate(()=>window.__PIPELINENEWS_FAST__);
 assert.equal(runtime.gridCoverageFallback,true);
 if(sub)assert.equal(runtime.subCoverageFallback,true);
 results.push({faultInjection:'successor request unavailable',baselineFallback:true});
 fs.writeFileSync(path.join(output,'browser.json'),JSON.stringify({generation,sub,results},null,2));
 console.log(JSON.stringify({generation,sub,results}));
 }finally{await browser.close();server.close();}
})().catch(error=>{console.error(error);server.close();process.exitCode=1;});
