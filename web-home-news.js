// DEFE_HOME_NEWS_AUTO_V1
(function(){
  const CLUB=/DEFENSORES|DEF\. DE SANTOS LUGARES|DEFENSORES DE SL|DEF\. DE STOS?\. LUGARES/i;
  const BLUE='#0b3a7a';
  const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));
  const norm=s=>String(s||'').trim();
  const ymd=d=>{const x=new Date(d);return `${x.getFullYear()}-${String(x.getMonth()+1).padStart(2,'0')}-${String(x.getDate()).padStart(2,'0')}`};
  const today=()=>ymd(new Date());
  const parseDate=s=>{if(!s)return null;const m=String(s).slice(0,10).match(/^(\d{4})-(\d{2})-(\d{2})$/);return m?new Date(+m[1],+m[2]-1,+m[3],12):null};
  const niceDate=s=>{const d=parseDate(s);return d?d.toLocaleDateString('es-AR',{weekday:'long',day:'numeric',month:'long'}):''};
  const shortDate=s=>{const d=parseDate(s);return d?d.toLocaleDateString('es-AR',{day:'numeric',month:'short'}):''};
  const clubLabel='Defe';

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

  function hasScore(m){
    const vals=Object.values(m?.marc||{});
    return vals.some(v=>Array.isArray(v)&&v.length>=2&&Number.isFinite(+v[0])&&Number.isFinite(+v[1]));
  }

  function matchup(m){
    const r=norm(m?.rival)||'Rival a confirmar';
    return m?.local?`${clubLabel} vs ${title(r)}`:`${title(r)} vs ${clubLabel}`;
  }
  function title(s){return String(s||'').toLowerCase().replace(/(^|[\s.])([a-záéíóúñ])/g,(x,a,b)=>a+b.toUpperCase())}

  function latestHighlight(m){
    const scores=Object.entries(m?.marc||{}).filter(([,v])=>Array.isArray(v)&&v.length>=2&&Number.isFinite(+v[0])&&Number.isFinite(+v[1]));
    if(!scores.length)return null;
    let best=null;
    for(const [cat,v] of scores){
      const a=+v[0],b=+v[1],diff=a-b;
      if(diff>0&&(!best||diff>best.diff))best={cat,a,b,diff};
    }
    if(best)return {eyebrow:'Resultado destacado',title:`La ${best.cat} se impuso ${best.a}-${best.b}`,body:`Fue el resultado más amplio de la última fecha ante ${title(m.rival)}.`};
    const wins=scores.filter(([,v])=>+v[0]>+v[1]).length;
    const draws=scores.filter(([,v])=>+v[0]===+v[1]).length;
    const losses=scores.length-wins-draws;
    return {eyebrow:'Última fecha',title:matchup(m),body:`Balance: ${wins} ganados, ${draws} empatados y ${losses} perdidos.`};
  }

  function buildNews(data){
    const all=flatten(data),t=today();
    const current=all.filter(m=>String(m.fecha).slice(0,10)===t&&!hasScore(m));
    const future=all.filter(m=>String(m.fecha).slice(0,10)>t&&!hasScore(m));
    const past=all.filter(m=>String(m.fecha).slice(0,10)<t&&hasScore(m));
    const cards=[];

    if(current[0]){
      const m=current[0];
      cards.push({kind:'today',badge:'HOY JUEGA',eyebrow:`${esc(m.league)} · Fecha ${esc(m.nro??'')}`,title:matchup(m),body:`Hoy${m.sede?' en '+title(m.sede):''}. ${Array.isArray(m.horarios)?'Horarios confirmados.':'Consultá Competencias para horarios y detalles.'}`,date:m.fecha});
    }

    if(future[0]){
      const m=future[0];
      cards.push({kind:'next',badge:'PRÓXIMO PARTIDO',eyebrow:`${esc(m.league)} · Fecha ${esc(m.nro??'')}`,title:matchup(m),body:`${niceDate(m.fecha)}${m.sede?' · '+title(m.sede):''}.`,date:m.fecha});
    }

    const last=past[past.length-1];
    if(last){
      const h=latestHighlight(last);
      if(h)cards.push({kind:'result',badge:'RESULTADOS',eyebrow:`${esc(last.league)} · ${shortDate(last.fecha)}`,title:h.title,body:h.body,date:last.fecha});
    }

    // Si no hay partido hoy, completar con otra próxima fecha relevante.
    if(!current.length&&future[1]&&cards.length<3){
      const m=future[1];
      cards.splice(1,0,{kind:'next',badge:'PRÓXIMAMENTE',eyebrow:`${esc(m.league)} · Fecha ${esc(m.nro??'')}`,title:matchup(m),body:`${niceDate(m.fecha)}${m.sede?' · '+title(m.sede):''}.`,date:m.fecha});
    }
    return cards.slice(0,3);
  }

  function card(c){
    const badgeBg=c.kind==='today'?'#0ea5e9':c.kind==='result'?'#16a34a':'#dbeafe';
    const badgeFg=c.kind==='next'?'#0b5db7':'#fff';
    const icon=c.kind==='result'?'⚽':c.kind==='today'?'🏟️':'📅';
    return `<article class="defe-auto-news-card">
      <div class="defe-auto-news-art ${c.kind}"><span>${icon}</span></div>
      <div class="defe-auto-news-body">
        <span class="defe-auto-news-badge" style="background:${badgeBg};color:${badgeFg}">${esc(c.badge)}</span>
        <div class="defe-auto-news-eye">${c.eyebrow}</div>
        <h3>${esc(c.title)}</h3>
        <p>${esc(c.body)}</p>
        <button type="button" onclick="window.defeOpenCompetencias&&window.defeOpenCompetencias()">Ver más <b>›</b></button>
      </div>
    </article>`;
  }

  function findNewsSection(){
    const nodes=[...document.querySelectorAll('h1,h2,h3,div,section')];
    return nodes.find(n=>/^Novedades$/i.test((n.textContent||'').trim()))?.closest('section')||null;
  }

  function ensureStyle(){
    if(document.getElementById('defe-auto-news-style'))return;
    const st=document.createElement('style');st.id='defe-auto-news-style';st.textContent=`
      .defe-auto-news-wrap{margin-top:18px;margin-bottom:22px}.defe-auto-news-head{display:flex;align-items:center;justify-content:space-between;gap:10px;margin-bottom:10px}.defe-auto-news-head h2{margin:0;color:#102f57;font-size:22px}.defe-auto-news-fresh{font-size:11px;color:#64748b;display:flex;align-items:center;gap:6px}.defe-auto-news-fresh:before{content:'';width:8px;height:8px;border-radius:50%;background:#22c55e}.defe-auto-news-grid{display:grid;grid-template-columns:repeat(3,minmax(230px,1fr));gap:12px;overflow-x:auto;scroll-snap-type:x mandatory;padding-bottom:3px}.defe-auto-news-card{scroll-snap-align:start;background:#fff;border:1px solid #dbe2ea;border-radius:18px;overflow:hidden;min-width:230px;box-shadow:0 4px 16px rgba(15,47,87,.06)}.defe-auto-news-art{height:90px;display:grid;place-items:center;background:linear-gradient(145deg,#0b3a7a,#0f5ca8);position:relative;overflow:hidden}.defe-auto-news-art.next{background:linear-gradient(145deg,#183f75,#3568a4)}.defe-auto-news-art.result{background:linear-gradient(145deg,#0f5132,#198754)}.defe-auto-news-art:after{content:'';position:absolute;inset:auto -15px -35px auto;width:110px;height:110px;border:2px solid rgba(255,255,255,.15);border-radius:50%}.defe-auto-news-art span{font-size:38px;filter:grayscale(1) brightness(3)}.defe-auto-news-body{padding:12px}.defe-auto-news-badge{display:inline-flex;border-radius:999px;padding:4px 8px;font-weight:800;font-size:9px;letter-spacing:.35px}.defe-auto-news-eye{margin-top:9px;color:#0b3a7a;font-size:10px;font-weight:800}.defe-auto-news-body h3{font-size:16px;line-height:1.15;color:#102f57;margin:5px 0}.defe-auto-news-body p{font-size:12px;line-height:1.35;color:#718096;margin:0;min-height:48px}.defe-auto-news-body button{margin-top:10px;width:100%;border:0;background:#eef5ff;color:#0b3a7a;border-radius:999px;padding:8px 11px;font-weight:800;text-align:left;display:flex;justify-content:space-between}.defe-goal-nav svg,.defe-goal-nav img{display:none!important}.defe-goal-nav .defe-goal-icon{display:block!important;width:25px;height:25px;margin:0 auto 3px;background-size:contain;background-position:center;background-repeat:no-repeat;background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 64 64' fill='none' stroke='%230b3a7a' stroke-width='5' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M10 14h44v34M10 14v34M10 48l9-7M54 48l-9-7M17 19l6 22M47 19l-6 22M23 25h18M20 34h24'/%3E%3Ccircle cx='32' cy='43' r='10'/%3E%3C/svg%3E")}
      @media(max-width:700px){.defe-auto-news-grid{grid-template-columns:repeat(3,82%)}.defe-auto-news-head h2{font-size:20px}}
    `;document.head.appendChild(st);
  }

  function patchNav(){
    const buttons=[...document.querySelectorAll('button,a')].filter(x=>/Competencias/i.test((x.textContent||'').trim()));
    for(const b of buttons){
      if(!b.closest('nav')&&!b.closest('[class*=nav]'))continue;
      b.classList.add('defe-goal-nav');
      if(!b.querySelector('.defe-goal-icon')){const i=document.createElement('span');i.className='defe-goal-icon';b.insertBefore(i,b.firstChild)}
    }
  }

  function openCompetencias(){
    const b=[...document.querySelectorAll('button,a')].find(x=>/Competencias/i.test((x.textContent||'').trim()));
    if(b){b.click();return}
    if(typeof window.nav==='function')window.nav('matches');
    else if(typeof window.show==='function')window.show('matches');
  }

  async function render(){
    ensureStyle();patchNav();
    let data;try{const r=await fetch('/el-defe-app/datos.json',{cache:'no-store'});if(!r.ok)throw new Error();data=await r.json()}catch{return}
    const cards=buildNews(data);if(!cards.length)return;
    const original=findNewsSection();
    if(!original)return;
    original.style.display='none';
    let host=document.getElementById('defe-auto-news');
    if(!host){host=document.createElement('section');host.id='defe-auto-news';host.className='defe-auto-news-wrap';original.insertAdjacentElement('afterend',host)}
    host.innerHTML=`<div class="defe-auto-news-head"><h2>Novedades</h2><span class="defe-auto-news-fresh">Actualizado automáticamente</span></div><div class="defe-auto-news-grid">${cards.map(card).join('')}</div>`;
  }

  window.defeOpenCompetencias=openCompetencias;
  window.defeRefreshAutoNews=render;
  let busy=false;const kick=()=>{if(busy)return;busy=true;setTimeout(()=>{busy=false;render()},120)};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>{render();setTimeout(render,900)},{once:true});else{render();setTimeout(render,900)}
  const obs=new MutationObserver(kick);obs.observe(document.documentElement,{subtree:true,childList:true});
  document.addEventListener('visibilitychange',()=>{if(!document.hidden)render()});
})();
