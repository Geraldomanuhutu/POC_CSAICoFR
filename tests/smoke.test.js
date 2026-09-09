const fs=require('fs');
const {JSDOM}=require('jsdom');
const path=require('path');
const html=fs.readFileSync(path.join(__dirname,'..','index.html'),'utf8');
const errors=[];
const dom=new JSDOM(html,{runScripts:"dangerously",url:"https://example.com/",pretendToBeVisual:true});
dom.virtualConsole.on("jsdomError",e=>errors.push("JSDOM:"+e.message));
dom.window.addEventListener("error",e=>errors.push("ERR:"+e.message));
dom.window.scrollTo=()=>{};
const d=dom.window.document;
const sleep=ms=>new Promise(r=>setTimeout(r,ms));

function click(sel,label){
  const el=d.querySelector(sel);
  if(!el){ errors.push("MISSING ELEMENT: "+sel+" ("+(label||"")+")"); return false; }
  if(el.disabled){ errors.push("DISABLED: "+sel+" ("+(label||"")+")"); return false; }
  el.dispatchEvent(new dom.window.MouseEvent("click",{bubbles:true}));
  return true;
}
function txt(){ return ["app","modal","toast"].map(i=>d.getElementById(i)?d.getElementById(i).textContent:"").join(" ").replace(/\s+/g," "); }
function expect(cond,msg){ if(!cond) errors.push("FAIL: "+msg); else console.log("  ok - "+msg); }

