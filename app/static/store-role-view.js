// El Defe · Vista y bootstrap operativo para el perfil Tienda
(function(){
  if(window.__defeStoreRoleViewLoaded)return;
  window.__defeStoreRoleViewLoaded=true;
  const API=()=>String(window.EL_DEFE_API_URL||'https://el-defe-v5-production.up.railway.app').replace(/\/$/,'');

  function jwtFromValue(value){if(!value||typeof value!=='string')return null;const direct=value.match(/eyJ[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+/);if(direct)return direct[0];try{const parsed=JSON.parse(value);if(typeof parsed==='string')return jwtFromValue(parsed);if(parsed&&typeof parsed==='object')for(const v of Object.values(parsed)){const found=jwtFromValue(typeof v==='string'?v:JSON.stringify(v));if(found)return found}}catch(_){}return null;}
  function findToken(){for(const store of [localStorage,sessionStorage])for(let i=0;i<store.length;i++){const t=jwtFromValue(store.getItem(store.key(i)));if(t)return t}return '';}
  function tokenRole(token){try{const p=token.split('.')[1].replace(/-/g,'+').replace(/_/g,'/');return String(JSON.parse(atob(p.padEnd(Math.ceil(p.length/4)*4,'='))).role||'').toLowerCase()}catch(_){return '';}}
  function syncAuth(){const t=findToken();if(!t)return '';const r=tokenRole(t);localStorage.setItem('defe_token',t);if(r)localStorage.setItem('defe_role',r);return r;}
  const role=()=>String(localStorage.getItem('defe_role')||syncAuth()||'').toLowerCase();

  function loadAdminBridge(){
    if(!['admin','delegado','tienda'].includes(role()))return;
    if(window.defeEnsureStoreAdmin){window.defeEnsureStoreAdmin();return;}
    if(document.querySelector('script[data-store-admin-bridge-loader]'))return;
    const s=document.createElement('script');
    s.src=API()+'/static/store-admin-bridge.js?v=tienda-admin-v2';
    s.dataset.storeAdminBridgeLoader='1';
    s.onload=()=>setTimeout(()=>window.defeEnsureStoreAdmin?.(),0);
    document.body.appendChild(s);
  }

  function apply(){
    syncAuth();
    if(role()!=='tienda'){loadAdminBridge();return;}
    const admin=document.getElementById('admin');
    const tools=document.getElementById('adminTools');
    if(!admin||!tools){loadAdminBridge();return;}

    // El perfil Tienda ve sólo la operación comercial; no herramientas administrativas globales.
    const store=document.getElementById('storeAdminCard');
    [...tools.children].forEach(el=>{
      const keep=el.id==='storeAdminCard'||el.id==='tiendaProfileHeader'||el.contains?.(store);
      if(!keep){el.dataset.tiendaHidden='1';el.style.display='none';}
    });

    if(store){
      store.style.display='block';
      let title=document.getElementById('tiendaProfileHeader');
      if(!title){
        title=document.createElement('div');title.id='tiendaProfileHeader';title.className='card';title.style.marginBottom='12px';
        title.innerHTML='<div class="row"><div><b>Administración de Tienda</b><div class="meta">Productos, precios, fotos, stock por talle, pedidos y WhatsApp.</div></div><span class="badge">TIENDA</span></div><div class="meta" style="margin-top:8px">El stock se descuenta al confirmar un pedido y se repone si se cancela.</div>';
        tools.insertBefore(title,store);
      }
    }
    loadAdminBridge();
  }

  function init(){
    syncAuth();
    if(!['admin','delegado','tienda'].includes(role()))return;
    loadAdminBridge();apply();
    let scheduled=false;
    new MutationObserver(()=>{if(scheduled)return;scheduled=true;setTimeout(()=>{scheduled=false;apply();},100);}).observe(document.body,{childList:true,subtree:true});
    const oldShow=window.show;
    if(typeof oldShow==='function'&&!oldShow.__tiendaView){
      const wrapped=function(id){const r=oldShow.apply(this,arguments);if(id==='admin')setTimeout(()=>{loadAdminBridge();apply();},80);return r;};
      wrapped.__tiendaView=true;window.show=wrapped;
    }
    window.addEventListener('defe-store-auth-ready',()=>{loadAdminBridge();apply();});
    window.addEventListener('focus',()=>{syncAuth();loadAdminBridge();apply();});
    setTimeout(()=>{loadAdminBridge();apply();},500);
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
