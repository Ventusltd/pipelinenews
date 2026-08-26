import assert from "node:assert/strict";
import { readFile, writeFile } from "node:fs/promises";
const stamp=process.env.BUILD_STAMP, base="202608261927", size=50;
assert.match(stamp,/^[0-9]{12}$/);
const js="releases/javascript/", styles="releases/styles/";
let projects=await readFile(js+base+"-projects-v9-5-1.js","utf8");
projects=projects.replace("let controlsBound = false;","let controlsBound = false;\nconst WINDOW_SIZE="+size+";\nlet windowStart=0;");
projects=projects.replace('function renderTable() {\n  const body = document.getElementById("tbody");\n  body.innerHTML = filtered.map((project) => {','function renderTable() {\n  const body = document.getElementById("tbody");\n  const windowRows=filtered.slice(windowStart,windowStart+WINDOW_SIZE);\n  body.innerHTML = windowRows.map((project) => {');
const boundary='  }).join("");\n}\n\nfunction updateResultSummary()';
const controls=`  }).join("");
  updateWindowControls();
}

function updateWindowControls(){
  let panel=document.getElementById("projectWindowControls");
  if(!panel){
    panel=document.createElement("div");
    panel.id="projectWindowControls";
    panel.className="project-window-controls";
    panel.innerHTML='<button type="button" data-window="previous">PREVIOUS 50</button><span data-window-range></span><button type="button" data-window="next">NEXT 50</button>';
    document.querySelector(".tablewrap").after(panel);
    panel.addEventListener("click",(event)=>{
      const action=event.target.closest("[data-window]")?.dataset.window;
      if(action==="previous")windowStart=Math.max(0,windowStart-WINDOW_SIZE);
      if(action==="next")windowStart=Math.min(Math.floor(Math.max(0,filtered.length-1)/WINDOW_SIZE)*WINDOW_SIZE,windowStart+WINDOW_SIZE);
      if(action)renderTable();
    });
  }
  const end=Math.min(filtered.length,windowStart+WINDOW_SIZE);
  panel.querySelector("[data-window-range]").textContent=filtered.length?String(windowStart+1)+"–"+String(end)+" of "+filtered.length.toLocaleString("en-GB"):"0 records";
  panel.querySelector('[data-window="previous"]').disabled=windowStart===0;
  panel.querySelector('[data-window="next"]').disabled=end>=filtered.length;
}

function updateResultSummary()`;
assert.ok(projects.includes(boundary),"renderer boundary changed");
projects=projects.replace(boundary,controls);
projects=projects.replace("  state.filtered = filtered;\n  updateGaugesV9_2(filtered);","  state.filtered = filtered;\n  windowStart=0;\n  updateGaugesV9_2(filtered);");
assert.ok(!projects.includes("body.innerHTML = filtered.map"));
assert.ok(projects.includes("filtered.slice(windowStart,windowStart+WINDOW_SIZE)"));
const projectName=stamp+"-projects-v8-foundation.js";
await writeFile(js+projectName,projects);
let app=await readFile(js+base+"-app-v9-6-2.js","utf8");
app=app.replace("./"+base+"-projects-v9-5-1.js","./"+projectName);
await writeFile(js+stamp+"-app-v8-foundation.js",app);
const css=".project-window-controls{display:flex;align-items:center;justify-content:center;gap:14px;padding:16px;background:#111;border:1px solid #333;position:sticky;bottom:0;z-index:5}.project-window-controls button{background:#191919;color:#fff;border:1px solid #666;padding:10px 14px;font-weight:700}.project-window-controls button:disabled{opacity:.35}.project-window-controls span{min-width:170px;text-align:center;font-variant-numeric:tabular-nums}@media(max-width:700px){.project-window-controls{gap:6px}.project-window-controls button{padding:9px 6px;font-size:11px}.project-window-controls span{min-width:112px;font-size:11px}}\n";
await writeFile(styles+stamp+"-v8-foundation.css",css);
let html=await readFile("releases/"+base+"-index.html","utf8");
html=html.replaceAll("V9.6.2","V8 FOUNDATION CANDIDATE");
html=html.replace("javascript/"+base+"-app-v9-6-2.js","javascript/"+stamp+"-app-v8-foundation.js");
html=html.replace('<link rel="stylesheet" href="styles/'+base+'-v9-6-1.css">','<link rel="stylesheet" href="styles/'+base+'-v9-6-1.css">\n  <link rel="stylesheet" href="styles/'+stamp+'-v8-foundation.css">');
await writeFile("releases/"+stamp+"-v8-candidate.html",html);
await writeFile("build/"+stamp+"-v8-foundation-manifest.json",JSON.stringify({schema:"pipelinenews-v8-foundation-v1",stamp,canonical_records:7680,physical_rows:50,all_records_reachable_required:true,deployment:"not-authorised"},null,2)+"\n");

