const { getStore } = require('@netlify/blobs');
const crypto = require('crypto');
function db(){ return getStore('linkbio'); }
const DEFAULT_PASSWORD = process.env.ADMIN_PASSWORD || 'admin';
const KEY = 'state.json';
const DAY = () => new Date().toISOString().slice(0, 10);

const defaults = {
  profile: { name:'LinkBio', username:'username', displayName:'Your Name', bio:'\\u0e2a\\u0e23\\u0e49\\u0e32\\u0e07 LinkBio \\u0e02\\u0e2d\\u0e07\\u0e04\\u0e38\\u0e13', status:'Online', customStatus:'', statusEmoji:'\\u{1F7E2}', font:'Prompt', fontSize:16, fontWeight:600, letterSpacing:0, textColor:'#ffffff', accent:'#a855f7', secondary:'#8b5cf6', background:'#08080d', verified:true, verifiedPosition:'inline', verifiedAnimation:'check', verifiedTooltip:'Verified Profile' },
  links: [], music: [], appearance: { backgroundType:'color', backgroundColor:'#08080d', gradientColors:['#4b1c77','#08080d'], gradientAngle:135, backgroundOpacity:1, effectIntensity:.7, particleCount:40, particleSpeed:1, performanceMode:false, videoLoop:true, videoMute:true, effects:{} },
  visualizer: { enabled:true, mode:'bars', sensitivity:1, smoothing:.78, barCount:34, barWidth:4, barGap:3, height:42, glow:.9, speed:1, opacity:.9, color:'#a855f7', rotation:0, mirror:false, responsive:true },
  branding: { enabled:false, text:'', icon:'', size:10, color:'#fff', neonColor:'#a855f7', glowIntensity:1, radius:999, opacity:.8, position:'bottom', animation:'none', animationSpeed:1, border:false },
  profileCard: { enabled:true, mode:'transparent', backgroundColor:'#ffffff', opacity:.08, borderColor:'#ffffff', borderOpacity:.18, borderWidth:1, borderRadius:24, blur:20, backdropBlur:20, shadow:true, shadowIntensity:.35, shadowOpacity:.35, innerShadow:false, glow:true, glowColor:'#8b5cf6', glowIntensity:.4, gradientBorder:false, softGlow:true, hoverGlow:true, hoverScale:false, hoverEffect:'glow', hoverIntensity:.5, hoverScaleValue:1.02, animation:'fade', animationSpeed:.5, animationIntensity:1 },
  background: { enabled:false, preset:'floating-particles', intensity:.7, speed:1, opacity:.7, quality:'auto', performanceMode:false, interaction:true },
  analytics: { profileViews:0, viewsByDay:{}, clicksByLink:{}, clicksByDay:{}, activity:[], viewSessions:{} },
  settings: { publicEnabled:true, performanceMode:false }
};

async function load(){ const store=db(); const s=await store.get(KEY,{type:'json'}); if(s) return s; await store.setJSON(KEY,defaults); return structuredClone(defaults); }
async function save(s){ await db().setJSON(KEY,s); return s; }
function json(status,body,extra={}){ return {statusCode:status,headers:{'content-type':'application/json; charset=utf-8',...extra},body:JSON.stringify(body)}; }
function cookies(event){ const h=event.headers||{}; const raw=h.cookie||h.Cookie||''; return Object.fromEntries(raw.split(';').map(x=>x.trim().split('=' )).filter(x=>x.length===2)); }
function authed(event){ return cookies(event).linkbio_admin === 'ok'; }
function clean(v,n=500){return String(v??'').trim().slice(0,n)}
function validUrl(v){try{const u=new URL(v);return ['http:','https:'].includes(u.protocol)}catch{return false}}
function siteIcon(url){try{const h=new URL(url).hostname.toLowerCase(); if(h.includes('instagram'))return 'instagram'; if(h.includes('tiktok'))return 'tiktok'; if(h.includes('youtube')||h.includes('youtu.be'))return 'youtube'; if(h.includes('discord'))return 'discord'; if(h.includes('twitter')||h.includes('x.com'))return 'x'; if(h.includes('facebook'))return 'facebook'; if(h.includes('github'))return 'github'; if(h.includes('twitch'))return 'twitch'; if(h.includes('spotify'))return 'spotify'; if(h.includes('telegram')||h.includes('t.me'))return 'telegram'; if(h.includes('line.me'))return 'line'; return 'globe'}catch{return 'globe'}}
function ytId(url){try{const u=new URL(url); if(u.hostname.includes('youtu.be'))return u.pathname.slice(1).split('/')[0]; if(u.hostname.includes('youtube.com'))return u.searchParams.get('v')||u.pathname.split('/').filter(Boolean).pop()}catch{} return null}
function guarded(event){return authed(event)?null:json(401,{success:false,message:'Request failed'})}

