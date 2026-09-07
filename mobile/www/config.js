// Pegar aquí la URL HTTPS de producción luego del deploy:
window.EL_DEFE_API_URL = "https://el-defe-api-deploy-production.up.railway.app";

document.addEventListener('DOMContentLoaded',()=>{
  const s=document.createElement('script');
  s.src=window.EL_DEFE_API_URL+'/static/store-ui.js?v=2';
  s.defer=true;
  document.body.appendChild(s);
});
