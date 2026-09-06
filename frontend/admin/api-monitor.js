(()=>{
'use strict';
const $=s=>document.querySelector(s);
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));
const checks=[
 ['Admin Session','/api/admin/me'],['Supabase Config','/api/config/public'],
 ['Profile API','/api/profile'],['Analytics API','/api/analytics'],['Links API','/api/links'],
 ['Music API','/api/music'],['Profile Card','/api/profile-card'],['Background API','/api/background'],
 ['Appearance API','/api/appearance'],['Visualizer API','/api/visualizer'],['Branding API','/api/branding'],
 ['Settings API','/api/settings'],['GIF Stickers','/api/gif-stickers'],
 ['GIPHY Proxy','/api/giphy/search?q=sparkle&limit=1'],['Support API','/api/support'],['Public Profile','/profile']
];
const LOG_KEY='lb_api_logs',CANDLE_KEY='lb_api_candles',MAX_LOGS=1000;
let logs=[],samples=[],lastResults=[],running=false,round=0,totalRounds=6,timer=null,filter='ALL',query='';
try{logs=JSON.parse(localStorage.getItem(LOG_KEY)||'[]')}catch{}
try{samples=JSON.parse(localStorage.getItem(CANDLE_KEY)||'[]')}catch{}
function saveLogs(){try{localStorage.setItem(LOG_KEY,JSON.stringify(logs.slice(-MAX_LOGS)))}catch{}}
function saveCandles(){try{localStorage.setItem(CANDLE_KEY,JSON.stringify(samples.slice(-30)))}catch{}}
function classify(status,ms,error){
 if(error==='TIMEOUT'||status===0)return 'TIMEOUT';
 if(status===401||status===403)return 'AUTH';
 if(status>=500)return 'FAIL';
 if(status>=400)return 'FAIL';
 return 'PASS';
}
function statusLabel(s){return ({PASS:'PASS',FAIL:'FAIL',AUTH:'AUTH',TIMEOUT:'TIMEOUT',RECOVERED:'RECOVERED'}[s]||s)}
function now(){return new Date().toLocaleString('th-TH',{hour12:false})}
function previous(name){for(let i=logs.length-1;i>=0;i--)if(logs[i].name===name)return logs[i];return null}
function addLog(x){
 const prev=previous(x.name);
 logs.push({...x,time:now(),id:Date.now()+Math.random()});
 if(x.state==='PASS'&&prev&&['FAIL','AUTH','TIMEOUT'].includes(prev.state))logs.push({name:x.name,url:x.url,state:'RECOVERED',status:x.status,ms:x.ms,time:now(),detail:'API กลับมาใช้งานได้แล้ว',id:Date.now()+Math.random()});
 logs=logs.slice(-MAX_LOGS);saveLogs();
}
async function probe(name,url){
 const t=performance.now();let status=0,detail='',state='FAIL';const controller=new AbortController();
 const timeout=setTimeout(()=>controller.abort(),8000);
 try{
  const r=await fetch(url,{credentials:'same-origin',cache:'no-store',signal:controller.signal});
  status=r.status;const ms=Math.round(performance.now()-t);const text=await r.text();
  try{const j=JSON.parse(text);detail=j.message||j.error||j.statusText||text.slice(0,500)}catch{detail=text.slice(0,500)}
  state=classify(status,ms);
  return{name,url,status,ms,state,detail:detail||r.statusText||''};
 }catch(e){const ms=Math.round(performance.now()-t);detail=e.name==='AbortError'?'TIMEOUT':e.message;return{name,url,status:0,ms,state:'TIMEOUT',detail};}
 finally{clearTimeout(timeout)}
}
function chart(){
 const a=samples.slice(-30);if(!a.length)return '<div class="api-empty">เริ่ม Deep Scan เพื่อสร้างแท่งเทียน...</div>';
 const w=1100,h=300,p=24,max=Math.max(100,...a.map(x=>x.high)),span=max,bw=Math.max(6,Math.min(24,(w-p*2)/a.length-5)),y=v=>h-p-(v/span)*(h-p*2);
 return `<svg class="api-candles" viewBox="0 0 ${w} ${h}" preserveAspectRatio="none">${a.map((x,i)=>{const cx=p+(i+.5)*(w-p*2)/a.length,yo=y(x.open),yc=y(x.close),yh=y(x.high),yl=y(x.low),up=x.close<=x.open,top=Math.min(yo,yc),bh=Math.max(3,Math.abs(yc-yo));return `<g class="api-candle ${up?'up':'down'}"><line x1="${cx}" x2="${cx}" y1="${yh}" y2="${yl}"/><rect x="${cx-bw/2}" y="${top}" width="${bw}" height="${bh}" rx="2"><title>O ${x.open}ms H ${x.high}ms L ${x.low}ms C ${x.close}ms</title></rect></g>`}).join('')}</svg><div class="api-axis"><span>0 ms</span><span>${Math.round(max/2)} ms</span><span>${Math.round(max)} ms</span></div>`;
}
function filteredLogs(){
 return logs.slice().reverse().filter(x=>(filter==='ALL'||x.state===filter)&&(!query||`${x.name} ${x.url} ${x.state} ${x.status} ${x.detail}`.toLowerCase().includes(query.toLowerCase())));
}
function summary(){
 const current=lastResults,g=current.filter(x=>x.state==='PASS').length,t=current.length;
 const fails=current.filter(x=>x.state!=='PASS').length;
 const incidents=logs.filter(x=>['FAIL','AUTH','TIMEOUT'].includes(x.state)).length;
 return {g,t,fails,incidents,avg:t?Math.round(current.reduce((s,x)=>s+x.ms,0)/t):0};
}
function logRows(){
 const rows=filteredLogs().slice(0,100);
 if(!rows.length)return '<div class="api-empty api-log-empty">ยังไม่มี Log ตามตัวกรองนี้</div>';
 return rows.map(x=>`<details class="api-log-row ${x.state.toLowerCase()}"><summary><span class="api-log-time">${esc(x.time)}</span><span class="api-log-state">${statusLabel(x.state)}</span><strong>${esc(x.name)}</strong><span>${x.status||'ERR'}</span><span>${x.ms??'-'} ms</span><span>${esc((x.detail||'').slice(0,70))}</span></summary><div class="api-log-detail"><b>Endpoint</b><code>${esc(x.url)}</code><b>HTTP Status</b><span>${x.status||'Network/Timeout'}</span><b>Latency</b><span>${x.ms??'-'} ms</span><b>Result</b><span>${esc(x.detail||'-')}</span></div></details>`).join('');
}
function render(){
 const s=summary(),r=lastResults;
 return `<section class="api-monitor"><div class="api-monitor-head"><div><div class="eyebrow">SYSTEM HEALTH</div><h2>API Monitor</h2><p>Deep Scan 60 วินาที • ${round}/${totalRounds} รอบ • หลังจากนั้นตรวจอัตโนมัติทุก 30 วินาที</p></div><div class="api-monitor-actions"><span class="api-health ${s.g===s.t&&s.t?'good':'bad'}"><i></i>${s.g}/${s.t} API ปกติ</span><button id="apiCheckNow" class="btn btn-primary">⟳ ตรวจสอบใหม่</button></div></div>
 <div class="api-progress"><div style="width:${Math.min(100,round/totalRounds*100)}%"></div></div>
 <div class="api-summary"><div><b>${s.g}/${s.t}</b><span>Healthy</span></div><div><b>${s.avg} ms</b><span>Average latency</span></div><div><b>${logs.length}</b><span>Logs saved</span></div><div class="api-danger"><b>${s.fails}</b><span>Current incidents</span></div></div>
 <div class="api-panel panel"><div class="panel-title"><h3>Latency Candlestick / OHLC</h3><span>เก็บ 30 แท่งล่าสุด</span></div><div class="api-chart-box">${chart()}</div></div>
 <div class="api-panel panel"><div class="panel-title"><h3>Service Status</h3><span>HTTP + latency + error</span></div><div class="api-service-grid">${r.map(x=>`<div class="api-service ${x.state==='PASS'?'ok':'fail'}"><i></i><div><strong>${esc(x.name)}</strong><small>${x.status||'ERR'} • ${x.ms} ms • ${statusLabel(x.state)}${x.detail?' • '+esc(x.detail).slice(0,90):''}</small></div><b>${statusLabel(x.state)}</b></div>`).join('')}</div></div>
 <div class="api-panel panel"><div class="panel-title api-log-toolbar"><div><h3>API Logs / Incident History</h3><span>${filteredLogs().length} รายการที่แสดง • สูงสุด ${MAX_LOGS} รายการ</span></div><div class="api-log-actions"><input id="apiLogSearch" class="api-log-search" placeholder="ค้นหา API / error..." value="${esc(query)}"><select id="apiLogFilter"><option value="ALL" ${filter==='ALL'?'selected':''}>ทั้งหมด</option><option value="FAIL" ${filter==='FAIL'?'selected':''}>🔴 FAIL</option><option value="AUTH" ${filter==='AUTH'?'selected':''}>🟡 AUTH</option><option value="TIMEOUT" ${filter==='TIMEOUT'?'selected':''}>⏱ TIMEOUT</option><option value="RECOVERED" ${filter==='RECOVERED'?'selected':''}>🟢 RECOVERED</option><option value="PASS" ${filter==='PASS'?'selected':''}>🟢 PASS</option></select><button id="apiExportJson" class="btn">Export JSON</button><button id="apiExportCsv" class="btn">Export CSV</button><button id="apiClearLogs" class="btn api-danger-btn">ล้าง Logs</button></div></div><div class="api-log-head"><span>เวลา</span><span>สถานะ</span><span>API</span><span>HTTP</span><span>Latency</span><span>รายละเอียด</span></div><div class="api-log-list">${logRows()}</div></div></section>`;
}
function download(name,text,type){const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([text],{type}));a.download=name;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(a.href),500)}
function csv(){
 const head=['time','api','endpoint','state','http_status','latency_ms','detail'];
 const q=v=>`"${String(v??'').replace(/"/g,'""')}"`;
 return [head.join(','),...logs.map(x=>[x.time,x.name,x.url,x.state,x.status,x.ms,x.detail].map(q).join(','))].join('\n');
}
function bind(){
 $('#apiCheckNow')?.addEventListener('click',()=>{clearInterval(timer);scan()});
 $('#apiLogFilter')?.addEventListener('change',e=>{filter=e.target.value;renderRoot()});
 $('#apiLogSearch')?.addEventListener('input',e=>{query=e.target.value;renderRoot();const el=$('#apiLogSearch');if(el){el.focus();el.setSelectionRange(query.length,query.length)}});
 $('#apiExportJson')?.addEventListener('click',()=>download(`linkbio-api-logs-${Date.now()}.json`,JSON.stringify(logs,null,2),'application/json'));
 $('#apiExportCsv')?.addEventListener('click',()=>download(`linkbio-api-logs-${Date.now()}.csv`,csv(),'text/csv;charset=utf-8'));
 $('#apiClearLogs')?.addEventListener('click',()=>{if(confirm('ล้าง API Logs ทั้งหมด?')){logs=[];saveLogs();renderRoot()}});
}
function renderRoot(){const root=$('#apiMonitorRoot');if(root){root.innerHTML=render();bind()}}
async function scan(){
 if(running)return;running=true;round=0;lastResults=[];renderRoot();
 for(let i=1;i<=totalRounds;i++){
  round=i;const results=await Promise.all(checks.map(x=>probe(x[0],x[1])));lastResults=results;
  results.forEach(addLog);
  const v=results.map(x=>x.ms).filter(Number.isFinite);
  if(v.length){samples.push({open:v[0],high:Math.max(...v),low:Math.min(...v),close:v[v.length-1],at:Date.now()});samples=samples.slice(-30);saveCandles()}
  renderRoot();
  if(i<totalRounds)await new Promise(r=>setTimeout(r,10000));
 }
 running=false;renderRoot();clearInterval(timer);timer=setInterval(scan,30000);
}
window.openApiMonitor=()=>{const app=$('#app');if(!app)return;app.innerHTML='<div id="apiMonitorRoot"></div>';renderRoot();scan()};
})();
