// El Defe · Tienda visual ampliada
(function(){
  function injectStyles(){
    if(document.getElementById('storeVisualStyles'))return;
    const s=document.createElement('style');s.id='storeVisualStyles';s.textContent=`
      .store-detail-art{height:min(62vh,430px)!important;min-height:340px;position:relative;cursor:zoom-in;background:#eef0f5!important}
      .store-detail-art img{width:100%;height:100%;object-fit:cover;object-position:center;transition:transform .18s ease}
      .store-detail-art:active img{transform:scale(1.015)}
      .store-detail-art.has-photo:after{content:'🔍 Tocar para ampliar';position:absolute;right:12px;bottom:12px;background:rgba(17,21,30,.72);color:#fff;padding:7px 10px;border-radius:999px;font-size:9px;font-weight:900;pointer-events:none;backdrop-filter:blur(5px)}
      .store-lightbox{position:fixed;inset:0;background:rgba(8,10,16,.96);z-index:9999;display:flex;align-items:center;justify-content:center;padding:18px}
      .store-lightbox img{max-width:100%;max-height:88vh;object-fit:contain;border-radius:14px}
      .store-lightbox-close{position:absolute;top:max(18px,env(safe-area-inset-top));right:18px;width:44px;height:44px;border:0;border-radius:50%;background:#fff;color:#111;font-size:24px;font-weight:900}
      .store-lightbox-label{position:absolute;left:18px;right:70px;bottom:max(18px,env(safe-area-inset-bottom));color:#fff;font-size:12px;font-weight:850;text-shadow:0 1px 3px #000}
      @media(max-height:720px){.store-detail-art{height:350px!important;min-height:320px}}
    `;document.head.appendChild(s);
  }
  function markPhoto(){document.querySelectorAll('.store-detail-art').forEach(el=>{if(el.querySelector('img'))el.classList.add('has-photo');});}
  function openLightbox(img){
    const old=document.querySelector('.store-lightbox');if(old)old.remove();
    const box=document.createElement('div');box.className='store-lightbox';
    box.innerHTML=`<button class="store-lightbox-close" aria-label="Cerrar">×</button><img src="${img.src}" alt="${img.alt||'Producto El Defe'}"><div class="store-lightbox-label">${img.alt||'Tienda El Defe'}</div>`;
    const close=()=>box.remove();box.querySelector('button').onclick=close;box.onclick=e=>{if(e.target===box)close();};document.body.appendChild(box);
  }
  function init(){injectStyles();markPhoto();document.addEventListener('click',e=>{const img=e.target.closest?.('.store-detail-art img');if(img){e.preventDefault();openLightbox(img);}},true);const mo=new MutationObserver(markPhoto);mo.observe(document.body,{childList:true,subtree:true});}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();