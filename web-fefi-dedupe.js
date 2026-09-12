// DEFE_FEFI_DEDUPE_20260912_V2
// Layout autoritativo de Competencias: 1 logo por liga, FEFI Baby fijo en Zona H y visual pulida.
(() => {
  const MARK='DEFE_COMPETENCIAS_LAYOUT_V3';
  let timer=null;
  const babyCats=['Todas','2013','2014','2015','2016','2017','2018','2019'];
  const $=(s,r=document)=>r.querySelector(s);
  const $$=(s,r=document)=>[...r.querySelectorAll(s)];
  const txt=s=>String(s||'').trim();
  const active=b=>!!b&&b.classList.contains('btn');
  const labelComp=c=>c==='ARGENLIGA'?'Argenliga':c==='SUPERLIGA'?'Super Liga':c;
  const subtitleComp=c=>c==='FEFI'?'Baby Fútbol y Futsal +42':c==='LAAMBA'?'Futsal M y F':c==='ARGENLIGA'?'Futsal Masculino':'Futsal Junior';
  const SUPERLIGA_LOGO='data:image/svg+xml;charset=UTF-8,'+encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120"><rect width="120" height="120" rx="20" fill="#fff"/><circle cx="60" cy="60" r="43" fill="none" stroke="#18b7d5" stroke-width="4"/><circle cx="60" cy="60" r="34" fill="none" stroke="#18b7d5" stroke-width="2"/><text x="60" y="28" text-anchor="middle" font-family="Arial" font-size="8" font-weight="700" fill="#18b7d5">SUPER LIGA FUTSAL</text><path d="M43 51l17-10 17 10-6 20H49z" fill="none" stroke="#18b7d5" stroke-width="3"/><path d="M62 48l-9 13h8l-4 13 12-17h-8z" fill="#18b7d5"/><text x="60" y="96" text-anchor="middle" font-family="Arial" font-size="10" font-weight="800" fill="#18b7d5">SLF</text></svg>`);

  function findLegacy(){
    const f=$('#matchFilters'); if(!f)return null;
    const comp={}; ['FEFI','LAAMBA','ARGENLIGA','SUPERLIGA'].forEach(c=>comp[c]=f.querySelector(`[data-comp="${c}"]`));
    return {f,comp,status:$$('[data-status]',f),tour:$$('[data-tour]',f),select:$('#matchDivisionFilter',f)};
  }
  function click(el){if(el)el.click();}
  function changeSelect(sel,val){if(!sel||!val||sel.value===val)return;sel.value=val;sel.dispatchEvent(new Event('change',{bubbles:true}));}
  function findDiv(sel,kind){
    if(!sel)return null; const opts=[...sel.options].filter(o=>o.value!=='ALL');
    if(kind==='baby')return opts.find(o=>/zona\s*h|baby/i.test(txt(o.textContent)+' '+o.value))||opts[0]||null;
    if(kind==='futsal')return opts.find(o=>/mayores\s*b|\+?42|senior/i.test(txt(o.textContent)+' '+o.value))||null;
    return null;
  }
  function currentComp(l){return Object.entries(l.comp).find(([,b])=>active(b))?.[0]||'FEFI';}
  function currentStatus(l){return l.status.find(active)?.dataset.status||'upcoming';}
  function currentTour(l){return l.tour.find(active)?.dataset.tour||'clausura';}
  function logoFor(c,l){
    if(c==='SUPERLIGA')return SUPERLIGA_LOGO;
    return l.comp[c]?.querySelector('img')?.src||'';
  }
  function compButton(c,l){
    const on=currentComp(l)===c,src=logoFor(c,l);
    return `<button type="button" data-ui-comp="${c}" class="defe-league ${on?'on':''}">${src?`<img src="${src}" alt="${labelComp(c)}">`:''}<strong>${labelComp(c)}</strong><small>${subtitleComp(c)}</small>${on?'<span class="defe-check">✓</span>':''}</button>`;
  }
  function categoryBlock(c,l){
    const sel=l.select;
    if(c==='FEFI'){
      const fo=findDiv(sel,'futsal'); const isF=!!(fo&&sel?.value===fo.value);
      const chosen=localStorage.getItem('defe_fefi_baby_category')||'Todas';
      return `<section class="defe-filter-section"><h3>Seleccioná la competencia</h3><div class="defe-two"><button type="button" data-ui-kind="baby" class="${!isF?'on':''}"><span class="defe-ico">👥</span><span><b>Baby Fútbol</b><small>FEFI · Zona H</small></span>${!isF?'<i>✓</i>':''}</button><button type="button" data-ui-kind="futsal" class="${isF?'on':''}"><span class="defe-ico">⚽</span><span><b>Futsal +42</b><small>FEFI · Mayores B</small></span>${isF?'<i>✓</i>':''}</button></div>${!isF?`<h3>Seleccioná la categoría</h3><div class="defe-cats">${babyCats.map(x=>`<button type="button" data-ui-baby="${x}" class="${chosen===x?'on':''}">${x}</button>`).join('')}</div>`:''}</section>`;
    }
    const opts=sel?[...sel.options].filter(o=>o.value!=='ALL'):[];
    if(!opts.length)return '';
    return `<section class="defe-filter-section"><h3>Seleccioná la categoría</h3><div class="defe-cats">${opts.map(o=>`<button type="button" data-ui-div="${o.value}" class="${sel.value===o.value?'on':''}">${txt(o.textContent)}</button>`).join('')}</div></section>`;
  }
  function tournamentBlock(l){
    const ts=l.tour.filter(b=>b.dataset.tour!=='ALL'); if(!ts.length)return '';
    const cur=currentTour(l);
    return `<section class="defe-filter-section"><h3>Seleccioná el torneo</h3><div class="defe-tours">${ts.map(b=>`<button type="button" data-ui-tour="${b.dataset.tour}" class="${cur===b.dataset.tour?'on':''}">${txt(b.textContent)}</button>`).join('')}</div></section>`;
  }
  function statusBlock(l){
    const cur=currentStatus(l); const labels={upcoming:'Próximos',results:'Resultados',standings:'Tabla',stats:'Estadísticas'};
    const icons={upcoming:'▣',results:'🏆',standings:'▥',stats:'◫'};
    const rows=l.status.filter(b=>labels[b.dataset.status]);
    return `<div class="defe-status" style="grid-template-columns:repeat(${Math.max(3,rows.length)},minmax(0,1fr))">${rows.map(b=>`<button type="button" data-ui-status="${b.dataset.status}" class="${cur===b.dataset.status?'on':''}"><span>${icons[b.dataset.status]||''}</span>${labels[b.dataset.status]}</button>`).join('')}</div>`;
  }
  function ensureCss(){
    if($('#defe-competencias-style'))$('#defe-competencias-style').remove();
    const s=document.createElement('style'); s.id='defe-competencias-style'; s.textContent=`
#matchFilters>[data-defe-legacy-hidden="1"]{display:none!important}
#defe-competencias-ui{background:#fff;border:1px solid #dfe7f0;border-radius:24px;padding:18px;margin-bottom:16px;box-shadow:0 10px 28px rgba(13,59,108,.07);color:#17365f}
#defe-competencias-ui h3{margin:0 0 12px;font-size:16px;font-weight:950;letter-spacing:-.2px}.defe-help{float:right;font-size:10px;color:#60738b;font-weight:700}
.defe-leagues{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px;margin-bottom:18px}.defe-league{position:relative;border:1px solid #e3eaf2;background:#f4f7fb;border-radius:19px;min-height:150px;padding:12px 7px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:6px;color:#17365f;box-shadow:0 4px 12px rgba(20,54,95,.035)}.defe-league.on{background:linear-gradient(145deg,#0b4a8f,#0b3a7a);color:#fff;border-color:#0b4a8f;box-shadow:0 8px 20px rgba(11,74,143,.22)}.defe-league img{width:70px;height:70px;object-fit:contain}.defe-league strong{font-size:13px}.defe-league small{font-size:8px;line-height:1.22;opacity:.8;text-align:center}.defe-check{position:absolute;top:8px;right:8px;width:24px;height:24px;border-radius:50%;background:#fff;color:#0b4a8f;display:grid;place-items:center;font-weight:950}
.defe-filter-section{border-top:1px solid #edf1f5;padding-top:16px;margin-top:14px}.defe-two{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:16px}.defe-two button,.defe-cats button,.defe-tours button,.defe-status button{border:0;background:#eef2f7;color:#617188;border-radius:15px;font-weight:900;padding:13px 9px;box-shadow:inset 0 0 0 1px rgba(255,255,255,.35)}.defe-two button.on,.defe-cats button.on,.defe-tours button.on,.defe-status button.on{background:linear-gradient(145deg,#1264bd,#0b4a8f);color:#fff;box-shadow:0 7px 16px rgba(11,74,143,.18)}.defe-two button{display:flex;align-items:center;justify-content:center;gap:10px;min-height:76px;position:relative}.defe-two b{display:block;font-size:16px}.defe-two small{display:block;font-size:9px;margin-top:4px;opacity:.8}.defe-two i{font-style:normal;position:absolute;right:12px;font-size:18px}.defe-ico{font-size:22px}.defe-cats{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:9px}.defe-cats button{min-height:50px;font-size:13px}.defe-tours{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px}.defe-tours button{min-height:50px;font-size:14px}.defe-status{display:grid;gap:10px;margin-top:18px}.defe-status button{font-size:15px;min-height:58px;display:flex;align-items:center;justify-content:center;gap:8px}.defe-status button span{font-size:17px}
@media(max-width:390px){#defe-competencias-ui{padding:15px}.defe-leagues{gap:7px}.defe-league{min-height:136px;padding:9px 4px}.defe-league img{width:60px;height:60px}.defe-league strong{font-size:12px}.defe-cats{gap:6px}.defe-two b{font-size:14px}}
`; document.head.appendChild(s);
  }
  function bind(root,l){
    $$('[data-ui-comp]',root).forEach(b=>b.onclick=()=>click(l.comp[b.dataset.uiComp]));
    $('[data-ui-kind="baby"]',root)?.addEventListener('click',()=>{const o=findDiv(l.select,'baby');if(o)changeSelect(l.select,o.value);});
    $('[data-ui-kind="futsal"]',root)?.addEventListener('click',()=>{const o=findDiv(l.select,'futsal');if(o)changeSelect(l.select,o.value);});
    $$('[data-ui-baby]',root).forEach(b=>b.onclick=()=>{localStorage.setItem('defe_fefi_baby_category',b.dataset.uiBaby);const t=$('#fefiCategoryTable');if(t){const v=b.dataset.uiBaby==='Todas'?'GENERAL':b.dataset.uiBaby;changeSelect(t,v);}schedule();});
    $$('[data-ui-div]',root).forEach(b=>b.onclick=()=>changeSelect(l.select,b.dataset.uiDiv));
    $$('[data-ui-tour]',root).forEach(b=>b.onclick=()=>click(l.tour.find(x=>x.dataset.tour===b.dataset.uiTour)));
    $$('[data-ui-status]',root).forEach(b=>b.onclick=()=>click(l.status.find(x=>x.dataset.status===b.dataset.uiStatus)));
  }
  function render(){
    const l=findLegacy(); if(!l||!l.comp.FEFI)return; ensureCss();
    let root=$('#defe-competencias-ui',l.f); if(!root){root=document.createElement('div');root.id='defe-competencias-ui';l.f.prepend(root);} [...l.f.children].forEach(ch=>{if(ch!==root)ch.dataset.defeLegacyHidden='1';});
    const c=currentComp(l);
    // En Baby FEFI se fija exclusivamente Zona H; no se expone selector de zonas.
    if(c==='FEFI'){
      const futsal=findDiv(l.select,'futsal'); const isF=!!(futsal&&l.select?.value===futsal.value);
      if(!isF){const baby=findDiv(l.select,'baby'); if(baby&&l.select?.value!==baby.value)setTimeout(()=>changeSelect(l.select,baby.value),0);}
    }
    root.innerHTML=`<h3>Seleccioná la liga <span class="defe-help">Elegí la liga para ver sus competencias</span></h3><div class="defe-leagues">${['FEFI','LAAMBA','ARGENLIGA','SUPERLIGA'].map(x=>compButton(x,l)).join('')}</div>${categoryBlock(c,l)}${tournamentBlock(l)}${statusBlock(l)}`;
    bind(root,l); document.documentElement.dataset.defeCompetenciasLayout=MARK;
  }
  function schedule(){clearTimeout(timer);timer=setTimeout(render,90);}
  function run(){render();new MutationObserver(schedule).observe(document.body,{subtree:true,childList:true,attributes:true,attributeFilter:['class','value']});}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',run,{once:true});else run();
})();
