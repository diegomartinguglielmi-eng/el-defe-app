(() => {
  if(window.__defeRoleExperience)return; window.__defeRoleExperience=true;
  const API='https://el-defe-v2-staging-production.up.railway.app';
  function jwt(){for(const k of ['defe_token','access_token','token']){const v=localStorage.getItem(k);if(v)return v}return null}
  async function me(){const t=jwt();if(!t)return null;const r=await fetch(API+'/api/me',{headers:{Authorization:'Bearer '+t},cache:'no-store'});return r.ok?r.json():null}
  function apply(u){
    document.documentElement.dataset.defeRole=u?.role||'guest';
    const role=u?.role||'guest';
    document.querySelectorAll('[data-role-only]').forEach(el=>{
      const allowed=(el.dataset.roleOnly||'').split(',').map(x=>x.trim());
      el.hidden=!allowed.includes(role);
    });
    window.dispatchEvent(new CustomEvent('defe:role',{detail:{role,user:u}}));
  }
  me().then(apply).catch(()=>apply(null));
  window.addEventListener('focus',()=>me().then(apply).catch(()=>{}));
})();