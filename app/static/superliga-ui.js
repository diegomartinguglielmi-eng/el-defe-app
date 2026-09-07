// El Defe · Super Liga Futsal + navegación deportiva autoritativa
(function(){
  function removeScorers(){
    const home=document.getElementById('scorersHome');
    const section=home?.closest('.section');
    if(section)section.remove();

    const community=document.getElementById('allScorers');
    if(community){
      const heading=community.previousElementSibling;
      if(heading&&heading.tagName==='H2')heading.remove();
      community.remove();
    }
  }

  function loadAuthoritativeMatches(preferredCompetition){
    const target=document.getElementById('allMatches');
    if(target&&!document.getElementById('matchExplorer')){
      target.innerHTML='<div class="card">Cargando agenda completa…</div>';
    }
    let tries=0;
    const run=()=>{
      tries++;
      if(typeof window.defeLoadMatchExplorer==='function'){
        Promise.resolve(window.defeLoadMatchExplorer()).then(()=>{
          if(preferredCompetition){
            setTimeout(()=>document.querySelector(`[data-comp="${preferredCompetition}"]`)?.click(),40);
          }
        });
        return;
      }
      if(tries<80){setTimeout(run,50);return;}
      if(target)target.innerHTML='<div class="card"><b>No se pudo abrir la agenda</b><div class="meta">Volvé a Inicio e intentá nuevamente.</div></div>';
    };
    run();
  }

  function installMatchAuthority(){
    // La función legacy de index.html pintaba nuevamente la agenda vieja.
    // La reemplazamos para que cualquier llamada use siempre el explorador nuevo.
    window.loadMatches=function(){return loadAuthoritativeMatches();};

    // Seguridad adicional: si el usuario toca cualquier acceso a Partidos,
    // mostramos la pantalla y dejamos que el explorador nuevo sea el único renderer.
    document.addEventListener('click',e=>{
      const el=e.target.closest('[onclick]');
      if(!el)return;
      const action=el.getAttribute('onclick')||'';
      if(!/show\(['\"]matches['\"]\)|nav\(['\"]matches['\"]/.test(action))return;
      e.preventDefault();
      e.stopImmediatePropagation();
      document.querySelectorAll('.screen').forEach(x=>x.classList.remove('on'));
      document.getElementById('matches')?.classList.add('on');
      document.querySelectorAll('.nav button').forEach(x=>x.classList.remove('on'));
      document.querySelector('.nav button[onclick*="matches"]')?.classList.add('on');
      window.scrollTo(0,0);
      loadAuthoritativeMatches();
    },true);
  }

  function addSuperLigaCard(){
    const grid=document.querySelector('#home .comp-grid');
    if(!grid||document.getElementById('superLigaHomeCard'))return;
    grid.style.gridTemplateColumns='repeat(2,1fr)';
    const card=document.createElement('div');
    card.id='superLigaHomeCard';
    card.className='comp';
    card.onclick=()=>{
      document.querySelectorAll('.screen').forEach(x=>x.classList.remove('on'));
      document.getElementById('matches')?.classList.add('on');
      document.querySelectorAll('.nav button').forEach(x=>x.classList.remove('on'));
      document.querySelector('.nav button[onclick*="matches"]')?.classList.add('on');
      window.scrollTo(0,0);
      loadAuthoritativeMatches('SUPERLIGA');
    };
    card.innerHTML='<div class="compmark">S</div><b>Super Liga</b><small>Junior A</small>';
    grid.appendChild(card);
  }

  function run(){removeScorers();installMatchAuthority();addSuperLigaCard();}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',run,{once:true});else run();
  setTimeout(()=>{removeScorers();addSuperLigaCard()},500);
})();