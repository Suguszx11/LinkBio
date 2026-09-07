(()=>{
'use strict';
const CATALOG={
  none:'',sparkle:'✨',heart:'💗',star:'⭐',bunny:'🐰',bear:'🧸',cat:'🐱',duck:'🐥',
  flower:'🌸',butterfly:'🦋',cloud:'☁️',moon:'🌙',planet:'🪐',rainbow:'🌈',mushroom:'🍄',
  cupcake:'🧁',ghost:'👻',alien:'👽'
};
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));
function removeAll(){document.querySelectorAll('.profile-sticker-layer,.profile-gif-sticker-layer').forEach(x=>x.remove())}
function renderLinkBioSticker(s={}){
  document.querySelectorAll('.profile-sticker-layer').forEach(x=>x.remove());
  if(!s?.enabled||!CATALOG[s.preset])return;
  const host=document.querySelector('.profile-card');if(!host)return;
  const el=document.createElement('div');el.className='profile-sticker-layer';el.textContent=CATALOG[s.preset];el.setAttribute('aria-hidden','true');
  el.style.setProperty('--st-size',Math.min(180,Math.max(16,Number(s.size)||42))+'px');
  el.style.setProperty('--st-x',Math.min(360,Math.max(-360,Number(s.x)||0))+'px');
  el.style.setProperty('--st-y',Math.min(360,Math.max(-360,Number(s.y)||-10))+'px');
  el.style.setProperty('--st-r',Math.min(180,Math.max(-180,Number(s.rotation)||0))+'deg');
  el.style.setProperty('--st-opacity',Math.min(1,Math.max(0,Number(s.opacity??1))));
  el.style.setProperty('--st-speed',Math.min(4,Math.max(.2,Number(s.animationSpeed)||1)));
  host.appendChild(el);
}
function renderLinkBioGifSticker(data={}){
  document.querySelectorAll('.profile-gif-sticker-layer').forEach(x=>x.remove());
  const items=Array.isArray(data?.items)?data.items.filter(x=>x&&x.enabled!==false&&/^https:\/\//i.test(String(x.url||''))):[];
  if(data?.enabled===false||!items.length)return;
  const host=document.querySelector('.profile-card');if(!host)return;
  const frag=document.createDocumentFragment();
  items.slice(0,16).forEach((g,i)=>{
    const wrap=document.createElement('div');wrap.className='profile-gif-sticker-layer';
    wrap.style.setProperty('--gif-size',Math.min(360,Math.max(24,Number(g.size)||72))+'px');
    wrap.style.setProperty('--gif-x',Math.min(360,Math.max(-360,Number(g.x)||0))+'px');
    wrap.style.setProperty('--gif-y',Math.min(360,Math.max(-360,Number(g.y)||0))+'px');
    wrap.style.setProperty('--gif-r',Math.min(180,Math.max(-180,Number(g.rotation)||0))+'deg');
    wrap.style.setProperty('--gif-opacity',Math.min(1,Math.max(0,Number(g.opacity??1))));
    wrap.style.setProperty('--gif-speed',Math.min(4,Math.max(.2,Number(g.animationSpeed)||1)));
    wrap.dataset.animation=['none','float','pulse','bounce','spin'].includes(g.animation)?g.animation:'float';
    wrap.dataset.position=['card','links','avatar'].includes(g.position)?g.position:'card';
    wrap.style.setProperty('--gif-order',i);
    const img=document.createElement('img');img.className='profile-gif-sticker';img.src=String(g.url);img.alt=esc(g.title||'GIF sticker');img.loading='lazy';img.decoding='async';img.referrerPolicy='no-referrer';
    wrap.appendChild(img);frag.appendChild(wrap);
  });
  host.appendChild(frag);
}
window.renderLinkBioSticker=renderLinkBioSticker;
window.renderLinkBioGifSticker=renderLinkBioGifSticker;
window.removeLinkBioStickers=removeAll;
})();
