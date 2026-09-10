// El Defe · Vista restringida para el perfil Tienda
(function(){
  if(window.__defeStoreRoleViewLoaded)return;
  window.__defeStoreRoleViewLoaded=true;
  const role=()=>localStorage.getItem('defe_role')||'';

  function apply(){
    if(role()!=='tienda')return;
    const admin=document.getElementById('admin');
    const tools=document.getElementById('adminTools');
    if(!admin||!tools)return;

    // El operador de Tienda no debe ver herramientas administrativas ajenas.
    [...tools.children].forEach(el=>{
      const keep=el.id==='storeAdminCard' || el.contains?.(document.getElementById('storeAdminCard'));
      if(!keep){el.dataset.tiendaHidden='1';el.style.display='none';}
    });

    const store=document.getElementById('storeAdminCard');
    if(store){
      store.style.display='block';
      let title=document.getElementById('tiendaProfileHeader');
      if(!title){
        title=document.createElement('div');title.id='tiendaProfileHeader';title.className='card';
        title.style.marginBottom='12px';
        title.innerHTML='<div class="row"><div><b>Operación de Tienda</b><div class="meta">Pedidos, stock, productos y recepción de mercadería.</div></div><span class="badge">TIENDA</span></div>';
        tools.insertBefore(title,store);
      }
    }
  }

  function init(){
    if(role()!=='tienda')return;
    apply();
    new MutationObserver(apply).observe(document.body,{childList:true,subtree:true});
    const oldShow=window.show;
    if(typeof oldShow==='function'&&!oldShow.__tiendaView){
      const wrapped=function(id){const r=oldShow.apply(this,arguments);if(id==='admin')setTimeout(apply,80);return r;};
      wrapped.__tiendaView=true;window.show=wrapped;
    }
    setTimeout(apply,500);
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();