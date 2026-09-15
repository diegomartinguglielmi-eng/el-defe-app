// El Defe · estabilizador de login PWA 2026-09-15
(() => {
  const MARK='DEFE_LOGIN_STABILIZER_V1';
  function install(){
    document.documentElement.dataset.defeLoginStabilizer=MARK;
    // El sincronizador legacy reinicia la PWA luego del login. La sesión ya se
    // persiste en localStorage por web-ui-hotfix, por lo que no debe navegar.
    try { window.defeSyncStoreAuth = () => true; } catch (_) {}
  }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',install,{once:true});
  else install();
})();
