// El Defe · Super Liga Futsal + limpieza de goleadores
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

  function addSuperLigaCard(){
    const grid=document.querySelector('#home .comp-grid');
    if(!grid||document.getElementById('superLigaHomeCard'))return;
    grid.style.gridTemplateColumns='repeat(2,1fr)';
    const card=document.createElement('div');
    card.id='superLigaHomeCard';
    card.className='comp';
    card.onclick=()=>{if(window.show)window.show('matches');setTimeout(()=>{
      const button=document.querySelector('[data-comp="SUPERLIGA"]');
      if(button)button.click();
    },180)};
    card.innerHTML='<div class="compmark">S</div><b>Super Liga</b><small>Junior A</small>';
    grid.appendChild(card);
  }

  function run(){removeScorers();addSuperLigaCard();}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',run,{once:true});else run();
  setTimeout(run,500);
})();