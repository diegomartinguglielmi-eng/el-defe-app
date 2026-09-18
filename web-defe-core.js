// El Defe · contexto compartido de frontend (API + token + fetch autenticado)
(()=>{
if(window.DefeCore)return;
const STAGING='https://el-defe-v2-staging-production.up.railway.app';
const PROD='https://el-defe-v5-production.up.railway.app';
const API=(location.hostname.includes('staging')||location.search.includes('defe_staging=1'))?STAGING:PROD;
function jwt(v){if(!v||typeof v!=='string')return null;const m=v.match(/eyJ[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+/);if(m)return m[0];try{const o=JSON.parse(v);for(const x of Object.values(o||{})){const f=jwt(typeof x==='string'?x:JSON.stringify(x));if(f)return f}}catch(_){}return null}
function token(){for(const st of [localStorage,sessionStorage])for(let i=0;i<st.length;i++){const t=jwt(st.getItem(st.key(i)));if(t)return t}return''}
async function api(path,init={}){const h=new Headers(init.headers||{}),t=token();if(t)h.set('Authorization','Bearer '+t);if(init.body&&!h.has('Content-Type'))h.set('Content-Type','application/json');const r=await fetch(API+path,{...init,headers:h,cache:'no-store'});const d=await r.json().catch(()=>({}));if(!r.ok)throw new Error(d.detail||('Error '+r.status));return d}
window.DefeCore={API,token,api};
})();