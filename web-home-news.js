// DEFE_HOME_NEWS_AUTO_V2
(function(){
  const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));
  const norm=s=>String(s||'').trim();
  const ymd=d=>{const x=new Date(d);return `${x.getFullYear()}-${String(x.getMonth()+1).padStart(2,'0')}-${String(x.getDate()).padStart(2,'0')}`};
  const today=()=>ymd(new Date());
  const parseDate=s=>{if(!s)return null;const m=String(s).slice(0,10).match(/^(\d{4})-(\d{2})-(\d{2})$/);return m?new Date(+m[1],+m[2]-1,+m[3],12):null};
  const shortDate=s=>{const d=parseDate(s);return d?d.toLocaleDateString('es-AR',{day:'numeric',month:'short'}):''};
  const title=s=>String(s||'').toLowerCase().replace(/(^|[\s.])([a-záéíóúñ])/g,(x,a,b)=>a+b.toUpperCase());
  const matchup=m=>m?.local?`Defe vs ${title(m.rival||'Rival')}`:`${title(m.rival||'Rival')} vs Defe`;

  function flatten(data){
    const out=[];
    for(const liga of (data?.ligas||[])){
      for(const m of (liga.encuentros||[])){
        if(!m?.fecha)continue;
        out.push({...m,leagueId:liga.id,league:liga.nombre||liga.id,tournament:liga.torneo||''});
      }
    }
    return out.sort((a,b)=>String(a.fecha).localeCompare(String(b.fecha)));
  }

  function scoreEntries(m){
    return Object.entries(m?.marc||{}).filter(([,v])=>Array.isArray(v)&&v.length>=2&&Number.isFinite(+v[0])&&Number.isFinite(+v[1]));
  }
  function hasScore(m){return scoreEntries(m).length>0}

  function latestByLeague(completed){
    const map=new Map();
    for(const m of completed)map.set(String(m.leagueId||m.league),m);
    return [...map.values()].sort((a,b)=>String(b.fecha).localeCompare(String(a.fecha)));
  }

  function matchBalance(m){
    const scores=scoreEntries(m);if(!scores.length)return null;
    let w=0,d=0,l=0,gf=0,ga=0;
    for(const [,v] of scores){const a=+v[0],b=+v[1];gf+=a;ga+=b;a>b?w++:a===b?d++:l++}
    if(Array.isArray(m.pts)&&m.pts.length>=2&&Number.isFinite(+m.pts[0])&&Number.isFinite(+m.pts[1])){
      const a=+m.pts[0],b=+m.pts[1];
      if(a!==b)return {badge:'BALANCE DE FECHA',title:a>b?`El Defe ganó la fecha ${a}-${b}`:`La fecha terminó ${a}-${b}`,body:`Ante ${title(m.rival)}: ${w} triunfos, ${d} empates y ${l} derrotas.`};
    }
    return {badge:'ÚLTIMA FECHA',title:matchup(m),body:`Balance deportivo: ${w} ganados, ${d} empatados y ${l} perdidos · goles ${gf}-${ga}.`};
  }

  function bestResult(m){
    const scores=scoreEntries(m);let best=null;
    for(const [cat,v] of scores){const a=+v[0],b=+v[1],diff=a-b;if(diff>0&&(!best||diff>best.diff))best={cat,a,b,diff}}
    if(!best)return null;
    return {badge:'RESULTADO DESTACADO',title:`La ${best.cat} ganó ${best.a}-${best.b}`,body:`Fue la victoria más amplia del último compromiso ante ${title(m.rival)}.`};
  }

  function winningStreak(data){
    let best=null;
    for(const liga of (data?.ligas||[])){
      const done=(liga.encuentros||[]).filter(m=>String(m.fecha||'').slice(0,10)<today()&&hasScore(m)).sort((a,b)=>String(a.fecha).localeCompare(String(b.fecha)));
      const cats=new Set(done.flatMap(m=>scoreEntries(m).map(([c])=>c)));
      for(const cat of cats){
        let streak=0,last=null;
        for(let i=done.length-1;i>=0;i--){
          const v=done[i]?.marc?.[cat];
          if(!Array.isArray(v)||v.length<2)continue;
          if(+v[0]>+v[1]){streak++;last=done[i]}else break;
        }
        if(streak>=3&&(!best||streak>best.streak))best={league:liga.nombre||liga.id,cat,streak,last};
      }
    }
    return best;
  }

  function buildNews(data){
    const t=today();
    const completed=flatten(data).filter(m=>String(m.fecha).slice(0,10)<t&&hasScore(m));
    const cards=[];
    const used=new Set();
    const add=c=>{if(!c||used.has(c.title))return;used.add(c.title);cards.push(c)};

    // 1) Primero, hechos deportivos ya ocurridos. Nunca repetimos el próximo partido de la Home.
    const leagueLatest=latestByLeague(completed);
    for(const m of leagueLatest){
      const b=matchBalance(m);
      if(b)add({kind:'result',...b,eyebrow:`${m.league} · ${shortDate(m.fecha)}`,date:m.fecha});
      if(cards.length>=2)break;
    }

    // 2) Rachas: son noticias distintas al fixture y se actualizan solas con cada resultado.
    const streak=winningStreak(data);
    if(streak)add({kind:'streak',badge:'RACHA DESTACADA',eyebrow:`${streak.league} · ${streak.cat}`,title:`${streak.streak} triunfos consecutivos`,body:`La categoría ${streak.cat} mantiene una racha de ${streak.streak} victorias seguidas.`,date:streak.last?.fecha});

    // 3) Si aún falta contenido, destacar el mejor resultado de la última fecha disponible.
    if(cards.length<3&&completed.length){
      const last=completed[completed.length-1],h=bestResult(last);
      if(h)add({kind:'highlight',...h,eyebrow:`${last.league} · ${shortDate(last.fecha)}`,date:last.fecha});
    }

    // 4) Completar, si hace falta, con resultados recientes de otras ligas; nunca con futuros partidos.
    if(cards.length<3){
      for(let i=completed.length-1;i>=0&&cards.length<3;i--){
        const m=completed[i],h=bestResult(m);if(!h)continue;
        add({kind:'highlight',...h,eyebrow:`${m.league} · ${shortDate(m.fecha)}`,date:m.fecha});
      }
    }

    return cards.slice(0,3);
  }

  function card(c){
    const palette=c.kind==='streak'?['#7c3aed','#fff']:c.kind==='highlight'?['#0ea5e9','#fff']:['#16a34a','#fff'];
    const icon=c.kind==='streak'?'🔥':c.kind==='highlight'?'⚽':'🏆';
    return `<article class="defe-auto-news-card">
      <div class="defe-auto-news-art ${c.kind}"><span>${icon}</span></div>
      <div class="defe-auto-news-body">
        <span class="defe-auto-news-badge" style="background:${palette[0]};color:${palette[1]}">${esc(c.badge)}</span>
        <div class="defe-auto-news-eye">${esc(c.eyebrow)}</div>
        <h3>${esc(c.title)}</h3>
        <p>${esc(c.body)}</p>
        <button type="button" onclick="window.defeOpenCompetencias&&window.defeOpenCompetencias()">Ver detalle <b>›</b></button>
      </div>
    </article>`;
  }

  function findNewsSection(){
    const nodes=[...document.querySelectorAll('h1,h2,h3')];
    return nodes.find(n=>/^Novedades$/i.test((n.textContent||'').trim())&&!n.closest('#defe-auto-news'))?.closest('section')||null;
  }

  function ensureStyle(){
    if(document.getElementById('defe-auto-news-style'))return;
    const st=document.createElement('style');st.id='defe-auto-news-style';st.textContent=`
      .defe-auto-news-wrap{margin-top:18px;margin-bottom:22px}.defe-auto-news-head{display:flex;align-items:center;justify-content:space-between;gap:10px;margin-bottom:10px}.defe-auto-news-head h2{margin:0;color:#102f57;font-size:22px}.defe-auto-news-fresh{font-size:11px;color:#64748b;display:flex;align-items:center;gap:6px}.defe-auto-news-fresh:before{content:'';width:8px;height:8px;border-radius:50%;background:#22c55e}.defe-auto-news-grid{display:grid;grid-template-columns:repeat(3,minmax(230px,1fr));gap:12px;overflow-x:auto;scroll-snap-type:x mandatory;padding-bottom:3px}.defe-auto-news-card{scroll-snap-align:start;background:#fff;border:1px solid #dbe2ea;border-radius:18px;overflow:hidden;min-width:230px;box-shadow:0 4px 16px rgba(15,47,87,.06)}.defe-auto-news-art{height:90px;display:grid;place-items:center;background:linear-gradient(145deg,#0f5132,#198754);position:relative;overflow:hidden}.defe-auto-news-art.streak{background:linear-gradient(145deg,#4c1d95,#7c3aed)}.defe-auto-news-art.highlight{background:linear-gradient(145deg,#075985,#0ea5e9)}.defe-auto-news-art:after{content:'';position:absolute;inset:auto -15px -35px auto;width:110px;height:110px;border:2px solid rgba(255,255,255,.15);border-radius:50%}.defe-auto-news-art span{font-size:38px}.defe-auto-news-body{padding:12px}.defe-auto-news-badge{display:inline-flex;border-radius:999px;padding:4px 8px;font-weight:800;font-size:9px;letter-spacing:.35px}.defe-auto-news-eye{margin-top:9px;color:#0b3a7a;font-size:10px;font-weight:800}.defe-auto-news-body h3{font-size:16px;line-height:1.15;color:#102f57;margin:5px 0}.defe-auto-news-body p{font-size:12px;line-height:1.35;color:#718096;margin:0;min-height:48px}.defe-auto-news-body button{margin-top:10px;width:100%;border:0;background:#eef5ff;color:#0b3a7a;border-radius:999px;padding:8px 11px;font-weight:800;text-align:left;display:flex;justify-content:space-between}.defe-goal-nav svg,.defe-goal-nav img{display:none!important}.defe-goal-nav .defe-goal-icon{display:block!important;width:25px;height:25px;margin:0 auto 3px;background-size:contain;background-position:center;background-repeat:no-repeat;background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 64 64' fill='none' stroke='%230b3a7a' stroke-width='5' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M10 14h44v34M10 14v34M10 48l9-7M54 48l-9-7M17 19l6 22M47 19l-6 22M23 25h18M20 34h24'/%3E%3Ccircle cx='32' cy='43' r='10'/%3E%3C/svg%3E")}
      @media(max-width:700px){.defe-auto-news-grid{grid-template-columns:repeat(3,82%)}.defe-auto-news-head h2{font-size:20px}}
    `;document.head.appendChild(st);
  }

  function patchNav(){
    const buttons=[...document.querySelectorAll('button,a')].filter(x=>/Competencias/i.test((x.textContent||'').trim()));
    for(const b of buttons){if(!b.closest('nav')&&!b.closest('[class*=nav]'))continue;b.classList.add('defe-goal-nav');if(!b.querySelector('.defe-goal-icon')){const i=document.createElement('span');i.className='defe-goal-icon';b.insertBefore(i,b.firstChild)}}
  }
  function openCompetencias(){const b=[...document.querySelectorAll('button,a')].find(x=>/Competencias/i.test((x.textContent||'').trim()));if(b){b.click();return}if(typeof window.nav==='function')window.nav('matches');else if(typeof window.show==='function')window.show('matches')}

  async function render(){
    ensureStyle();patchNav();
    let data;try{const r=await fetch('/el-defe-app/datos.json',{cache:'no-store'});if(!r.ok)throw new Error();data=await r.json()}catch{return}
    const cards=buildNews(data);
    const original=findNewsSection();if(!original)return;
    original.style.display='none';
    let host=document.getElementById('defe-auto-news');if(!host){host=document.createElement('section');host.id='defe-auto-news';host.className='defe-auto-news-wrap';original.insertAdjacentElement('afterend',host)}
    host.innerHTML=cards.length?`<div class="defe-auto-news-head"><h2>Novedades</h2><span class="defe-auto-news-fresh">Actualizado automáticamente</span></div><div class="defe-auto-news-grid">${cards.map(card).join('')}</div>`:`<div class="defe-auto-news-head"><h2>Novedades</h2><span class="defe-auto-news-fresh">Actualizado automáticamente</span></div><div style="color:#718096;font-size:13px;padding:8px 0">Sin novedades deportivas nuevas para destacar.</div>`;
  }

  window.defeOpenCompetencias=openCompetencias;window.defeRefreshAutoNews=render;
  let busy=false;const kick=()=>{if(busy)return;busy=true;setTimeout(()=>{busy=false;render()},120)};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>{render();setTimeout(render,900)},{once:true});else{render();setTimeout(render,900)}
  const obs=new MutationObserver(kick);obs.observe(document.documentElement,{subtree:true,childList:true});document.addEventListener('visibilitychange',()=>{if(!document.hidden)render()});
})();
