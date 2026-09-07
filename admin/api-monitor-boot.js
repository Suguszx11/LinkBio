(()=>{
'use strict';
function mount(){
  const buttons=document.querySelectorAll('.nav-item[data-section="apiMonitor"]');
  buttons.forEach(btn=>{
    if(btn.dataset.apiMonitorBound)return;
    btn.dataset.apiMonitorBound='1';
    btn.addEventListener('click',()=>setTimeout(()=>window.openApiMonitor?.(),0));
  });
}
mount();
new MutationObserver(mount).observe(document.body,{childList:true,subtree:true});
})();
