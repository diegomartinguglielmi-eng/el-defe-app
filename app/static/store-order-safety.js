// El Defe · Confirmaciones de seguridad en Gestión de Tienda
(function(){
  if(window.__defeStoreOrderSafetyLoaded)return;
  window.__defeStoreOrderSafetyLoaded=true;

  document.addEventListener('change',function(e){
    const sel=e.target?.closest?.('[data-order-status]');
    if(!sel)return;
    const next=sel.value;
    if(!['cancelled','delivered'].includes(next))return;

    const id=sel.dataset.orderStatus||'';
    const message=next==='cancelled'
      ? `¿Cancelar el pedido #${id}? Si el stock ya fue descontado, se repondrá automáticamente.`
      : `¿Marcar el pedido #${id} como entregado? Esta acción cierra el pedido.`;

    if(window.confirm(message))return;

    e.preventDefault();
    e.stopImmediatePropagation();
    sel.value='';
  },true);
})();
