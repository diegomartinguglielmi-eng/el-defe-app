// El Defe · contexto compartido de frontend (API + sesión)
(()=>{
if(window.DefeCore)return;
const STAGING='https://el-defe-v2-staging-production.up.railway.app';
const PROD='https://el-defe-v5-production.up.railway.app';
const IS_STAGING=location.hostname.includes('staging')||location.search.includes('defe_staging=1');
const API=IS_STAGING?STAGING:PROD;
const SESSION_KEY='defe:railway:session', TOKEN_KEY='defe_access_token';
if(IS_STAGING){
  const marker='defe:staging:auth:v4';
  if(localStorage.getItem(marker)!=='1'){
    localStorage.removeItem(SESSION_KEY);
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem('defe_user');
    sessionStorage.removeItem(SESSION_KEY);
    sessionStorage.removeItem(TOKEN_KEY);
    sessionStorage.removeItem('defe_user');
    localStorage.setItem(marker,'1');
  }
}
function jwt(v){if(!v||typeof v!=='string')return'';const m=v.match(/eyJ[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+/);return m?m[0]:''}
function token(){
  const direct=jwt(localStorage.getItem(TOKEN_KEY))||jwt(sessionStorage.getItem(TOKEN_KEY));
  if(direct)return direct;
  for(const st of [localStorage,sessionStorage]){try{const o=JSON.parse(st.getItem(SESSION_KEY)||'null');const t=jwt(o&&o.token);if(t)return t}catch(_){}}
  return '';
}
async function api(path,init={}){
  const h=new Headers(init.headers||{}),t=token();
  if(t)h.set('Authorization','Bearer '+t);
  if(init.body&&!h.has('Content-Type'))h.set('Content-Type','application/json');
  const r=await fetch(API+path,{...init,headers:h,cache:'no-store'});
  const d=await r.json().catch(()=>({}));
  if(!r.ok)throw new Error(d.detail||('Error '+r.status));
  return d;
}
window.DefeCore={API,token,api,IS_STAGING};
})();