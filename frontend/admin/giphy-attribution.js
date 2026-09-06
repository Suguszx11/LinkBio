(()=>{
'use strict';
const ATTR='/admin/giphy-attribution-marks/PoweredBy_200_Horizontal_Light-Backgrounds_With_Logo.gif';
function mount(){
 document.querySelectorAll('.gif-attribution').forEach(el=>{
  if(el.dataset.giphyMounted)return;
  el.dataset.giphyMounted='1';
  el.innerHTML=`<a class="giphy-attribution-mark" href="https://giphy.com/" target="_blank" rel="noopener noreferrer" aria-label="Powered by GIPHY"><img src="${ATTR}" alt="Powered by GIPHY"></a><span>ค้นหา GIF ผ่าน GIPHY</span>`;
 });
}
new MutationObserver(mount).observe(document.documentElement,{childList:true,subtree:true});
mount();
})();
