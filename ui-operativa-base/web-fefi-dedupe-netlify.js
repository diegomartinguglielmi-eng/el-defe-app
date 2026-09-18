// DEFE_FEFI_DEDUPE_20260916_V5
// Capa visual de Competencias: usa exclusivamente defeCompetenciasApi y evita rerenders en bucle.
(() => {
  const MARK='DEFE_COMPETENCIAS_LAYOUT_V6';
  let timer=null;
  const $=(s,r=document)=>r.querySelector(s), $$=(s,r=document)=>[...r.querySelectorAll(s)];
  const label=c=>c==='ARGENLIGA'?'Argenliga':c==='SUPERLIGA'?'Super Liga':c;
  const sub=c=>c==='FEFI'?'Baby Fútbol y Futsal +42':c==='LAAMBA'?'Futsal y promocionales':c==='ARGENLIGA'?'Futsal Masculino':'Futsal Junior';
  function api(){return window.defeCompetenciasApi;}
  function logoFor(c){const legacy=$(`#matchFilters [data-comp="${c}"] img`);return legacy?.src||'';}
  function ensureCss(){if($('#defe-competencias-style'))return;const s=document.createElement('style');s.id='defe-competencias-style';s.textContent=`
#matchFilters>[data-defe-legacy-controls="1"]{display:none!important}
#defe-competencias-ui{background:#fff;border:1px solid #dfe7f0;border-radius:24px;padding:18px;margin-bottom:16px;box-shadow:0 10px 28px rgba(13,59,108,.07);color:#17365f;overflow:hidden}
#defe-competencias-ui h3{margin:0 0 12px;font-size:15px;font-weight:950}.defe-help{float:right;font-size:10px;color:#60738b;font-weight:700}.defe-leagues{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:9px;margin-bottom:16px;width:100%}.defe-league{position:relative;border:1px solid #e3eaf2;background:#f4f7fb;border-radius:18px;min-width:0;min-height:145px;padding:10px 5px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:6px;color:#17365f;overflow:hidden}.defe-league.on{background:linear-gradient(145deg,#0b4a8f,#0b3a7a);color:#fff;border-color:#0b4a8f;box-shadow:0 8px 20px rgba(11,74,143,.22)}.defe-league img{display:block;width:64px;height:64px;max-width:100%;object-fit:contain}.defe-league strong{font-size:11px;line-height:1.1;text-align:center;white-space:normal}.defe-league small{font-size:8px;line-height:1.15;opacity:.8;text-align:center;white-space:normal}.defe-check{position:absolute;top:7px;right:7px;width:20px;height:20px;border-radius:50%;background:#fff;color:#0b4a8f;display:grid;place-items:center;font-weight:950}.defe-filter-section{border-top:1px solid #edf1f5;padding-top:15px;margin-top:13px}.defe-two,.defe-cats,.defe-tours,.defe-status{display:grid;gap:9px}.defe-two{grid-template-columns:1fr 1fr}.defe-cats{grid-template-columns:repeat(4,minmax(0,1fr))}.defe-tours{grid-template-columns:repeat(3,minmax(0,1fr))}.defe-status{grid-template-columns:repeat(3,minmax(0,1fr));margin-top:17px}.defe-two button,.defe-cats button,.defe-tours button,.defe-status button{border:0;background:#eef2f7;color:#617188;border-radius:14px;font-weight:900;padding:12px 8px;min-height:48px}.defe-two button.on,.defe-cats button.on,.defe-tours button.on,.defe-status button.on{background:linear-gradient(145deg,#1264bd,#0b4a8f);color:#fff;box-shadow:0 7px 16px rgba(11,74,143,.18)}.defe-two button{min-height:70px}.defe-two b{display:block}.defe-two small{display:block;font-size:9px;margin-top:4px;opacity:.8}
@media(max-width:430px){#defe-competencias-ui{padding:14px 12px}.defe-leagues{gap:6px}.defe-league{min-height:124px;padding:8px 3px;border-radius:15px}.defe-league img{width:52px;height:52px}.defe-league strong{font-size:10px}.defe-league small{font-size:7px}.defe-check{width:18px;height:18px;top:5px;right:5px;font-size:11px}.defe-cats{gap:6px}}
`;document.head.appendChild(s);}

  function render(){
    const a=api(),f=$('#matchFilters');
    if(!a||!f)return;
    ensureCss();
    const s=a.snapshot();
    let root=$('#defe-competencias-ui',f);
    if(!root){root=document.createElement('div');root.id='defe-competencias-ui';f.prepend(root);}
    const comps=['FEFI','LAAMBA','ARGENLIGA','SUPERLIGA'];
    const logoMap=Object.fromEntries(comps.map(c=>[c,logoFor(c)]));
    const sig=JSON.stringify(s)+'|'+comps.map(c=>logoMap[c]).join('|');
    if(root.dataset.renderSig===sig&&root.childElementCount)return;

    let html='<h3>Seleccioná la liga <span class="defe-help">Sólo participaciones del Defe</span></h3><div class="defe-leagues">'+comps.map(c=>{const src=logoMap[c];return `<button data-ui-comp="${c}" class="defe-league ${s.competition===c?'on':''}">${src?`<img src="${src}" alt="${label(c)}">`:''}<strong>${label(c)}</strong><small>${sub(c)}</small>${s.competition===c?'<span class="defe-check">✓</span>':''}</button>`;}).join('')+'</div>';
    if(s.competition==='FEFI'){
      const isSenior=/Mayores B|\+42/i.test(s.division);
      html+='<section class="defe-filter-section"><h3>Seleccioná la competencia</h3><div class="defe-two"><button data-ui-div="Zona H" class="'+(!isSenior?'on':'')+'"><b>Baby Fútbol</b><small>FEFI · Zona H</small></button><button data-ui-div="Mayores B · +42" class="'+(isSenior?'on':'')+'"><b>Futsal +42</b><small>FEFI · Mayores B</small></button></div>';
      if(!isSenior)html+='<h3 style="margin-top:14px">Seleccioná la categoría</h3><div class="defe-cats">'+s.fefiCategories.map(c=>`<button data-ui-fefi="${c}" class="${s.fefiCategory===c?'on':''}">${c==='GENERAL'?'Todas':c}</button>`).join('')+'</div>';
      html+='</section>';
    } else if(s.availableDivisions.length){
      html+='<section class="defe-filter-section"><h3>Seleccioná la categoría</h3><div class="defe-cats">'+s.availableDivisions.map(d=>`<button data-ui-div="${d}" class="${s.division===d?'on':''}">${d}</button>`).join('')+'</div></section>';
    }
    if(s.availableTournaments.length)html+='<section class="defe-filter-section"><h3>Seleccioná el torneo</h3><div class="defe-tours">'+s.availableTournaments.map(t=>`<button data-ui-tour="${t}" class="${s.tournament===t?'on':''}">${t[0].toUpperCase()+t.slice(1)}</button>`).join('')+'</div></section>';
    html+='<div class="defe-status">'+[['upcoming','Próximos'],['results','Resultados'],['standings','Tabla']].map(([k,v])=>`<button data-ui-status="${k}" class="${s.status===k?'on':''}">${v}</button>`).join('')+'</div>';

    root.dataset.renderSig=sig;
    root.innerHTML=html;
    $$('[data-ui-comp]',root).forEach(b=>b.onclick=()=>a.setCompetition(b.dataset.uiComp));
    $$('[data-ui-div]',root).forEach(b=>b.onclick=()=>a.setDivision(b.dataset.uiDiv));
    $$('[data-ui-tour]',root).forEach(b=>b.onclick=()=>a.setTournament(b.dataset.uiTour));
    $$('[data-ui-status]',root).forEach(b=>b.onclick=()=>a.setStatus(b.dataset.uiStatus));
    $$('[data-ui-fefi]',root).forEach(b=>b.onclick=()=>a.setFefiCategory(b.dataset.uiFefi));
    document.documentElement.dataset.defeCompetenciasLayout=MARK;
  }

  function schedule(){clearTimeout(timer);timer=setTimeout(render,80);}
  function run(){
    render();
    document.addEventListener('defe:competencias-state',schedule);
    new MutationObserver(schedule).observe(document.body,{subtree:true,childList:true});
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',run,{once:true});else run();
})();
