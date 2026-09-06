let supa=null;
const $=id=>document.getElementById(id);
async function setup(){
 const cfg=await (await fetch('/api/config/public',{cache:'no-store'})).json();
 if(!cfg.supabaseUrl||!cfg.supabasePublishableKey)throw Error('ระบบบัญชียังไม่ได้ตั้งค่า Supabase');
 supa=window.supabase.createClient(cfg.supabaseUrl,cfg.supabasePublishableKey);
 const {data}=await supa.auth.getSession();
 if(data.session)location.href='/dashboard.html';
}
function message(text,ok=false){const m=$('msg');m.textContent=text;m.className='msg'+(ok?' ok':'')}
$('google').onclick=async()=>{try{if(!supa)await setup();message('กำลังเชื่อมต่อ Google…',true);const {error}=await supa.auth.signInWithOAuth({provider:'google',options:{redirectTo:location.origin+'/dashboard.html'}});if(error)throw error}catch(e){message(e.message||'เข้าสู่ระบบด้วย Google ไม่สำเร็จ')}};
$('form').onsubmit=async e=>{
 e.preventDefault();const btn=$('submit');btn.disabled=true;message('กำลังดำเนินการ…',true);
 try{
  if(document.body.dataset.mode==='register'){
   const username=$('username').value.trim().toLowerCase(),name=$('name').value.trim(),email=$('email').value.trim().toLowerCase(),password=$('password').value;
   if(!/^[a-z0-9._-]{2,40}$/.test(username))throw Error('Username ต้องใช้ a-z, 0-9, . _ - และยาว 2-40 ตัว');
   if(password.length<8)throw Error('รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร');
   const r=await fetch('/api/register',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({username,name,email,password})}),d=await r.json();if(!r.ok)throw Error(d.message||'สมัครสมาชิกไม่สำเร็จ');
   location.href='/dashboard.html';
  }else{
   const r=await fetch('/api/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email:$('email').value.trim().toLowerCase(),password:$('password').value})}),d=await r.json();if(!r.ok)throw Error(d.message||'เข้าสู่ระบบไม่สำเร็จ');location.href='/dashboard.html';
  }
 }catch(e){message(e.message||'ดำเนินการไม่สำเร็จ')}finally{btn.disabled=false}
};
setup().catch(e=>message(e.message));
