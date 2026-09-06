const fs=require('fs');
const path=require('path');
const crypto=require('crypto');

function registerSupport(app,{isAdmin,resolveSupabaseUser}){
  const dir=path.join(__dirname,'database');
  const ticketsFile=path.join(dir,'support-tickets.json');
  const messagesFile=path.join(dir,'support-messages.json');
  // Vercel's deployed filesystem is read-only. Legacy JSON storage remains local-only.
  const canWrite=process.env.VERCEL!=='1';
  if(canWrite){
    fs.mkdirSync(dir,{recursive:true});
    if(!fs.existsSync(ticketsFile))fs.writeFileSync(ticketsFile,'[]');
    if(!fs.existsSync(messagesFile))fs.writeFileSync(messagesFile,'[]');
  }
  const supportSessions=new Map(),userClients=new Map(),adminClients=new Set();
  let adminPresenceUntil=0;
  const clean=(v,n)=>String(v??'').trim().slice(0,n);
  const read=p=>{try{return JSON.parse(fs.readFileSync(p,'utf8'))}catch{return []}};
  const write=(p,v)=>{
    if(!canWrite)throw Object.assign(new Error('Support JSON storage is unavailable on Vercel'),{code:'EROFS'});
    const tmp=p+'.tmp';fs.writeFileSync(tmp,JSON.stringify(v,null,2));fs.renameSync(tmp,p)
  };
  const cookie=(req,n)=>Object.fromEntries(String(req.headers.cookie||'').split(';').map(x=>x.trim().split('=').map(decodeURIComponent)).filter(x=>x.length===2))[n];
  const setCookie=(res,n,v,max=2592000)=>res.setHeader('Set-Cookie',`${n}=${encodeURIComponent(v)}; HttpOnly; Path=/; SameSite=Lax; Max-Age=${max}`);
  const userFromSession=req=>{const t=cookie(req,'linkbio_support'),s=t&&supportSessions.get(t);if(!s||s.exp<Date.now()){if(s)supportSessions.delete(t);return null}return s};
  const ticketFor=id=>read(ticketsFile).find(x=>x.id===id);
  const messagesFor=id=>read(messagesFile).filter(x=>x.ticketId===id).sort((a,b)=>Number(a.number)-Number(b.number));
  const publicTicket=t=>({...t,messageCount:messagesFor(t.id).length});
  const emit=(uid,event,payload)=>{const data=`event: ${event}\ndata: ${JSON.stringify(payload)}\n\n`;for(const res of userClients.get(uid)||[])try{res.write(data)}catch{}};
  const emitAdmin=(event,payload)=>{const data=`event: ${event}\ndata: ${JSON.stringify(payload)}\n\n`;for(const res of adminClients)try{res.write(data)}catch{}};
  async function verifySupabaseToken(token){
    if(!resolveSupabaseUser||!token)throw Error('ไม่พบ LinkBio session');
    const u=await resolveSupabaseUser(token);
    if(!u)throw Error('LinkBio session หมดอายุหรือไม่ถูกต้อง');
    return {uid:u.id,email:u.email||'',displayName:u.user_metadata?.display_name||u.user_metadata?.full_name||'LinkBio User',photoUrl:u.user_metadata?.avatar_url||u.user_metadata?.picture||'',emailVerified:!!u.email_confirmed_at};
  }
  async function verifyFirebaseToken(token){
    const key=String(process.env.FIREBASE_API_KEY||'AIzaSyCJpSjW6Kb79eDqilEeTfo-gFL_sdzyjHY').trim();
    if(!token)throw Error('ไม่พบ Google session');
    const r=await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${encodeURIComponent(key)}`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({idToken:token})});
    const d=await r.json().catch(()=>({})),u=d.users?.[0];
    if(!r.ok||!u||u.disabled)throw Error('Google session หมดอายุหรือไม่ถูกต้อง');
    return {uid:u.localId,email:u.email||'',displayName:u.displayName||'Google User',photoUrl:u.photoUrl||'',emailVerified:!!u.emailVerified};
  }
  const requireUser=(req,res)=>{const s=userFromSession(req);if(!s){res.status(401).json({success:false,message:'กรุณาเข้าสู่ระบบ Google ก่อน'});return null}return s};
  const nextNumber=id=>messagesFor(id).reduce((n,m)=>Math.max(n,Number(m.number)||0),0)+1;
  function markRead(id,side){const ms=read(messagesFile),now=new Date().toISOString();let changed=false;for(const m of ms){if(m.ticketId!==id)continue;if(side==='user'&&m.sender==='admin'&&!m.readAt){m.readAt=now;changed=true}if(side==='admin'&&m.sender==='user'&&!m.readAt){m.readAt=now;changed=true}}if(changed)write(messagesFile,ms);return now;}
  async function aiReply(text){
    if(String(process.env.SUPPORT_AI_ENABLED||'true').toLowerCase()==='false')return null;
    const key=String(process.env.OPENAI_API_KEY||'').trim();
    if(key){try{const r=await fetch('https://api.openai.com/v1/responses',{method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${key}`},body:JSON.stringify({model:process.env.OPENAI_MODEL||'gpt-5.6-luna',input:`คุณคือ AI ผู้ช่วยของ DEKKHONGSHOP สำหรับ LinkBio ตอบภาษาไทยสุภาพ กระชับ ช่วยเรื่องลิงก์ โปรไฟล์ เว็บ และการใช้งานระบบ หากเป็นเรื่องบัญชี/ชำระเงิน/แก้ข้อมูลที่ต้องใช้สิทธิ์ ให้แจ้งว่าจะส่งต่อแอดมิน ห้ามอ้างว่าเป็นมนุษย์\nผู้ใช้: ${text}`,max_output_tokens:300})});const d=await r.json();const out=d.output_text||d.output?.flatMap(x=>x.content||[]).map(x=>x.text||'').join('').trim();if(r.ok&&out)return out;}catch{}}
    const s=text.toLowerCase();
    if(/ลิ้ง|ลิงก์|link|bio/.test(s))return 'AI Assistant: ได้เลยครับ ถ้าต้องการทำลิงก์/LinkBio บอกได้เลยว่าอยากได้ชื่อ ลิงก์ และสไตล์ประมาณไหน เดี๋ยวผมช่วยเตรียมรายละเอียดให้แอดมินครับ';
    if(/เว็บ|website|เว็บไซต์/.test(s))return 'AI Assistant: ได้ครับ ถ้าต้องการทำเว็บไซต์ บอกประเภทเว็บ ฟีเจอร์หลัก และสไตล์ที่อยากได้ เดี๋ยวผมสรุปบรีฟให้แอดมินครับ';
    if(/ราคา|ค่าใช้|เท่าไหร่/.test(s))return 'AI Assistant: เรื่องราคาและใบเสนอราคาขอให้แอดมินตรวจสอบให้โดยตรงนะครับ ผมจะเก็บข้อความนี้ไว้ใน Ticket ให้ครับ';
    return 'AI Assistant: รับข้อความแล้วครับ ตอนนี้แอดมินอาจไม่อยู่ ระบบจะเก็บเรื่องไว้และแจ้งแอดมินเมื่อกลับมาออนไลน์ครับ';
  }

  app.post('/api/support/auth',async(req,res)=>{try{const bearer=String(req.headers.authorization||'').replace(/^Bearer\s+/i,'');const u=await verifySupabaseToken(bearer);const token=crypto.randomBytes(48).toString('hex');supportSessions.set(token,{...u,exp:Date.now()+30*24*3600000});setCookie(res,'linkbio_support',token);res.json({success:true,user:{...u,displayName:'@Dekkhong'}})}catch(e){res.status(401).json({success:false,message:e.message||'LinkBio login ไม่สำเร็จ'})}});
  app.get('/api/support/me',(req,res)=>{const s=userFromSession(req);res.json({success:true,loggedIn:!!s,user:s?{uid:s.uid,email:s.email,displayName:s.displayName,photoUrl:s.photoUrl}:null,adminOnline:Date.now()<adminPresenceUntil})});
  app.post('/api/support/logout',(req,res)=>{const t=cookie(req,'linkbio_support');if(t)supportSessions.delete(t);setCookie(res,'linkbio_support','',0);res.json({success:true})});
  app.get('/api/support/presence',(req,res)=>res.json({success:true,online:Date.now()<adminPresenceUntil}));

  app.get('/api/support/tickets',(req,res)=>{const s=requireUser(req,res);if(!s)return;const items=read(ticketsFile).filter(x=>x.userId===s.uid).sort((a,b)=>new Date(b.updatedAt)-new Date(a.updatedAt));res.json({success:true,tickets:items.map(publicTicket),unread:items.reduce((n,t)=>n+Number(t.userUnread||0),0),adminOnline:Date.now()<adminPresenceUntil})});
  app.post('/api/support/tickets',async(req,res)=>{const s=requireUser(req,res);if(!s)return;const subject=clean(req.body?.subject,120)||'ติดต่อแอดมิน';const first=clean(req.body?.message,2000);if(!first)return res.status(400).json({success:false,message:'กรุณาพิมพ์ข้อความก่อน'});const now=new Date().toISOString();const t={id:'ticket_'+crypto.randomBytes(6).toString('hex'),userId:s.uid,email:s.email,displayName:s.displayName,photoUrl:s.photoUrl,subject,status:'open',userUnread:0,adminUnread:1,createdAt:now,updatedAt:now};const ts=read(ticketsFile);ts.push(t);write(ticketsFile,ts);const m={id:'message_'+crypto.randomBytes(7).toString('hex'),number:1,ticketId:t.id,sender:'user',senderId:s.uid,text:first,createdAt:now,readAt:null};const ms=read(messagesFile);ms.push(m);write(messagesFile,ms);emitAdmin('support:ticket-created',{ticket:publicTicket(t),message:m});
    if(Date.now()>=adminPresenceUntil){const ai=await aiReply(first);if(ai){const at=new Date().toISOString();const am={id:'message_'+crypto.randomBytes(7).toString('hex'),number:2,ticketId:t.id,sender:'ai',senderId:'ai',text:ai,createdAt:at,readAt:null};const all=read(messagesFile);all.push(am);write(messagesFile,all);t.userUnread=1;t.adminUnread=0;t.status='pending';t.updatedAt=at;const tx=read(ticketsFile),ti=tx.findIndex(x=>x.id===t.id);tx[ti]=t;write(ticketsFile,tx);emit(s.uid,'support:message-created',{ticket:publicTicket(t),message:am});}}
    res.status(201).json({success:true,ticket:publicTicket(t),messages:messagesFor(t.id)});
  });
  app.get('/api/support/tickets/:id',(req,res)=>{const s=requireUser(req,res);if(!s)return;const t=ticketFor(req.params.id);if(!t||t.userId!==s.uid)return res.status(404).json({success:false,message:'ไม่พบห้องแชท'});t.userUnread=0;t.updatedAt=new Date().toISOString();const ts=read(ticketsFile),i=ts.findIndex(x=>x.id===t.id);if(i>=0)ts[i]=t;write(ticketsFile,ts);markRead(t.id,'user');res.json({success:true,ticket:publicTicket(t),messages:messagesFor(t.id),adminOnline:Date.now()<adminPresenceUntil})});
  app.post('/api/support/tickets/:id/messages',async(req,res)=>{const s=requireUser(req,res);if(!s)return;const t=ticketFor(req.params.id);if(!t||t.userId!==s.uid)return res.status(404).json({success:false,message:'ไม่พบห้องแชท'});if(t.status==='closed')return res.status(409).json({success:false,message:'ห้องนี้ปิดแล้ว'});const text=clean(req.body?.message,2000);if(!text)return res.status(400).json({success:false,message:'ข้อความว่างเปล่า'});const now=new Date().toISOString();const m={id:'message_'+crypto.randomBytes(7).toString('hex'),number:nextNumber(t.id),ticketId:t.id,sender:'user',senderId:s.uid,text,createdAt:now,readAt:null};const ms=read(messagesFile);ms.push(m);write(messagesFile,ms);t.adminUnread=(t.adminUnread||0)+1;t.userUnread=0;t.updatedAt=now;let ts=read(ticketsFile),i=ts.findIndex(x=>x.id===t.id);ts[i]=t;write(ticketsFile,ts);emitAdmin('support:message-created',{ticket:publicTicket(t),message:m});
    if(Date.now()>=adminPresenceUntil){const ai=await aiReply(text);if(ai){const at=new Date().toISOString();const am={id:'message_'+crypto.randomBytes(7).toString('hex'),number:nextNumber(t.id),ticketId:t.id,sender:'ai',senderId:'ai',text:ai,createdAt:at,readAt:null};const all=read(messagesFile);all.push(am);write(messagesFile,all);t.userUnread=1;t.adminUnread=0;t.status='pending';t.updatedAt=at;ts=read(ticketsFile);i=ts.findIndex(x=>x.id===t.id);ts[i]=t;write(ticketsFile,ts);emit(s.uid,'support:message-created',{ticket:publicTicket(t),message:am});}}
    res.status(201).json({success:true,message:m,ticket:publicTicket(t)});
  });
  app.post('/api/support/tickets/:id/read',(req,res)=>{const s=requireUser(req,res);if(!s)return;const t=ticketFor(req.params.id);if(!t||t.userId!==s.uid)return res.status(404).json({success:false,message:'ไม่พบห้องแชท'});t.userUnread=0;const ts=read(ticketsFile),i=ts.findIndex(x=>x.id===t.id);ts[i]=t;write(ticketsFile,ts);markRead(t.id,'user');emitAdmin('support:message-read',{ticketId:t.id,by:'user'});res.json({success:true})});
  app.post('/api/support/tickets/:id/close',(req,res)=>{const s=requireUser(req,res);if(!s)return;const t=ticketFor(req.params.id);if(!t||t.userId!==s.uid)return res.status(404).json({success:false,message:'ไม่พบห้องแชท'});t.status='closed';t.updatedAt=new Date().toISOString();const ts=read(ticketsFile),i=ts.findIndex(x=>x.id===t.id);ts[i]=t;write(ticketsFile,ts);emitAdmin('support:ticket-updated',{ticket:publicTicket(t)});res.json({success:true,ticket:publicTicket(t)})});
  app.get('/api/support/stream',(req,res)=>{const s=userFromSession(req);if(!s)return res.status(401).end();res.set({'Content-Type':'text/event-stream','Cache-Control':'no-cache, no-store','Connection':'keep-alive','X-Accel-Buffering':'no'});res.flushHeaders?.();const set=userClients.get(s.uid)||new Set();set.add(res);userClients.set(s.uid,set);res.write(`event: ready\ndata: ${JSON.stringify({ok:true})}\n\n`);const ping=setInterval(()=>{try{res.write(': ping\n\n')}catch{}},15000);req.on('close',()=>{clearInterval(ping);set.delete(res);if(!set.size)userClients.delete(s.uid)})});
  app.get('/api/support/admin/tickets',(req,res)=>{if(!isAdmin(req))return res.status(401).json({success:false,message:'กรุณาเข้าสู่ระบบ Admin'});adminPresenceUntil=Date.now()+30000;const ts=read(ticketsFile).sort((a,b)=>new Date(b.updatedAt)-new Date(a.updatedAt));res.json({success:true,tickets:ts.map(publicTicket),unread:ts.reduce((n,t)=>n+Number(t.adminUnread||0),0),online:true})});
  app.post('/api/support/admin/presence',(req,res)=>{if(!isAdmin(req))return res.status(401).json({success:false,message:'กรุณาเข้าสู่ระบบ Admin'});adminPresenceUntil=Date.now()+30000;emitAdmin('support:presence',{online:true});for(const uid of userClients.keys())emit(uid,'support:presence',{online:true});res.json({success:true,online:true})});
  app.get('/api/support/admin/tickets/:id',(req,res)=>{if(!isAdmin(req))return res.status(401).json({success:false,message:'กรุณาเข้าสู่ระบบ Admin'});adminPresenceUntil=Date.now()+30000;const t=ticketFor(req.params.id);if(!t)return res.status(404).json({success:false,message:'ไม่พบ Ticket'});t.adminUnread=0;const ts=read(ticketsFile),i=ts.findIndex(x=>x.id===t.id);ts[i]=t;write(ticketsFile,ts);markRead(t.id,'admin');res.json({success:true,ticket:publicTicket(t),messages:messagesFor(t.id)})});
  app.post('/api/support/admin/tickets/:id/typing',(req,res)=>{if(!isAdmin(req))return res.status(401).json({success:false});adminPresenceUntil=Date.now()+30000;const t=ticketFor(req.params.id);if(!t)return res.status(404).json({success:false});emit(t.userId,'support:typing',{ticketId:t.id,typing:req.body?.typing!==false});res.json({success:true})});
  app.post('/api/support/admin/tickets/:id/reply',(req,res)=>{if(!isAdmin(req))return res.status(401).json({success:false,message:'กรุณาเข้าสู่ระบบ Admin'});adminPresenceUntil=Date.now()+30000;const t=ticketFor(req.params.id);if(!t)return res.status(404).json({success:false,message:'ไม่พบ Ticket'});if(t.status==='closed')return res.status(409).json({success:false,message:'Ticket นี้ปิดแล้ว'});const text=clean(req.body?.message,2000);if(!text)return res.status(400).json({success:false,message:'ข้อความว่างเปล่า'});const now=new Date().toISOString();const m={id:'message_'+crypto.randomBytes(7).toString('hex'),number:nextNumber(t.id),ticketId:t.id,sender:'admin',senderId:'admin',text,createdAt:now,readAt:null};const ms=read(messagesFile);ms.push(m);write(messagesFile,ms);t.userUnread=(t.userUnread||0)+1;t.adminUnread=0;t.status='pending';t.updatedAt=now;const ts=read(ticketsFile),i=ts.findIndex(x=>x.id===t.id);ts[i]=t;write(ticketsFile,ts);emit(t.userId,'support:message-created',{ticket:publicTicket(t),message:m});emitAdmin('support:message-created',{ticket:publicTicket(t),message:m});res.status(201).json({success:true,message:m,ticket:publicTicket(t)})});
  app.post('/api/support/admin/tickets/:id/status',(req,res)=>{if(!isAdmin(req))return res.status(401).json({success:false,message:'กรุณาเข้าสู่ระบบ Admin'});adminPresenceUntil=Date.now()+30000;const t=ticketFor(req.params.id);if(!t)return res.status(404).json({success:false,message:'ไม่พบ Ticket'});const status=['open','pending','closed'].includes(req.body?.status)?req.body.status:null;if(!status)return res.status(400).json({success:false,message:'สถานะไม่ถูกต้อง'});t.status=status;t.updatedAt=new Date().toISOString();if(status==='closed')t.userUnread=(t.userUnread||0)+1;const ts=read(ticketsFile),i=ts.findIndex(x=>x.id===t.id);ts[i]=t;write(ticketsFile,ts);emit(t.userId,'support:ticket-updated',{ticket:publicTicket(t)});emitAdmin('support:ticket-updated',{ticket:publicTicket(t)});res.json({success:true,ticket:publicTicket(t)})});
  app.get('/api/support/admin/stream',(req,res)=>{if(!isAdmin(req))return res.status(401).end();adminPresenceUntil=Date.now()+30000;res.set({'Content-Type':'text/event-stream','Cache-Control':'no-cache, no-store','Connection':'keep-alive','X-Accel-Buffering':'no'});res.flushHeaders?.();adminClients.add(res);res.write(`event: ready\ndata: ${JSON.stringify({ok:true,online:true})}\n\n`);for(const uid of userClients.keys())emit(uid,'support:presence',{online:true});const ping=setInterval(()=>{try{adminPresenceUntil=Date.now()+30000;res.write(': ping\n\n')}catch{}},10000);req.on('close',()=>{clearInterval(ping);adminClients.delete(res);if(!adminClients.size){adminPresenceUntil=0;for(const uid of userClients.keys())emit(uid,'support:presence',{online:false})}try{res.end()}catch{}})});
}
module.exports={registerSupport};