(async ()=>{
await sleep(60);
console.log("\n[1] Login page");
expect(/Pilih peran/.test(txt()),"login rendered");
expect(d.querySelectorAll("[data-login]").length===3,"3 roles");

console.log("\n[2] Orchestrator");
click('[data-login="admin"]','login admin');
expect(/Assessments/.test(txt()),"admin list");
click('[data-go="admin-create"]','new assessment');
expect(/Create New Assessment/.test(txt()),"create page");
expect(d.querySelectorAll('[data-prompt]').length===3,"3 configure buttons");
// dispatch should be disabled with no scope
expect(d.querySelector('[data-act="dispatch"]').disabled===true,"dispatch disabled w/o scope");

console.log("\n[2a] Configure prompt modal");
click('[data-prompt="1"]','configure doc1');
expect(!!d.querySelector('#promptbox'),"prompt modal open");
click('[data-act="genprompt"]','generate with AI');
expect(d.querySelector('#promptbox').value.length>30,"AI generated prompt filled");
click('[data-act="saveprompt"]','save prompt');
expect(!d.querySelector('#promptbox'),"modal closed");
expect(/Pastikan nama pemohon/.test(txt()),"prompt persisted to table");

console.log("\n[2b] Scope modal");
click('[data-act="mapscope"]','map scope');
expect(d.querySelectorAll('[data-pick]').length===12,"12 working units listed");
// switch mapping level then back (regression: selections lost)
d.querySelector('[data-pick="JKT-001-01"]').checked=true;
click('[data-level="Organizational Unit"]','switch level');
click('[data-level="Working Unit"]','switch back');
const stillChecked=d.querySelector('[data-pick="JKT-001-01"]')?.checked;
expect(stillChecked===true,"selection survives mapping-level switch");
if(d.querySelector('[data-pick="JKT-001-01"]')) d.querySelector('[data-pick="JKT-001-01"]').checked=true;
d.querySelector('[data-pick="BDG-001-02"]').checked=true;
click('[data-act="addscope"]','add to scope');
expect(/JKT-001-01/.test(txt()),"scope row shown");
// search filter
click('[data-act="mapscope"]');
const s=d.querySelector('#scopesearch'); s.value="denpasar"; s.dispatchEvent(new dom.window.Event("input",{bubbles:true}));
const visible=[...d.querySelectorAll('[data-pick]')].filter(c=>c.closest('tr').style.display!=="none").length;
expect(visible===2,"search filters to Denpasar units (got "+visible+")");
const heads=[...d.querySelectorAll(".grouphead")].filter(h=>h.style.display!=="none").length;
expect(heads===1,"only Denpasar group header visible (got "+heads+")");
click('[data-act="closemodal"]');
expect(/JKT-001-01/.test(txt()),"scope preserved after cancel");
console.log("\n[2b2] Cascade from Organizational Unit level");
click('[data-act="mapscope"]');
click('[data-level="Organizational Unit"]');
expect(d.querySelectorAll('[data-pick]').length===6,"6 cabang at org-unit level");
d.querySelector('[data-pick="ORG::DPS-001"]').checked=true;
click('[data-act="addscope"]');
expect(/DPS-001-01/.test(txt())&&/DPS-001-02/.test(txt()),"cabang expands to 2 working units");
expect(/Organizational Unit/.test(txt()),"mapping level recorded");
console.log("\n[2b3] Area level");
click('[data-act="mapscope"]');
click('[data-level="Organizational Area"]');
expect(d.querySelectorAll('[data-pick]').length===6,"6 areas");
d.querySelector('[data-pick="AREA::Jakarta"]').checked=true;
click('[data-act="addscope"]');
expect(/JKT-001-02/.test(txt()),"area expands to all working units");
// reset scope back to a single working unit for the rest of the flow
click('[data-act="mapscope"]');
d.querySelector('[data-pick="JKT-001-01"]').checked=true;
click('[data-act="addscope"]');

console.log("\n[2c] Dispatch");
expect(d.querySelector('[data-act="dispatch"]').disabled===false,"dispatch enabled");
click('[data-act="dispatch"]');
expect(/ASSIGNED/.test(txt()),"status ASSIGNED");

console.log("\n[3] Preparer");
click('[data-act="signout"]'); click('[data-login="preparer"]');
expect(/Active assignments|ACTIVE ASSIGNMENTS/i.test(txt()),"preparer dash");
click('[data-go="prep-detail"]','see details');
expect(d.querySelector('[data-act="next"]').disabled===true,"Next disabled before sample");
click('[data-act="uploadsample"]');
expect(/Sample.xlsx/.test(txt()),"sample uploaded");
expect(/GUOHUI CHEN/.test(txt()),"parsed row shown");
click('[data-act="next"]');
expect(/Supporting documents by sample/i.test(txt()),"step 2");
expect(d.querySelector('[data-act="analyze"]').disabled===true,"analyse disabled w/ 0 docs");
click('[data-updoc="1"]'); click('[data-updoc="2"]'); click('[data-updoc="3"]');
expect(/KTP.pdf/.test(txt()),"docs uploaded");
expect(d.querySelector('[data-act="analyze"]').disabled===false,"analyse enabled");
expect(d.querySelector('[data-act="submit"]').disabled===true,"submit disabled before analysis");
click('[data-act="analyze"]');
await sleep(1900);
expect(/Analisis selesai/.test(txt()),"analysis finished");
expect(d.querySelector('[data-act="submit"]').disabled===false,"submit enabled");
// regression: deleting a doc after analysis must reset results
click('[data-deldoc="2"]');
expect(!/Analisis selesai/.test(txt()),"analysis reset after doc removal");
click('[data-updoc="2"]'); click('[data-act="analyze"]'); await sleep(1900);
click('[data-act="submit"]');
expect(/UNDER REVIEW/.test(txt()),"submitted to reviewer");

console.log("\n[4] Reviewer");
click('[data-act="signout"]'); click('[data-login="reviewer"]');
click('[data-go="rev-detail"]','review');
expect(/Insight summary analysis/i.test(txt()),"insight summary");
const fails=(txt().match(/FAIL/g)||[]).length;
expect(fails>=5,"fail badges present ("+fails+")");
console.log("\n[4a] Evidence modal");
click('[data-evidence="6"]');
expect(/AI insight evidence/i.test(txt()),"evidence modal");
expect(/24 bulan/.test(txt()) && /2 tahun/.test(txt()),"sample vs evidence values");
expect(/FORM REKOMENDASI PINJAMAN/.test(txt()),"document preview");
click('[data-act="closemodal"]');
console.log("\n[4b] Override");
click('[data-override="6"]');
expect(!!d.querySelector('#ovText'),"override modal");
click('[data-act="saveoverride"]');
expect(!!d.querySelector('#ovText'),"blocked empty justification");
d.querySelector('#ovText').value="secara nilai setara";
d.querySelector('#ovHallu').checked=true;
click('[data-act="saveoverride"]');
expect(!d.querySelector('#ovText'),"override saved, modal closed");
expect(/Overridden/.test(txt()),"overridden badge");
expect(/AI HALLUCINATES/.test(txt()),"hallucination flag shown");
console.log("\n[4c] Tabs");
click('[data-tab="control"]'); expect(/CONTROL ATTRIBUTES/.test(txt()),"control detail tab");
click('[data-tab="trail"]'); expect(/Override step 6/.test(txt()),"audit trail logged override");
expect(/Analisis selesai/.test(txt()),"audit trail logged AI run");
click('[data-tab="analysis"]');

console.log("\n[5] Reject round-trip");
click('[data-act="reject"]');
expect(!d.querySelector('[data-go="rev-detail"]'),"returned item not re-openable by reviewer");
expect(/RETURNED TO PREPARER/.test(txt()),"reject shows as returned on reviewer dash");
click('[data-go="rev-dash"]');
click('[data-act="signout"]'); click('[data-login="preparer"]');
click('[data-go="prep-detail"]'); click('[data-act="submit"]');
click('[data-act="signout"]'); click('[data-login="reviewer"]'); click('[data-go="rev-detail"]');
expect(/Overridden/.test(txt()),"override survived reject round-trip");

console.log("\n[6] Complete + report");
click('[data-act="complete"]');
expect(/Generate CSA Report/.test(txt()),"report page");
const ndno=d.querySelector('[data-nd="no"]'); ndno.value="ND-045/ICM/2026"; ndno.dispatchEvent(new dom.window.Event("input",{bubbles:true}));
const cause=d.querySelector('[data-nd="cause"]'); cause.value="Dokumen tidak diverifikasi ulang oleh AO."; cause.dispatchEvent(new dom.window.Event("input",{bubbles:true}));
click('[data-act="prev-word"]');
expect(/NOTA DINAS/.test(txt()),"word preview");
expect(/ND-045\/ICM\/2026/.test(txt()),"nota dinas number bound");
expect(/Dokumen tidak diverifikasi ulang/.test(txt()),"cause bound");
click('[data-act="closemodal"]');
click('[data-act="prev-excel"]');
expect(/Hallucination flag/i.test(txt()),"working paper preview");
expect(/YES/.test(txt()),"hallucination flag in working paper");
click('[data-act="closemodal"]');

console.log("\n[7] Persistence + reset");
expect(!!dom.window.localStorage.getItem('icofr_poc_v1'),"state persisted to localStorage");
click('[data-act="signout"]'); click('[data-act="reset"]');
expect(/Pilih peran/.test(txt()),"reset returns to login");

console.log("\n================ RESULT ================");
if(errors.length){ console.log("ERRORS ("+errors.length+"):"); errors.forEach(e=>console.log(" - "+e)); process.exit(1); }
console.log("ALL GREEN");
})();
