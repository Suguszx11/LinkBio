(()=>{
'use strict';
/* Link editor hardening: keep Style scoped to the link currently being edited,
   normalize URLs before save, preserve per-link GIF data, and fail safely. */
const originalFetch=window.fetch.bind(window);
let editingLinkId='';
let selectedStyle='';
const styleKey='linkbio:editing-style';
function rememberStyle(){
  try{sessionStorage.setItem(styleKey,JSON.stringify({id:editingLinkId,style:selectedStyle}))}catch{}
}
function restoreStyle(){
  try{
    const x=JSON.parse(sessionStorage.getItem(styleKey)||'null');
    if(x?.id===editingLinkId&&x.style)return x.style;
  }catch{}
  return '';
}
function normalizeUrl(raw){
  const value=String(raw||'').trim();
  if(!value)return '';
  const candidate=/^[a-z][a-z0-9+.-]*:\/\//i.test(value)?value:`https://${value}`;
  try{
    const u=new URL(candidate);
    if(!['http:','https:'].includes(u.protocol))throw new Error('bad protocol');
    return u.toString();
  }catch{return value}
}
function pathId(url){
  const m=String(url||'').match(/^\/api\/links\/([^/?#]+)/);
  return m?decodeURIComponent(m[1]):'';
}
window.addEventListener('click',e=>{
  const edit=e.target.closest?.('[data-edit-link]');
  if(edit){
    editingLinkId=edit.dataset.editLink||'';
    selectedStyle='';
    rememberStyle();
    return;
  }
  const style=e.target.closest?.('[data-style]');
  if(style&&editingLinkId){
    selectedStyle=style.dataset.style||'';
    rememberStyle();
  }
  if(e.target.closest?.('#addLink')){
    editingLinkId='';
    selectedStyle='';
    try{sessionStorage.removeItem(styleKey)}catch{}
  }
},{capture:true});
window.fetch=async function(input,init={}){
  const url=typeof input==='string'?input:input?.url||'';
  const method=String(init?.method||(typeof input!=='string'?input?.method:'GET')||'GET').toUpperCase();
  if(method==='PUT'&&/^\/api\/links\/[^/?#]+/.test(url)){
    const id=pathId(url);
    if(id)editingLinkId=id;
    if(init.body&&typeof init.body==='string'){
      try{
        const body=JSON.parse(init.body);
        if(Object.prototype.hasOwnProperty.call(body,'url'))body.url=normalizeUrl(body.url);
        const remembered=restoreStyle()||selectedStyle;
        if(remembered&&editingLinkId===id)body.style=remembered;
        init={...init,body:JSON.stringify(body)};
      }catch{}
    }
  }
  if(method==='POST'&&url==='/api/links'&&init.body&&typeof init.body==='string'){
    try{
      const body=JSON.parse(init.body);
      if(Object.prototype.hasOwnProperty.call(body,'url'))body.url=normalizeUrl(body.url);
      if(!body.style)body.style='Glass';
      init={...init,body:JSON.stringify(body)};
    }catch{}
  }
  const response=await originalFetch(input,init);
  if((method==='PUT'||method==='POST')&&/^\/api\/links(?:\/|$)/.test(url)&&!response.ok){
    return response;
  }
  return response;
};
})();
