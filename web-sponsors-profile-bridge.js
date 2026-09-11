(() => {
  if(window.__defeSponsorsProfileBridge)return;
  window.__defeSponsorsProfileBridge=true;

  function jwtFromValue(value){
    if(!value||typeof value!=='string')return null;
    const m=value.match(/eyJ[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+/);
    if(m)return m[0];
    try{
      const p=JSON.parse(value);
      if(typeof p==='string')return jwtFromValue(p);
      if(p&&typeof p==='object')for(const v of Object.values(p)){
        const f=jwtFromValue(typeof v==='string'?v:JSON.stringify(v));
        if(f)return f;
      }
    }catch(_){}
    return null;
  }
  function token(){
    for(const st of [localStorage,sessionStorage])for(let i=0;i<st.length;i++){
      const t=jwtFromValue(st.getItem(st.key(i)));if(t)return t;
    }
    return null;
  }
  function role(){
    try{
      const t=token();if(!t)return '';
      const p=t.split('.')[1].replace(/-/g,'+').replace(/_/g,'/');
      return JSON.parse(atob(p.padEnd(Math.ceil(p.length/4)*4,'='))).role||'';
    }catch(_){return ''}
  }
  function profileHost(){
    const direct=document.getElementById('prefsBox')||document.getElementById('profile');
    if(direct)return direct;
    const title=[...document.querySelectorAll('h1,h2,h3,div,span')].find(el=>el.childElementCount===0&&String(el.textContent||'').trim()==='Mi Defe');
    if(!title)return null;
    let n=title.parentElement;
    for(let i=0;i<5&&n?.parentElement;i++,n=n.parentElement){
      if(n.querySelectorAll('button,input,select').length)return n;
    }
    return title.parentElement;
  }
  function mount(){
    const old=document.querySelector('[data-defe-sponsors-profile]');
    if(role()!=='admin'){old?.remove();return}
    const host=profileHost();if(!host||old)return;
    const box=document.createElement('div');
    box.dataset.defeSponsorsProfile='1';
    box.style.cssText='background:#fff;border:1px solid #dbe4ef;border-radius:16px;padding:14px;margin:12px 0;box-shadow:0 4px 14px #0000000d';
    box.innerHTML='<b style="display:block;color:#0b3b78;margin-bottom:5px">Sponsors</b><div style="font-size:12px;color:#64748b;margin-bottom:10px">Alta, edición, logos, orden y redes sociales.</div><button type="button" style="width:100%;border:0;border-radius:12px;padding:11px;background:#0b3b78;color:#fff;font-weight:900">🤝 Gestionar Sponsors</button>';
    box.querySelector('button').onclick=()=>window.defeAcompanantes?.openAdmin?.();
    host.appendChild(box);
  }
  mount();
  window.addEventListener('focus',mount);
  document.addEventListener('visibilitychange',()=>{if(!document.hidden)mount()});
  setInterval(mount,800);
})();
