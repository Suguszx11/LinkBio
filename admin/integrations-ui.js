const LINKBIO_API_BASE=location.hostname.endsWith('netlify.app')?'/.netlify/functions/api':'';
(()=>{
'use strict';
const $=s=>document.querySelector(s);
async function api(url,opt={}){const r=await fetch((url.startsWith('/api/')?LINKBIO_API_BASE+url:url),{credentials:'same-origin',cache:'no-store',...opt,headers:{'Content-Type':'application/json',...(opt.headers||{})}});const d=await r.json().catch(()=>({}));if(!r.ok)throw Error(d.message||`HTTP ${r.status}`);return d}
async function mount(){
 if(!location.pathname.startsWith('/admin'))return;
 const app=$('#app');if(!app||!app.textContent.includes('Settings'))return;
 if($('#apiIntegrationManager'))return;
 const box=document.createElement('section');box.id='apiIntegrationManager';box.className='panel section-panel';
 box.innerHTML=`<div class="panel-title"><div><h3>API Integrations</h3><span>เปลี่ยนคีย์ได้ทุกเมื่อ • คีย์ลับจะไม่ถูกส่งกลับจากเซิร์ฟเวอร์</span></div></div><div class="grid grid-2">${['giphy','openai','firebase','youtube'].map(k=>`<label class="field"><span>${k.toUpperCase()} API Key</span><input id="int_${k}" type="password" autocomplete="new-password" placeholder="กำลังตรวจสอบ…"></label>`).join('')}</div><div id="apiIntegrationStatus" class="notice">กำลังตรวจสอบการตั้งค่า…</div><div class="actions"><button type="button" class="btn btn-primary" id="saveApiIntegrations">บันทึก API Keys</button></div>`;
 app.appendChild(box);
 try{const d=await api('/api/integrations');const x=d.integrations||{};for(const k of Object.keys(x)){const el=$('#int_'+k);if(el)el.placeholder=x[k].configured?`ตั้งค่าแล้ว (${x[k].source}) • ใส่ใหม่เพื่อเปลี่ยน`:'ยังไม่ได้ตั้งค่า'}$('#apiIntegrationStatus').textContent='ตรวจสอบแล้ว — Environment มีลำดับความสำคัญก่อนค่าที่บันทึกใน Supabase';}catch{$('#apiIntegrationStatus').textContent='ตรวจสอบสถานะ API ไม่สำเร็จ'}
 $('#saveApiIntegrations').onclick=async()=>{const payload={};for(const k of ['giphy','openai','firebase','youtube']){const v=$('#int_'+k)?.value.trim();if(v)payload[k]={key:v}}if(!Object.keys(payload).length){$('#apiIntegrationStatus').textContent='กรุณาใส่คีย์ที่ต้องการเปลี่ยนอย่างน้อย 1 ตัว';return}try{await api('/api/integrations',{method:'PUT',body:JSON.stringify(payload)});for(const k of Object.keys(payload)){const el=$('#int_'+k);if(el){el.value='';el.placeholder='บันทึกแล้ว • ใส่ใหม่เพื่อเปลี่ยน'}}$('#apiIntegrationStatus').textContent='บันทึก API Keys สำเร็จ';}catch(e){$('#apiIntegrationStatus').textContent=e.message}}
}
new MutationObserver(()=>setTimeout(mount,0)).observe(document.body,{childList:true,subtree:true});mount();
})();
