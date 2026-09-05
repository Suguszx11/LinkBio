(()=>{
'use strict';
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));
let active=null;
const icons={success:'✓',error:'!',warning:'!',info:'i'};
function close(value){if(!active)return;const a=active;active=null;a.root.classList.remove('show');setTimeout(()=>a.root.remove(),220);a.resolve(value)}
function dialog(message,opts={}){if(active)close(false);return new Promise(resolve=>{const type=opts.type||'info',confirm=!!opts.confirm;const root=document.createElement('div');root.className='lb-notify';root.innerHTML=`<div class="lb-notify-card" role="dialog" aria-modal="true"><div class="lb-notify-icon">${icons[type]||icons.info}</div><h3>${esc(opts.title||'LinkBio')}</h3><p>${esc(message)}</p><div class="lb-notify-actions">${confirm?'<button type="button" class="lb-notify-cancel">'+esc(opts.cancelText||'ยกเลิก')+'</button>':''}<button type="button" class="lb-notify-ok">${esc(opts.okText||'ตกลง')}</button></div></div>`;document.body.appendChild(root);active={root,resolve};requestAnimationFrame(()=>root.classList.add('show'));root.querySelector('.lb-notify-ok').onclick=()=>close(true);root.querySelector('.lb-notify-cancel')?.addEventListener('click',()=>close(false));root.addEventListener('click',e=>{if(e.target===root&&opts.dismiss!==false)close(false)});root.addEventListener('keydown',e=>{if(e.key==='Escape'&&opts.dismiss!==false)close(false)});root.tabIndex=-1;root.focus()})}
function toast(message,opts={}){const root=document.createElement('div');root.className='lb-notify-toast';root.innerHTML=`<div>${esc(opts.title||'LinkBio')}</div><small>${esc(message)}</small>`;document.body.appendChild(root);requestAnimationFrame(()=>root.classList.add('show'));setTimeout(()=>{root.classList.remove('show');setTimeout(()=>root.remove(),220)},opts.duration||2800)}
window.lbNotify={alert:(m,o={})=>dialog(m,{...o,confirm:false}),confirm:(m,o={})=>dialog(m,{...o,confirm:true}),toast,success:m=>toast(m,{title:'สำเร็จ ✓'}),error:m=>toast(m,{title:'เกิดข้อผิดพลาด !',duration:3800}),warning:m=>toast(m,{title:'แจ้งเตือน !'}),info:m=>toast(m,{title:'ข้อมูล i'})};
window.customNotify=window.lbNotify;
})();
