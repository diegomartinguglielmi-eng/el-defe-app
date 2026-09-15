// DEFE_HOME_NEWS_AUTO_V3
(function(){
  const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot',"'":'&#039;'}[c]));
  const ymd=d=>{const x=new Date(d);return `${x.getFullYear()}-${String(x.getMonth()+1).padStart(2,'0')}-${String(x.getDate()).padStart(2,'0')}`};
  const today=()=>ymd(new Date());
  const parseDate=s=>{if(!s)return null;const m=String(s).slice(0,10).match(/^(\d{4})-(\d{2})-(\d{2})$/);return m?new Date(+m[1],+m[2]-1,+m[3],12):null};
  const shortDate=s=>{const d=parseDate(s);return d?d.toLocaleDateString('es-AR',{day:'numeric',month:'short'}):''};
  const title=s=>String(s||'').toLowerCase().replace(/(^|[\s.])([a-záéíóúñ])/g,(x,a,b)=>a+b.toUpperCase());
  const matchup=m=>m?.local?`Defe vs ${title(m.rival||'Rival')}`:`${title(m.rival||'Rival')} vs Defe`;
  const leagueKey=x=>String(x?.leagueId||x?.league||'').toUpperCase();

  function flatten(data){
    const out=[];
    for(const liga of (data?.ligas||[])){
      for(const m of (liga.encuentros||[])){
        if(!m?.fecha)continue;
        out.push({...m,leagueId:liga.id,league:liga.nombre||liga.id,tournament:liga.torneo||'',connected:liga.conectada!==false});
      }
    }
    return out.sort((a,b)=>String(a.fecha).localeCompare(String(b.fecha)));
  }

  function scoreEntries(m){
    return Object.entries(m?.marc||{}).filter(([,v])=>Array.isArray(v)&&v.length>=2&&Number.isFinite(+v[0])&&Number.isFinite(+v[1]));
  }
  function hasScore(m){return scoreEntries(m).length>0}

  function matchStats(m){
    const scores=scoreEntries(m);if(!scores.length)return null;
    let w=0,d=0,l=0,gf=0,ga=0,best=null;
    for(const [cat,v] of scores){
      const a=+v[0],b=+v[1],diff=a-b;gf+=a;ga+=b;
      a>b?w++:a===b?d++:l++;
      if(diff>0&&(!best||diff>best.diff))best={cat,a,b,diff};
    }
    return {w,d,l,gf,ga,best,total:scores.length};
  }

  function newsForMatch(m){
    const s=matchStats(m);if(!s)return null;
    const league=m.league||m.leagueId||'Competencia';
    const date=shortDate(m.fecha);
    if(Array.isArray(m.pts)&&m.pts.length>=2&&Number.isFinite(+m.pts[0])&&Number.isFinite(+m.pts[1])){
      const a=+m.pts[0],b=+m.pts[1];
      if(a>b)return {kind:'result',importance:90+(a-b),leagueKey:leagueKey(m),badge:'FECHA DESTACADA',eyebrow:`${league} · ${date}`,title:`El Defe ganó la fecha ${a}-${b}`,body:`Ante ${title(m.rival)}: ${s.w} triunfos, ${s.d} empates y ${s.l} derrotas.`,date:m.fecha};
    }
    if(s.best&&s.best.diff>=3){
      return {kind:'highlight',importance:80+s.best.diff,leagueKey:leagueKey(m),badge:'RESULTADO DESTACADO',eyebrow:`${league} · ${date}`,title:`${s.best.cat}: triunfo ${s.best.a}-${s.best.b}`,body:`Fue uno de los resultados sobresalientes de la última fecha ante ${title(m.rival)}.`,date:m.fecha};
    }
    if(s.w>s.l){
      return {kind:'result',importance:70+(s.w-s.l),leagueKey:leagueKey(m),badge:'BUENA FECHA',eyebrow:`${league} · ${date}`,title:matchup(m),body:`Balance positivo: ${s.w} ganados, ${s.d} empatados y ${s.l} perdidos.`,date:m.fecha};
    }
    return {kind:'summary',importance:50,leagueKey:leagueKey(m),badge:'ÚLTIMA FECHA',eyebrow:`${league} · ${date}`,title:matchup(m),body:`Balance: ${s.w} ganados, ${s.d} empatados y ${s.l} perdidos · goles ${s.gf}-${s.ga}.`,date:m.fecha};
  }

  function streakCandidates(data){
    const out=[];
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
        if(streak>=3)out.push({kind:'streak',importance:95+streak,leagueKey:String(liga.id||liga.nombre||'').toUpperCase(),badge:'RACHA DESTACADA',eyebrow:`${liga.nombre||liga.id} · ${cat}`,title:`${streak} triunfos consecutivos`,body:`La categoría ${cat} mantiene una racha de ${streak} victorias seguidas.`,date:last?.fecha});
      }
    }
    return out;
  }

  function buildNews(data){
    const t=today();
    const completed=flatten(data).filter(m=>String(m.fecha).slice(0,10)<t&&hasScore(m));
    const latestPerLeague=new Map();
    for(const m of completed)latestPerLeague.set(leagueKey(m),m);

    const candidates=[];
    for(const m of latestPerLeague.values()){
      const c=newsForMatch(m);if(c)candidates.push(c);
    }
    candidates.push(...streakCandidates(data));

    // Primero recencia; a igual recencia, importancia deportiva.
    candidates.sort((a,b)=>String(b.date||'').localeCompare(String(a.date||''))||(+b.importance||0)-(+a.importance||0));

    // Garantizar presencia de todas las competencias con datos recientes antes de repetir liga.
    const cards=[],usedTitles=new Set(),usedLeagues=new Set();
    for(const c of candidates){
      if(usedTitles.has(c.title)||usedLeagues.has(c.leagueKey))continue;
      cards.push(c);usedTitles.add(c.title);usedLeagues.add(c.leagueKey);
    }
    // Después permitir noticias adicionales realmente destacadas (rachas, goleadas) aunque repitan liga.
    for(const c of candidates){
      if(cards.length>=6)break;
      if(usedTitles.has(c.title))continue;
      if((c.importance||0)<80)continue;
      cards.push(c);usedTitles.add(c.title);
    }
    return cards.slice(0,6);
  }

  function card(c){
    const palette=c.kind==='streak'?['#7c3aed','#fff']:c.kind==='highlight'?['#0ea5e9','#fff']:c.kind==='summary'?['#475569','#fff']:['#16a34a','#fff'];
    const icon=c.kind==='streak'?'🔥':c.kind==='highlight'?'⚽':c.kind==='summary'?'📊':'🏆';
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
      .defe-auto-news-wrap{margin-top:18px;margin-bottom:22px}.defe-auto-news-head{display:flex;align-items:center;justify-content:space-between;gap:10px;margin-bottom:10px}.defe-auto-news-head h2{margin:0;color:#102f57;font-size:22px}.defe-auto-news-fresh{font-size:11px;color:#64748b;display:flex;align-items:center;gap:6px}.defe-auto-news-fresh:before{content:'';width:8px;height:8px;border-radius:50%;background:#22c55e}.defe-auto-news-grid{display:grid;grid-template-columns:repeat(6,minmax(230px,1fr));gap:12px;overflow-x:auto;scroll-snap-type:x mandatory;padding-bottom:3px}.defe-auto-news-card{scroll-snap-align:start;background:#fff;border:1px solid #dbe2ea;border-radius:18px;overflow:hidden;min-width:230px;box-shadow:0 4px 16px rgba(15,47,87,.06)}.defe-auto-news-art{height:90px;display:grid;place-items:center;background:linear-gradient(145deg,#0f5132,#198754);position:relative;overflow:hidden}.defe-auto-news-art.streak{background:linear-gradient(145deg,#4c1d95,#7c3aed)}.defe-auto-news-art.highlight{background:linear-gradient(145deg,#075985,#0ea5e9)}.defe-auto-news-art.summary{background:linear-gradient(145deg,#334155,#64748b)}.defe-auto-news-art:after{content:'';position:absolute;inset:auto -15px -35px auto;width:110px;height:110px;border:2px solid rgba(255,255,255,.15);border-radius:50%}.defe-auto-news-art span{font-size:38px}.defe-auto-news-body{padding:12px}.defe-auto-news-badge{display:inline-flex;border-radius:999px;padding:4px 8px;font-weight:800;font-size:9px;letter-spacing:.35px}.defe-auto-news-eye{margin-top:9px;color:#0b3a7a;font-size:10px;font-weight:800}.defe-auto-news-body h3{font-size:16px;line-height:1.15;color:#102f57;margin:5px 0}.defe-auto-news-body p{font-size:12px;line-height:1.35;color:#718096;margin:0;min-height:48px}.defe-auto-news-body button{margin-top:10px;width:100%;border:0;background:#eef5ff;color:#0b3a7a;border-radius:999px;padding:8px 11px;font-weight:800;text-align:left;display:flex;justify-content:space-between}.defe-goal-nav svg,.defe-goal-nav img{display:none!important}.defe-goal-nav .defe-goal-icon{display:block!important;width:25px;height:25px;margin:0 auto 3px;background-size:contain;background-position:center;background-repeat:no-repeat;background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 64 64' fill='none' stroke='%230b3a7a' stroke-width='5' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M10 14h44v34M10 14v34M10 48l9-7M54 48l-9-7M17 19l6 22M47 19l-6 22M23 25h18M20 34h24'/%3E%3Ccircle cx='32' cy='43' r='10'/%3E%3C/svg%3E")}
      @media(max-width:700px){.defe-auto-news-grid{grid-template-columns:repeat(6,82%)}.defe-auto-news-head h2{font-size:20px}}
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
    host.innerHTML=cards.length?`<div class="defe-auto-news-head"><h2>Novedades</h2><span class="defe-auto-news-fresh">Lo más nuevo de todas las competencias</span></div><div class="defe-auto-news-grid">${cards.map(card).join('')}</div>`:`<div class="defe-auto-news-head"><h2>Novedades</h2><span class="defe-auto-news-fresh">Actualizado automáticamente</span></div><div style="color:#718096;font-size:13px;padding:8px 0">Todavía no hay resultados nuevos para destacar.</div>`;
  }

  window.defeOpenCompetencias=openCompetencias;window.defeRefreshAutoNews=render;
  let busy=false;const kick=()=>{if(busy)return;busy=true;setTimeout(()=>{busy=false;render()},120)};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>{render();setTimeout(render,900)},{once:true});else{render();setTimeout(render,900)}
  const obs=new MutationObserver(kick);obs.observe(document.documentElement,{subtree:true,childList:true});document.addEventListener('visibilitychange',()=>{if(!document.hidden)render()});
})();
