(()=>{
'use strict';
const $=s=>document.querySelector(s);
const catalog=()=>window.LinkBioStickerCatalog||{};
const clamp=(n,a,b)=>Math.min(b,Math.max(a,Number(n)||0));
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));
function toggleField(id,label,on){return `<label class="toggle"><input id="${id}" type="checkbox" ${on?'checked':''}><i class="switch"></i><span>${label}</span></label>`}
function numField(id,label,val,min,max,step){return `<label class="field"><span>${label}</span><input id="${id}" type="number" value="${val}" min="${min}" max="${max}" step="${step}"></label>`}
function markup(){
 const c=catalog(),keys=Object.keys(c);
 return `<section class="sticker-studio panel"><div class="panel-title"><h3>Animated Sticker</h3><span>Live • Built-in</span></div>${toggleField('st_enabled','เปิดใช้งาน Sticker',false)}<div class="sticker-grid">${keys.map(k=>`<button type="button" class="sticker-chip" data-sticker="${esc(k)}"><b>${esc(c[k][1]||'')}</b><small>${esc(c[k][0])}</small></button>`).join('')}</div>
 <div class="grid grid-2">${numField('st_size','ขนาด',42,16,140,1)}${numField('st_x','ตำแหน่ง X',0,-240,240,1)}${numField('st_y','ตำแหน่ง Y',-10,-240,240,1)}${numField('st_rotation','Rotation',0,-180,180,1)}${numField('st_opacity','Opacity',1,0,1,.01)}${numField('st_speed','Animation Speed',1,.2,4,.1)}</div>
 <div class="sticker-guide"><strong>Position Guide</strong><div class="sticker-guide-grid">${[['top','บน',0,-150],['left','ซ้าย',-145,0],['right','ขวา',145,0],['corner','มุม',125,-125],['bottom','ล่าง',0,145],['center','กลาง',0,0]].map(x=>`<button type="button" data-pos="${x[0]}" data-x="${x[2]}" data-y="${x[3]}">✦<small>${x[1]}</small></button>`).join('')}</div><span class="muted">ตำแหน่ง relative กับ Profile Card</span></div>
 <div class="sticker-live-wrap"><div class="sticker-live-card"><div class="sticker-live-avatar"></div><strong>Profile Preview</strong><span>@username ✓</span><small>Live Sticker Preview</small><div id="stickerLive"></div></div></div></section>`;
}
function settings(){return {enabled:!!$('#st_enabled')?.checked,preset:document.querySelector('.sticker-chip.selected')?.dataset.sticker||'sparkle',size:clamp($('#st_size')?.value,16,140),x:clamp($('#st_x')?.value,-240,240),y:clamp($('#st_y')?.value,-240,240),rotation:clamp($('#st_rotation')?.value,-180,180),opacity:clamp($('#st_opacity')?.value,0,1),animationSpeed:clamp($('#st_speed')?.value,.2,4)}}
window.getLinkBioStickerSettings=settings;
function draw(s){const c=catalog()[s.preset],host=$('#stickerLive');if(!host)return;host.innerHTML='';if(!s.enabled||!c||!c[1])return;const el=document.createElement('div');el.className='pc-preview-sticker';el.textContent=c[1];el.style.setProperty('--st-x',s.x+'px');el.style.setProperty('--st-y',s.y+'px');el.style.setProperty('--st-r',s.rotation+'deg');el.style.setProperty('--st-size',s.size+'px');el.style.setProperty('--st-opacity',s.opacity);el.style.setProperty('--st-speed',s.animationSpeed);host.appendChild(el)}
async function init(){if($('#stickerStudio')||!location.pathname.includes('/admin'))return;const editor=$('.profile-card-editor');if(!editor)return;const wrap=document.createElement('div');wrap.id='stickerStudio';wrap.innerHTML=markup();editor.querySelector('.preview-wrap')?.prepend(wrap);try{const d=await fetch('/api/profile-card',{credentials:'same-origin',cache:'no-store'}).then(r=>r.json());const s=d.profileCard?.sticker||{};$('#st_enabled').checked=!!s.enabled;document.querySelector(`[data-sticker="${s.preset||'sparkle'}"]`)?.classList.add('selected');for(const [id,k] of [['st_size','size'],['st_x','x'],['st_y','y'],['st_rotation','rotation'],['st_opacity','opacity'],['st_speed','animationSpeed']])if(s[k]!=null)$('#'+id).value=s[k];draw(settings())}catch{}}
function bind(){if(!$('#stickerStudio'))return;$('#stickerStudio').addEventListener('input',()=>draw(settings()));$('#stickerStudio').addEventListener('click',e=>{const chip=e.target.closest('[data-sticker]'),pos=e.target.closest('[data-pos]');if(chip){document.querySelectorAll('.sticker-chip').forEach(x=>x.classList.remove('selected'));chip.classList.add('selected');$('#st_enabled').checked=chip.dataset.sticker!=='none';draw(settings())}if(pos){$('#st_x').value=pos.dataset.x;$('#st_y').value=pos.dataset.y;draw(settings())}})}
new MutationObserver(()=>{if(location.pathname.includes('/admin')){init();setTimeout(bind,0)}}).observe(document.body,{childList:true,subtree:true});
init();setTimeout(bind,100);
})();
