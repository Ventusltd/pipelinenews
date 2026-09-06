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
  if(process.argv.includes('--geojson')){
   await page.waitForFunction(()=>document.body.dataset.fastReady==='true');
   const pending=page.waitForEvent('download');await page.locator('#exportGeoJSON').click();
   const download=await pending,file=path.join(output,profile.name+'-all-projects.geojson');await download.saveAs(file);
   const data=JSON.parse(fs.readFileSync(file)),source=JSON.parse(fs.readFileSync(path.join(root,'data/202608270055-8ab1807551bc-v8-fast-projects.json')));
   const byRef=new Map(source.rows.map(row=>[String(row[0]),row]));
   assert.equal(data.features.length,7680);assert.equal(data.metadata.null_geometry,28);
   for(const feature of data.features){const row=byRef.get(feature.properties.repd_ref);assert.ok(row);assert.equal(feature.id,row[1]);
    if(feature.geometry)assert.deepEqual(feature.geometry.coordinates,[row[12],row[11]]);else assert.notEqual(source.dictionaries.geometry_status[row[10]],'valid');
   }
   const exact=new URL(base);exact.searchParams.set('repd_ref','12588');await page.goto(exact.href,{waitUntil:'networkidle'});
   await page.waitForFunction(()=>document.body.dataset.fastReady==='true');
   const filteredDownload=page.waitForEvent('download');await page.locator('#exportGeoJSON').click();
   const filteredFile=path.join(output,profile.name+'-filtered-project.geojson');await(await filteredDownload).saveAs(filteredFile);
   const one=JSON.parse(fs.readFileSync(filteredFile));assert.equal(one.features.length,1);assert.equal(one.features[0].properties.repd_ref,'12588');
   await page.goto(base,{waitUntil:'networkidle'});await page.waitForSelector('#widerTechnology');
  }
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
  if(process.argv.includes('--order')){
   await page.selectOption('#widerTechnology','Landfill Gas');
   for(const [mode,index] of [['grid_asc',grid],['sub_asc',station]]){
    await page.selectOption('#widerOrder',mode);let last=-Infinity,seen=0;
    for(let batch=0;batch<100;batch++){
     const references=await page.locator('.wider-fleet-row').evaluateAll(rows=>rows.map(row=>[...row.querySelectorAll('[data-repd-metric]')].map(chip=>chip.dataset.repdMetric)));
     for(const refs of references){const values=refs.map(ref=>index[ref]?.k).filter(Number.isFinite),value=values.length?Math.min(...values):Infinity;assert.ok(value>=last,'Distance order regressed across a page');last=value;seen++;}
     if(await page.locator('[data-window="next"]').isDisabled())break;await page.locator('[data-window="next"]').click();
    }
    assert.equal(seen,275);assert.equal(new URL(page.url()).searchParams.get('wider_sort'),mode);
   }
   await page.reload({waitUntil:'networkidle'});await page.waitForSelector('#widerOrder');assert.equal(await page.locator('#widerOrder').inputValue(),'sub_asc');
   await page.selectOption('#widerOrder','capacity_desc');
  }
  if(process.argv.includes('--filter')){
   await page.selectOption('#widerTechnology','Landfill Gas');
   await page.locator('#widerLocalFilter').fill('Calédon');
   assert.equal(await page.locator('.wider-fleet-row').count(),1);
   assert.match(await page.locator('.wider-fleet-row .site').innerText(),/Caledon Green/);
   assert.equal(new URL(page.url()).searchParams.get('wider_q'),'Calédon');
   await page.reload({waitUntil:'networkidle'});await page.waitForSelector('#widerTechnology');
   assert.equal(await page.locator('#widerLocalFilter').inputValue(),'Calédon');assert.equal(await page.locator('.wider-fleet-row').count(),1);
   await page.locator('#widerLocalFilter').fill('no-project-with-this-impossible-name');
   assert.equal(await page.locator('.wider-fleet-row').count(),0);assert.match(await page.locator('[data-window-range]').innerText(),/0 of 0/);
   await page.locator('#widerLocalFilter').fill('');assert.equal(await page.locator('.wider-fleet-row').count(),50);
   await page.selectOption('#widerTechnology','');assert.equal(await page.locator('#widerLocalFilter').isDisabled(),true);
   assert.equal(new URL(page.url()).searchParams.has('wider_q'),false);
   await page.selectOption('#widerTechnology',options[0]);
  }
  if(process.argv.includes('--geojson')){
   let downloads=0;const count=()=>downloads++;page.on('download',count);
   await page.locator('#exportGeoJSON').click();assert.match(await page.locator('#exportMeta').innerText(),/declined.*wider-fleet/);
   assert.equal(downloads,0);page.off('download',count);
  }
  if(process.argv.includes('--details')){
   const trigger=page.locator('button[data-repd-metric]').first(),title=await trigger.getAttribute('title');
   await trigger.focus();await page.keyboard.press('Enter');
   assert.equal(await page.locator('#wider-metric-explanation').innerText(),title);
   assert.ok(await page.locator('#wider-metric-dialog').isVisible());
   const bounds=await page.locator('#wider-metric-dialog').boundingBox();assert.ok(bounds.x>=0&&bounds.x+bounds.width<=profile.width+1);
   await page.screenshot({path:path.join(output,profile.name+'-explanation.png')});
   await page.keyboard.press('Escape');assert.equal(await page.locator('#wider-metric-dialog').isVisible(),false);
   assert.equal(await trigger.evaluate(node=>node===document.activeElement),true);
   await trigger.click();await page.locator('#wider-metric-dialog button').click();
   assert.equal(await page.locator('#wider-metric-dialog').isVisible(),false);
  }
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
