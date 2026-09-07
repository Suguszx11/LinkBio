(()=>{
'use strict';
// GIPHY requires Search API requests to be made client-side.
// Keep the existing /api/giphy/search callers working, but execute them
// directly against GIPHY in the browser instead of proxying through Vercel.
const nativeFetch=window.fetch.bind(window);
let keyPromise=null;
const getKey=async()=>{
  if(!keyPromise)keyPromise=nativeFetch('/api/gifs/config',{credentials:'same-origin',cache:'no-store'}).then(async r=>{
    const d=await r.json().catch(()=>({}));
    if(!r.ok||!d.apiKey)throw Error(d.message||'ยังไม่ได้ตั้ง GIPHY API Key');
    return String(d.apiKey).trim();
  });
  try{return await keyPromise}catch(e){keyPromise=null;throw e}
};
const directSearch=async requestUrl=>{
  const src=new URL(requestUrl,location.origin);
  const q=String(src.searchParams.get('q')||'').trim().slice(0,50);
  const limit=Math.min(50,Math.max(1,Number(src.searchParams.get('limit'))||24));
  if(!q)return new Response(JSON.stringify({success:false,message:'ต้องมีคำค้น'}),{status:400,headers:{'Content-Type':'application/json'}});
  const apiKey=await getKey();
  let last=null;
  for(const endpoint of ['https://api.giphy.com/v1/stickers/search','https://api.giphy.com/v1/gifs/search']){
    const u=new URL(endpoint);
    u.searchParams.set('api_key',apiKey);
    u.searchParams.set('q',q);
    u.searchParams.set('limit',String(limit));
    u.searchParams.set('rating','g');
    u.searchParams.set('lang','th');
    u.searchParams.set('country_code','TH');
    try{
      const r=await nativeFetch(u.toString(),{method:'GET',mode:'cors',cache:'no-store',headers:{accept:'application/json'}});
      const text=await r.text();
      last={status:r.status,text};
      if(r.ok){
        let d;try{d=JSON.parse(text)}catch{continue}
        return new Response(JSON.stringify({success:true,data:d.data||[],pagination:d.pagination||{},source:endpoint.includes('/stickers/')?'stickers':'gifs'}),{status:200,headers:{'Content-Type':'application/json'}});
      }
    }catch(e){last={status:0,text:e.message||'Network error'}}
  }
  let message='GIPHY API ตอบกลับผิดพลาด';
  if(last?.status===401||last?.status===403)message='GIPHY API Key ไม่ถูกต้องหรือไม่ได้รับอนุญาต';
  else if(last?.status===429)message='GIPHY API ถึงขีดจำกัดการเรียกใช้งานแล้ว';
  else if(last?.status===414)message='คำค้นยาวเกิน 50 ตัวอักษร';
  return new Response(JSON.stringify({success:false,message,status:last?.status||502,upstream:String(last?.text||'').slice(0,240)}),{status:last?.status&&last.status>=400&&last.status<600?last.status:502,headers:{'Content-Type':'application/json'}});
};
window.fetch=async(input,init={})=>{
  const url=typeof input==='string'?input:input?.url||'';
  const parsed=new URL(url,location.origin);
  if(parsed.pathname==='/api/giphy/search')return directSearch(parsed.toString());
  return nativeFetch(input,init);
};
})();
