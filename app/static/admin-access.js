// El Defe · acceso administrativo visible + recuperación de sesión vencida
(function(){
 const token=()=>localStorage.getItem('defe_token')||'';
 const role=()=>localStorage.getItem('defe_role')||'';
 function clearSession(){localStorage.removeItem('defe_token');localStorage.removeItem('defe_role');try{window.token='';window.role=''}catch(_){} }
 function loadScript(name){return new Promise((resolve,reject)=>{const key='admin-load-'+name;if(document.querySelector(`script[data-${key}]`))return resolve();const s=document.createElement('script');s.src=`/static/${name}?v=admin-restore-1`;s.dataset[key]='1';s.onload=resolve;s.onerror=reject;document.body.appendChild(s);});}
 async function ensureStoreManagement(){
  if(!['admin','delegado'].includes(role()))return;
  try{
   if(!window.defeEnsureStoreAdmin)await loadScript('store-admin-bridge.js');
   if(!window.defeLoadStoreOrders)await loadScript('store-orders.js');
   await loadScript('store-stock.js');
   await loadScript('store-settings.js');
   await loadScript('store-image-upload.js');
   if(typeof window.defeEnsureStoreAdmin==='function')await window.defeEnsureStoreAdmin();
   if(typeof window.defeLoadStoreOrders==='function')window.defeLoadStoreOrders();
  }catch(e){console.error('No se pudo cargar Gestión de Tienda',e);}
 }
 function ensureCard(){
  const main=document.querySelector('#profile .main');if(!main||document.getElementById('adminAccessCard'))return;
  const card=document.createElement('div');card.id='adminAccessCard';card.className='card';
  main.appendChild(card);render();
 }
 function render(){
  const card=document.getElementById('adminAccessCard');if(!card)return;
  const privileged=['admin','delegado'].includes(role());
  if(token()&&privileged){card.innerHTML='<div class="row"><div><b>Acceso de administración</b><div class="meta">Sesión administrativa activa.</div></div><span class="badge ok">ACTIVO</span></div><button class="btn" style="margin-top:10px" id="adminAccessOpen">⚙ Abrir Gestión</button><button class="light" style="margin-top:7px" id="adminAccessLogout">Cerrar sesión</button>';card.querySelector('#adminAccessOpen').onclick=()=>{window.defeOpenAdmin?window.defeOpenAdmin():window.show?.('admin');setTimeout(ensureStoreManagement,80)};card.querySelector('#adminAccessLogout').onclick=()=>{clearSession();location.reload()};
  }else{card.innerHTML='<div class="row"><div><b>Acceso de administración</b><div class="meta">Para administrar tienda, pedidos y contenidos.</div></div><span class="badge">ADMIN</span></div><button class="light" style="margin-top:10px" id="adminAccessLogin">Iniciar sesión</button>';card.querySelector('#adminAccessLogin').onclick=()=>{const box=document.getElementById('loginBox');if(box){box.classList.remove('hidden');box.scrollIntoView({behavior:'smooth',block:'center'});document.getElementById('email')?.focus()}};
  }
 }
 function installAuthRecovery(){
  const nativeFetch=window.fetch;if(nativeFetch.__defeAuthRecovery)return;
  const wrapped=async function(){const r=await nativeFetch.apply(this,arguments);if(r.status===401&&token()){let detail='';try{const c=r.clone();const j=await c.json();detail=String(j.detail||'').toLowerCase()}catch(_){}if(detail.includes('token')||detail.includes('credencial')||detail.includes('auth')){clearSession();render();const box=document.getElementById('loginBox');box?.classList.remove('hidden')}}return r};wrapped.__defeAuthRecovery=true;window.fetch=wrapped;
 }
 function init(){installAuthRecovery();ensureCard();const old=window.refreshProfile;if(typeof old==='function'&&!old.__adminAccess){const w=async function(){try{return await old.apply(this,arguments)}catch(e){if(String(e?.message||'').toLowerCase().includes('token')){clearSession();document.getElementById('loginBox')?.classList.remove('hidden');document.getElementById('prefsBox')?.classList.add('hidden');render();return}throw e}finally{render()}};w.__adminAccess=true;window.refreshProfile=w}const oldShow=window.show;if(typeof oldShow==='function'&&!oldShow.__storeMgmt){const w=function(id){const r=oldShow.apply(this,arguments);if(id==='admin')setTimeout(ensureStoreManagement,80);return r};w.__storeMgmt=true;window.show=w}setTimeout(()=>{if(document.getElementById('admin')?.classList.contains('on'))ensureStoreManagement()},500)}
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();