exports.handler = async event => {
  try {
    const path = (event.path||'').replace(/^\/.netlify\/functions\/api/, '') || '/';
    const method = event.httpMethod || 'GET';
    let s = await load();
    let body = {};
    if(event.body){
      const ct=String((event.headers||{})['content-type']||(event.headers||{})['Content-Type']||'');
      if(ct.includes('multipart/form-data')) body=await parseMultipart(event);
      else { try{body=JSON.parse(event.isBase64Encoded?Buffer.from(event.body,'base64').toString():event.body)}catch{body={}} }
    }
    const parts = path.split('/').filter(Boolean);

    if(path==='/admin/login' && method==='POST'){
      if(clean(body.password,200)!==DEFAULT_PASSWORD) return json(401,{success:false,message:'Request failed'});
      return json(200,{success:true},{'set-cookie':'linkbio_admin=ok; HttpOnly; Path=/; SameSite=Lax; Max-Age=43200'});
    }
    if(path==='/admin/me' && method==='GET') return json(200,{success:true,loggedIn:authed(event)});
    if(path==='/admin/logout' && method==='POST') return json(200,{success:true},{'set-cookie':'linkbio_admin=; HttpOnly; Path=/; SameSite=Lax; Max-Age=0'});

    if(path==='/profile' && method==='GET') return json(200,{success:true,profile:{...s.profile,links:s.links,music:s.music,appearance:s.appearance,visualizer:s.visualizer,branding:s.branding,profileCard:s.profileCard,backgroundSettings:s.background}});
    if(path==='/profile' && method==='PUT'){const g=guarded(event);if(g)return g;s.profile={...s.profile,...body,username:clean(body.username,40),verifiedIcon:'\\u2713',verifiedText:'',verifiedPosition:'inline',verifiedRadius:0,verifiedOpacity:1,verifiedTooltip:'Verified Profile'};s.analytics.activity=[{type:'profile-update',at:new Date().toISOString()},...(s.analytics.activity||[])].slice(0,100);await save(s);return json(200,{success:true,message:'Request failed',profile:s.profile})}

    if(path==='/profile-card' && method==='GET') return json(200,{success:true,profileCard:s.profileCard});
    if(path==='/profile-card' && method==='PUT'){const g=guarded(event);if(g)return g;s.profileCard={...s.profileCard,...body};await save(s);return json(200,{success:true,message:'Request failed',profileCard:s.profileCard})}
    if(path==='/background' && method==='GET') return json(200,{success:true,background:s.background});
    if(path==='/background' && method==='PUT'){const g=guarded(event);if(g)return g;s.background={...s.background,...body};await save(s);return json(200,{success:true,message:'Request failed',background:s.background})}
    if(path==='/appearance' && method==='GET') return json(200,{success:true,appearance:s.appearance});
    if(path==='/appearance' && method==='PUT'){const g=guarded(event);if(g)return g;s.appearance={...s.appearance,...body};await save(s);return json(200,{success:true,appearance:s.appearance})}
    if(path==='/visualizer' && method==='GET') return json(200,{success:true,visualizer:s.visualizer});
    if(path==='/visualizer' && method==='PUT'){const g=guarded(event);if(g)return g;s.visualizer={...s.visualizer,...body};await save(s);return json(200,{success:true,visualizer:s.visualizer})}
    if(path==='/branding' && method==='GET') return json(200,{success:true,branding:s.branding});
    if(path==='/branding' && method==='PUT'){const g=guarded(event);if(g)return g;s.branding={...s.branding,...body};await save(s);return json(200,{success:true,branding:s.branding})}
    if(path==='/settings' && method==='GET'){const g=guarded(event);if(g)return g;return json(200,{success:true,settings:s.settings})}
    if(path==='/settings' && method==='PUT'){const g=guarded(event);if(g)return g;s.settings={...s.settings,...body};await save(s);return json(200,{success:true,settings:s.settings})}

    if(parts[0]==='links'){
      if(parts.length===1 && method==='GET') return json(200,{success:true,links:s.links});
      if(parts.length===1 && method==='POST'){const g=guarded(event);if(g)return g;if(!clean(body.title,80)||!validUrl(body.url))return json(400,{success:false,message:'Request failed'});const n={...body,id:crypto.randomUUID(),title:clean(body.title,80),description:clean(body.description,180),icon:body.icon||siteIcon(body.url),iconKey:siteIcon(body.url),iconAuto:body.iconAuto!==false,badge:clean(body.badge,20),enabled:body.enabled!==false,visible:body.visible!==false,openNewTab:body.openNewTab!==false,confirm:body.confirm===true,clicks:0,createdAt:new Date().toISOString(),order:s.links.length};s.links.push(n);await save(s);return json(201,{success:true,link:n,links:s.links})}
      if(parts.length===2 && parts[1]==='reorder' && method==='PUT'){const g=guarded(event);if(g)return g;s.links=(body.links||[]).map((x,i)=>({...x,order:i}));await save(s);return json(200,{success:true,links:s.links})}
      const id=parts[1],idx=s.links.findIndex(x=>x.id===id);if(idx<0)return json(404,{success:false,message:'Request failed'});
      if(method==='PUT'){const g=guarded(event);if(g)return g;if(body.url&&!validUrl(body.url))return json(400,{success:false,message:'Request failed'});s.links[idx]={...s.links[idx],...body,id};if(s.links[idx].iconAuto!==false){s.links[idx].iconKey=siteIcon(s.links[idx].url);s.links[idx].icon=s.links[idx].iconKey}await save(s);return json(200,{success:true,link:s.links[idx],links:s.links})}
      if(method==='DELETE'){const g=guarded(event);if(g)return g;s.links.splice(idx,1);await save(s);return json(200,{success:true,links:s.links})}
      if(parts[2]==='click'&&method==='POST'){s.analytics.clicksByLink[id]=(s.analytics.clicksByLink[id]||0)+1;s.analytics.clicksByDay[DAY()]=(s.analytics.clicksByDay[DAY()]||0)+1;s.analytics.activity=[{type:'click',linkId:id,at:new Date().toISOString()},...(s.analytics.activity||[])].slice(0,100);await save(s);return json(200,{success:true,clicks:s.analytics.clicksByLink[id]})}
    }

    if(path==='/analytics/view' && method==='POST'){const id=clean(body.sessionId,120);if(!id)return json(400,{success:false,message:'Request failed'});const now=Date.now(),last=Number(s.analytics.viewSessions[id]||0);if(last&&now-last<1800000)return json(200,{success:true,counted:false,totalViews:s.analytics.profileViews});s.analytics.viewSessions[id]=now;s.analytics.profileViews++;s.analytics.viewsByDay[DAY()]=(s.analytics.viewsByDay[DAY()]||0)+1;s.analytics.activity=[{type:'view',at:new Date().toISOString()},...(s.analytics.activity||[])].slice(0,100);await save(s);return json(200,{success:true,counted:true,totalViews:s.analytics.profileViews})}
    if(path==='/analytics/music-play' && method==='POST'){s.analytics.activity=[{type:'music-play',trackId:clean(body.trackId,100),at:new Date().toISOString()},...(s.analytics.activity||[])].slice(0,100);await save(s);return json(200,{success:true})}
    if(path.startsWith('/analytics') && method==='GET'){
      const clicks=Object.values(s.analytics.clicksByLink||{}).reduce((a,b)=>a+Number(b||0),0);const top=s.links.map(x=>({...x,clicks:Number(s.analytics.clicksByLink[x.id]||0)})).sort((a,b)=>b.clicks-a.clicks);
      if(path==='/analytics/views')return json(200,{success:true,total:s.analytics.profileViews,daily:s.analytics.viewsByDay});
      if(path==='/analytics/clicks')return json(200,{success:true,total:clicks,daily:s.analytics.clicksByDay,byLink:s.analytics.clicksByLink});
      if(path==='/analytics/links')return json(200,{success:true,links:top});
      if(path==='/analytics/overview')return json(200,{success:true,totalViews:s.analytics.profileViews,totalClicks:clicks,todayViews:s.analytics.viewsByDay[DAY()]||0,todayClicks:s.analytics.clicksByDay[DAY()]||0,viewsByDay:s.analytics.viewsByDay,clicksByDay:s.analytics.clicksByDay});
      return json(200,{success:true,totalProfileViews:s.analytics.profileViews,todayViews:s.analytics.viewsByDay[DAY()]||0,totalLinkClicks:clicks,todayClicks:s.analytics.clicksByDay[DAY()]||0,topLinks:top.slice(0,10),musicTracks:s.music.length,localMusic:s.music.filter(x=>x.type==='local').length,youtubeMusic:s.music.filter(x=>x.type==='youtube').length,_viewsByDay:s.analytics.viewsByDay,serverStatus:'online',apiStatus:'online',storageUsage:0,uploadCount:s.music.filter(x=>x.type==='local').length,recentActivity:(s.analytics.activity||[]).slice(0,20),lastUpdate:new Date().toISOString()});
    }

    if(path==='/music' && method==='POST'){
      const g=guarded(event);if(g)return g;const up=body.__file;if(!up)return json(400,{success:false,message:'Request failed'});if(up.size>5*1024*1024)return json(400,{success:false,message:'Request failed'});const key='music/'+crypto.randomUUID()+'-'+up.name.replace(/[^a-zA-Z0-9._-]/g,'_');await db().set(key,Buffer.from(up.data,'base64'),{metadata:{contentType:up.type||'application/octet-stream'}});const t={id:crypto.randomUUID(),type:'local',title:up.name.replace(/\.[^.]+$/,''),artist:'',album:'',file:key,url:'/api/uploads/'+encodeURIComponent(key),enabled:true,order:s.music.length,createdAt:new Date().toISOString(),size:up.size};s.music.push(t);await save(s);return json(201,{success:true,track:t,music:s.music});
    }    if(path==='/music' && method==='GET') return json(200,{success:true,music:s.music});
    if(parts[0]==='music' && parts[1] && parts[1]!=='youtube' && method==='PUT'){
      const g=guarded(event);if(g)return g;const idx=s.music.findIndex(x=>x.id===parts[1]);if(idx<0)return json(404,{success:false,message:'Request failed'});s.music[idx]={...s.music[idx],...body,id:parts[1]};await save(s);return json(200,{success:true,track:s.music[idx],music:s.music});
    }
    if(parts[0]==='music' && parts[1] && parts[1]!=='youtube' && method==='DELETE'){
      const g=guarded(event);if(g)return g;s.music=s.music.filter(x=>x.id!==parts[1]);await save(s);return json(200,{success:true,music:s.music});
    }
    if(path==='/music/reorder' && method==='PUT'){const g=guarded(event);if(g)return g;s.music=(body.music||[]).map((x,i)=>({...x,order:i}));await save(s);return json(200,{success:true,music:s.music})}
    if(path==='/music/youtube' && method==='POST'){
      const g=guarded(event);if(g)return g;const id=ytId(body.url);if(!id)return json(400,{success:false,message:'Request failed'});const t={id:crypto.randomUUID(),type:'youtube',youtubeId:id,url:'https://www.youtube.com/watch?v='+id,thumbnail:'https://i.ytimg.com/vi/'+id+'/hqdefault.jpg',title:clean(body.title,120)||'YouTube Track',artist:clean(body.artist,80),enabled:true,order:s.music.length,createdAt:new Date().toISOString()};s.music.push(t);await save(s);return json(201,{success:true,track:t,music:s.music});
    }
    if(path==='/admin/upload-avatar' && method==='POST'){
      const g=guarded(event);if(g)return g;const up=body.__file;if(!up)return json(400,{success:false,message:'Request failed'});if(up.size>5*1024*1024)return json(400,{success:false,message:'Request failed'});const key='avatar/'+crypto.randomUUID()+'-'+up.name.replace(/[^a-zA-Z0-9._-]/g,'_');await db().set(key,Buffer.from(up.data,'base64'),{metadata:{contentType:up.type||'image/jpeg'}});s.profile={...s.profile,avatar:'/api/uploads/'+encodeURIComponent(key)};await save(s);return json(200,{success:true,profile:s.profile});
    }
    if(path==='/admin/upload-cover' && method==='POST'){
      const g=guarded(event);if(g)return g;const up=body.__file;if(!up)return json(400,{success:false,message:'Request failed'});if(up.size>5*1024*1024)return json(400,{success:false,message:'Request failed'});const key='cover/'+crypto.randomUUID()+'-'+up.name.replace(/[^a-zA-Z0-9._-]/g,'_');await db().set(key,Buffer.from(up.data,'base64'),{metadata:{contentType:up.type||'image/jpeg'}});s.profile={...s.profile,cover:'/api/uploads/'+encodeURIComponent(key)};await save(s);return json(200,{success:true,profile:s.profile});
    }
    if(parts[0]==='uploads' && method==='GET'){
      const key=decodeURIComponent(parts.slice(1).join('/'));const ext=(key.split('.').pop()||'').toLowerCase();const types={mp3:'audio/mpeg',wav:'audio/wav',aac:'audio/aac',m4a:'audio/mp4',jpg:'image/jpeg',jpeg:'image/jpeg',png:'image/png',webp:'image/webp',gif:'image/gif'};const data=await db().get(key,{type:'arrayBuffer'});if(!data)return json(404,{success:false,message:'Request failed'});return {statusCode:200,isBase64Encoded:true,headers:{'content-type':types[ext]||'application/octet-stream','cache-control':'public,max-age=31536000,immutable'},body:Buffer.from(data).toString('base64')};
    }    if(path==='/admin/status' && method==='GET'){const g=guarded(event);if(g)return g;return json(200,{success:true,status:'online',serverTime:new Date().toISOString()})}
    return json(404,{success:false,message:'Request failed'});
  } catch(e){ console.error(e); return json(500,{success:false,message:'Request failed'}) }
};




async function parseMultipart(event){
  const Busboy=require('busboy');
  const headers=event.headers||{};
  const bb=Busboy({headers:{'content-type':headers['content-type']||headers['Content-Type']||''},limits:{fileSize:5*1024*1024}});
  const result={};
  const raw=event.isBase64Encoded?Buffer.from(event.body||'','base64'):Buffer.from(event.body||'','binary');
  return await new Promise((resolve,reject)=>{
    let fileData=null;
    bb.on('field',(name,val)=>{result[name]=val});
    bb.on('file',(name,file,info)=>{const chunks=[];let size=0;file.on('data',d=>{size+=d.length;chunks.push(d)});file.on('limit',()=>reject(new Error('FILE_TOO_LARGE')));file.on('end',()=>{fileData={name:info.filename,type:info.mimeType,size,data:Buffer.concat(chunks).toString('base64')};result.__file=fileData})});
    bb.on('error',reject);bb.on('finish',()=>resolve(result));bb.end(raw);
  });
}

// Seed the first deployment from the current local project data.
try { Object.assign(defaults, require('../_data/seed.json')); } catch {}

