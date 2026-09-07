// Pegar aquí la URL HTTPS de producción luego del deploy:
window.EL_DEFE_API_URL = "https://el-defe-api-deploy-production.up.railway.app";

document.addEventListener('DOMContentLoaded',()=>{
  const base=window.EL_DEFE_API_URL;
  const load=(name,version)=>new Promise((resolve,reject)=>{
    const s=document.createElement('script');
    s.src=`${base}/static/${name}?v=${version}`;
    s.onload=resolve;
    s.onerror=reject;
    document.body.appendChild(s);
  });

  load('store.js','restore-2')
    .then(()=>load('store-admin-bridge.js','restore-2'))
    .then(()=>Promise.all([
      load('store-settings.js','restore-2'),
      load('store-visual.js','restore-2'),
      load('store-stock.js','restore-2'),
      load('store-orders.js','restore-2'),
      load('store-image-upload.js','restore-2')
    ]))
    .then(()=>{if(typeof window.defeEnsureStoreAdmin==='function')setTimeout(window.defeEnsureStoreAdmin,250);})
    .catch(err=>console.error('No se pudo cargar la Tienda completa',err));
});
