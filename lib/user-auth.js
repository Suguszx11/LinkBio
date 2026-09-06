const bcrypt=require('bcrypt');
const crypto=require('crypto');
const SECRET=String(process.env.USER_AUTH_SECRET||process.env.SUPABASE_SECRET_KEY||'change-me').trim();
const RESERVED=new Set(['admin','api','login','register','dashboard','settings','support','profile','privacy','terms','favicon','assets','static']);
function normalizeUsername(v){return String(v||'').trim().replace(/^@/,'').toLowerCase()}
function validUsername(v){return /^[a-z0-9._-]{2,40}$/.test(normalizeUsername(v))&&!RESERVED.has(normalizeUsername(v))}
function cookieToken(userId,role='user',ttl=43200){const exp=Math.floor(Date.now()/1000)+ttl;const body=Buffer.from(JSON.stringify({sub:userId,role,exp})).toString('base64url');const sig=crypto.createHmac('sha256',SECRET).update(body).digest('base64url');return `${body}.${sig}`}
function verifyToken(token){try{const [body,sig]=String(token||'').split('.');if(!body||!sig)return null;const expected=crypto.createHmac('sha256',SECRET).update(body).digest('base64url');if(!crypto.timingSafeEqual(Buffer.from(sig),Buffer.from(expected)))return null;const data=JSON.parse(Buffer.from(body,'base64url').toString());return data.exp>Date.now()/1000?data:null}catch{return null}}
function setCookie(res,token,maxAge=43200){res.setHeader('Set-Cookie',`linkbio_user=${token}; HttpOnly; Path=/; SameSite=Lax; Max-Age=${maxAge}`)}
function clearCookie(res){res.setHeader('Set-Cookie','linkbio_user=; HttpOnly; Path=/; SameSite=Lax; Max-Age=0')}
async function hashPassword(password){return bcrypt.hash(String(password),12)}
async function verifyPassword(password,hash){return bcrypt.compare(String(password),String(hash||''))}
async function createUser(adminClient,{email,password,username,name}){if(!adminClient)throw Error('Supabase server key is not configured');const u=normalizeUsername(username);if(!validUsername(u))throw Error('Username ไม่ถูกต้องหรือสงวนไว้');if(!/^\S+@\S+\.\S+$/.test(email))throw Error('Email ไม่ถูกต้อง');if(String(password).length<8)throw Error('รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร');const created=await adminClient.auth.admin.createUser({email:String(email).trim().toLowerCase(),password:String(password),email_confirm:true});if(created.error)throw created.error;const hash=await hashPassword(password);return {user:created.user,username:u,passwordHash:hash,name:String(name||u).trim().slice(0,80)}}
module.exports={RESERVED,normalizeUsername,validUsername,cookieToken,verifyToken,setCookie,clearCookie,hashPassword,verifyPassword,createUser};
