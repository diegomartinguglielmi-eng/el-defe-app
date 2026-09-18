(() => {
  if(window.__defeRoleExperience)return; window.__defeRoleExperience=true;
  const core=window.DefeCore;
  async function me(){if(!core?.token())return null;try{return await core.api('/api/me')}catch(_){return null}}
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