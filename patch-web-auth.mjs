import fs from 'node:fs';
import path from 'node:path';

const assetsDir = path.resolve('defe-web-build/dist/assets');
const files = fs.readdirSync(assetsDir).filter(f => /^index-.*\.js$/.test(f));
if (!files.length) throw new Error('No se encontró el bundle principal');

const file = path.join(assetsDir, files[0]);
let s = fs.readFileSync(file, 'utf8');

const start = s.indexOf('function $0(){');
const end = s.indexOf('function D0(){', start);
if (start < 0 || end < 0) throw new Error('No se encontró el hook de autenticación a reemplazar');

const replacement = String.raw`function $0(){const API="https://el-defe-v5-production.up.railway.app",K="defe:railway:session",read=()=>{try{const v=JSON.parse(localStorage.getItem(K)||"null");return v&&v.token&&v.user?v:null}catch{return null}},[e,t]=C.useState(()=>{const v=read();return v?v.user:null}),[r,n]=C.useState(!1),save=(token,user,nombre)=>{const u={id:user.id,email:user.email,nombre:nombre||user.nombre||user.email,admin:user.role==="admin",role:user.role,favoritos:[],notificaciones:{}};localStorage.setItem(K,JSON.stringify({token,user:u}));localStorage.setItem("defe_access_token",token);localStorage.setItem("defe_user",JSON.stringify(u));t(u);return u},detail=async resp=>{let d={};try{d=await resp.json()}catch{};if(typeof d.detail==="string")return d.detail;if(Array.isArray(d.detail)&&d.detail[0]?.msg)return String(d.detail[0].msg).replace(/^Value error,\s*/,"");return "Error "+resp.status},s=C.useCallback(async(l,c)=>{try{const body=new URLSearchParams();body.set("username",String(l||"").trim().toLowerCase());body.set("password",c||"");const resp=await fetch(API+"/api/auth/login",{method:"POST",headers:{"Content-Type":"application/x-www-form-urlencoded"},body});if(!resp.ok)return await detail(resp);const d=await resp.json();save(d.access_token,d.user);return null}catch{return "No se pudo conectar con el servidor. Probá nuevamente."}},[]),i=C.useCallback(async(l,c,h)=>{try{if(String(c||"").length<8)return "La contraseña debe tener al menos 8 caracteres.";const resp=await fetch(API+"/api/auth/register",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({email:String(l||"").trim().toLowerCase(),password:c||""})});if(!resp.ok)return await detail(resp);const d=await resp.json();save(d.access_token,d.user,h);return null}catch{return "No se pudo conectar con el servidor. Probá nuevamente."}},[]),a=C.useCallback(async()=>{localStorage.removeItem(K);localStorage.removeItem("defe_access_token");localStorage.removeItem("defe_user");t(null)},[]),o=C.useCallback(async l=>{if(e){const u={...e,...l};t(u);const v=read();if(v)localStorage.setItem(K,JSON.stringify({...v,user:u}))}},[e]);return{usuario:e,admin:!!e?.admin,cargando:r,entrar:s,registrarse:i,salir:a,guardarPreferencias:o}}`;

s = s.slice(0, start) + replacement + s.slice(end);

const oldSuccess = 'g(h==="crear"?"Cuenta creada. Revisá tu email para confirmarla.":null)';
if (s.includes(oldSuccess)) {
  s = s.replace(oldSuccess, 'g(h==="crear"?"Cuenta creada correctamente.":null)');
}

fs.writeFileSync(file, s);
console.log(`Autenticación web parcheada en ${files[0]}`);
