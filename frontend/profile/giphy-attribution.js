(()=>{
'use strict';
const ATTR='/admin/giphy-attribution-marks/PoweredBy_200_Horizontal_Light-Backgrounds_With_Logo.gif';
function mount(){
 const hasGif=document.querySelector('.profile-gif-sticker');let el=document.getElementById('giphyPublicAttribution');
 if(!hasGif){el?.remove();return}
 if(el)return;
 const host=document.querySelector('.profile-card');if(!host)return;
 el=document.createElement('div');el.id='giphyPublicAttribution';el.className='giphy-public-attribution';
 el.innerHTML=`<a href="https://giphy.com/" target="_blank" rel="noopener noreferrer"><img src="${ATTR}" alt="Powered by GIPHY"></a>`;
 host.appendChild(el);
}
new MutationObserver(mount).observe(document.body,{childList:true,subtree:true});
mount();
})();
