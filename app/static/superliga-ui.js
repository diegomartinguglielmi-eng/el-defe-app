// El Defe · Agenda deportiva autoritativa sobre la pantalla React real · deploy 2026-09-12
(function(){
  const API='https://el-defe-v5-production.up.railway.app';
  window.EL_DEFE_API_URL=window.EL_DEFE_API_URL||API;
  let mounting=false;
  let observer=null;

  function visible(el){
    if(!el)return false;
    const s=getComputedStyle(el),r=el.getBoundingClientRect();
    return s.display!=='none'&&s.visibility!=='hidden'&&r.width>0&&r.height>0;
  }

  function partidosScreen(){
    const title=[...document.querySelectorAll('.defe-topbar-title')].find(el=>visible(el)&&String(el.textContent||'').trim().toUpperCase()==='PARTIDOS');
    if(!title)return null;
    let root=title.closest('.mx-auto');
    if(!root){
      root=title;
      for(let i=0;i<4&&root;i++)root=root.parentElement;
    }
    if(!root||root.children.length<2)return null;
    return {root,content:root.children[1]};
  }

  function installStyles(){
    if(document.getElementById('defe-authoritative-matches-style'))return;
    const style=document.createElement('style');
    style.id='defe-authoritative-matches-style';
    style.textContent=`
      #allMatches{padding:14px 14px 112px;min-height:560px;background:#f5f7fb;color:#132642}
      #matchExplorer .card{background:#fff;border:1px solid #dfe5ee;border-radius:18px;padding:14px;margin-bottom:12px;box-shadow:0 1px 2px rgba(12,41,79,.03)}
      #matchExplorer .row{display:flex;justify-content:space-between;gap:10px;align-items:center}
      #matchExplorer .teams{display:grid;grid-template-columns:1fr auto 1fr;gap:10px;align-items:center}
      #matchExplorer .team{font-weight:800;font-size:14px}.team.r{text-align:right}
      #matchExplorer .score{font-weight:950;font-size:16px;color:#0b3a7a}.score.vs{font-size:12px}
      #matchExplorer .meta{color:#77869a;font-size:12px;margin-top:7px}
      #matchExplorer .badge{display:inline-block;padding:4px 7px;border-radius:999px;background:#edf3fb;color:#0b3a7a;font-size:10px;font-weight:900}
      #matchExplorer .date{color:#6c7b90;font-size:11px;font-weight:700}
      #matchExplorer button,#matchExplorer .light{border:0;border-radius:11px;padding:10px 8px;font-weight:800;background:#edf1f7;color:#5f6f86}
      #matchExplorer button.btn{background:#0b3a7a;color:white}
      #matchExplorer select{width:100%;border:1px solid #d9e0ea;border-radius:12px;padding:11px 10px;background:white;color:#17365f;font-weight:700}
      #matchExplorer .sectop{display:flex;align-items:center;justify-content:space-between;gap:10px;margin:14px 0 8px}
      #matchExplorer .sectop h2{margin:0;color:#17365f;font-size:18px;font-weight:900}
    `;
    document.head.appendChild(style);
  }

  function renderLoading(content){
    content.dataset.defeAuthoritativeMatches='1';
    content.innerHTML='<div id="allMatches"><div style="background:#fff;border:1px solid #dfe5ee;border-radius:18px;padding:16px;font-weight:800;color:#17365f">Cargando partidos…</div></div>';
  }

  function mount(){
    const screen=partidosScreen();
    if(!screen||mounting)return;
    if(screen.content.dataset.defeAuthoritativeMatches==='1'&&screen.content.querySelector('#matchExplorer'))return;
    mounting=true;
    installStyles();
    renderLoading(screen.content);
    let tries=0;
    const launch=()=>{
      tries++;
      if(typeof window.defeLoadMatchExplorer==='function'){
        Promise.resolve(window.defeLoadMatchExplorer()).catch(err=>{
          const t=document.getElementById('allMatches');
          if(t)t.innerHTML='<div class="card"><b>No se pudo cargar la agenda</b><div class="meta">'+String(err?.message||err)+'</div></div>';
        }).finally(()=>{mounting=false;});
        return;
      }
      if(tries<100){setTimeout(launch,50);return;}
      mounting=false;
      const t=document.getElementById('allMatches');
      if(t)t.innerHTML='<div class="card"><b>No se pudo cargar la agenda</b></div>';
    };
    launch();
  }

  function schedule(){setTimeout(mount,80);}

  function run(){
    installStyles();
    document.addEventListener('click',schedule,true);
    observer=new MutationObserver(schedule);
    observer.observe(document.getElementById('app')||document.body,{subtree:true,childList:true});
    window.addEventListener('popstate',schedule);
    window.addEventListener('hashchange',schedule);
    schedule();
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',run,{once:true});else run();
})();