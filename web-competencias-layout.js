// El Defe · Competencias layout autoritativo 2026-09-12
(() => {
  const MARK='DEFE_COMPETENCIAS_LAYOUT_V1';
  let timer=null;
  const babyCats=['Todas','2013','2014','2015','2016','2017','2018','2019'];

  const $=(s,r=document)=>r.querySelector(s);
  const $$=(s,r=document)=>[...r.querySelectorAll(s)];
  const txt=s=>String(s||'').trim();
  const active=b=>!!b&&b.classList.contains('btn');
  const labelComp=c=>c==='ARGENLIGA'?'Argenliga':c==='SUPERLIGA'?'Super Liga':c;
  const subtitleComp=c=>c==='FEFI'?'Baby Fútbol y Futsal +42':c==='LAAMBA'?'Futsal M y F':c==='ARGENLIGA'?'Futsal Masculino':'Futsal Junior';

  function findLegacy(){
    const f=$('#matchFilters');
    if(!f)return null;
    const comp={};
    ['FEFI','LAAMBA','ARGENLIGA','SUPERLIGA'].forEach(c=>comp[c]=f.querySelector(`[data-comp="${c}"]`));
    return {f,comp,status:$$('[data-status]',f),tour:$$('[data-tour]',f),select:$('#matchDivisionFilter',f)};
  }
  function click(el){if(el)el.click();}
  function changeSelect(sel,val){if(!sel||!val||sel.value===val)return;sel.value=val;sel.dispatchEvent(new Event('change',{bubbles:true}));}
  function findDiv(sel,kind){
    if(!sel)return null;
    const opts=[...sel.options].filter(o=>o.value!=='ALL');
    if(kind==='baby')return opts.find(o=>/zona\s*h|baby/i.test(txt(o.textContent)+' '+o.value))||opts.find(o=>/201[3-9]/.test(txt(o.textContent)))||opts[0]||null;
    if(kind==='futsal')return opts.find(o=>/mayores\s*b|\+?42|senior/i.test(txt(o.textContent)+' '+o.value))||null;
    return null;
  }
  function currentComp(l){return Object.entries(l.comp).find(([,b])=>active(b))?.[0]||'FEFI';}
  function currentStatus(l){return l.status.find(active)?.dataset.status||'upcoming';}
  function currentTour(l){return l.tour.find(active)?.dataset.tour||'clausura';}
  function logoFor(btn){return btn?.querySelector('img')?.src||'';}
  function compButton(c,l){
    const on=currentComp(l)===c,src=logoFor(l.comp[c]);
    return `<button type="button" data-ui-comp="${c}" class="defe-league ${on?'on':''}">${src?`<img src="${src}" alt="${labelComp(c)}">`:''}<strong>${labelComp(c)}</strong><small>${subtitleComp(c)}</small></button>`;
  }
  function categoryBlock(c,l){
    const sel=l.select;
    if(c==='FEFI'){
      const fo=findDiv(sel,'futsal');
      const isF=!!(fo&&sel?.value===fo.value);
      const chosen=localStorage.getItem('defe_fefi_baby_category')||'Todas';
      return `<section class="defe-filter-section"><h3>Seleccioná la competencia</h3><div class="defe-two"><button type="button" data-ui-kind="baby" class="${!isF?'on':''}"><b>Baby Fútbol</b><small>FEFI · Zona H</small></button><button type="button" data-ui-kind="futsal" class="${isF?'on':''}"><b>Futsal +42</b><small>FEFI · Mayores B</small></button></div>${!isF?`<h3>Seleccioná la categoría</h3><div class="defe-cats">${babyCats.map(x=>`<button type="button" data-ui-baby="${x}" class="${chosen===x?'on':''}">${x}</button>`).join('')}</div>`:''}</section>`;
    }
    const opts=sel?[...sel.options].filter(o=>o.value!=='ALL'):[];
    if(!opts.length)return '';
    return `<section class="defe-filter-section"><h3>Seleccioná la categoría</h3><div class="defe-cats">${opts.map(o=>`<button type="button" data-ui-div="${o.value}" class="${sel.value===o.value?'on':''}">${txt(o.textContent)}</button>`).join('')}</div></section>`;
  }
  function tournamentBlock(l){
    const ts=l.tour.filter(b=>b.dataset.tour!=='ALL');
    if(!ts.length)return '';
    const cur=currentTour(l);
    return `<section class="defe-filter-section"><h3>Seleccioná el torneo</h3><div class="defe-tours">${ts.map(b=>`<button type="button" data-ui-tour="${b.dataset.tour}" class="${cur===b.dataset.tour?'on':''}">${txt(b.textContent)}</button>`).join('')}</div></section>`;
  }
  function statusBlock(l){
    const cur=currentStatus(l);
    const labels={upcoming:'Próximos',results:'Resultados',standings:'Tabla',stats:'Estadísticas'};
    return `<div class="defe-status">${l.status.filter(b=>labels[b.dataset.status]).map(b=>`<button type="button" data-ui-status="${b.dataset.status}" class="${cur===b.dataset.status?'on':''}">${labels[b.dataset.status]}</button>`).join('')}</div>`;
  }
  function css(){
    if($('#defe-competencias-style'))return;
    const s=document.createElement('style');s.id='defe-competencias-style';s.textContent=`
#matchFilters>[data-defe-legacy-hidden="1"]{display:none!important}
#defe-competencias-ui{background:#fff;border:1px solid #e2e8f0;border-radius:22px;padding:16px;margin-bottom:16px;box-shadow:0 8px 24px rgba(13,59,108,.06);color:#17365f}
#defe-competencias-ui h3{margin:0 0 10px;font-size:15px;font-weight:950}
.defe-leagues{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px;margin-bottom:16px}
.defe-league{border:1px solid #e5ebf2;background:#f7f9fc;border-radius:18px;min-height:126px;padding:10px 6px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:5px;color:#17365f}
.defe-league.on{background:#0b4a8f;color:#fff;border-color:#0b4a8f}.defe-league img{width:64px;height:64px;object-fit:contain}.defe-league strong{font-size:12px}.defe-league small{font-size:8px;line-height:1.2;opacity:.78;text-align:center}
.defe-filter-section{border-top:1px solid #edf1f5;padding-top:14px;margin-top:12px}.defe-two{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:14px}.defe-two button,.defe-cats button,.defe-tours button,.defe-status button{border:0;background:#eef2f7;color:#63748a;border-radius:14px;font-weight:900;padding:12px 8px}.defe-two button.on,.defe-cats button.on,.defe-tours button.on,.defe-status button.on{background:#0b4a8f;color:#fff}.defe-two b{display:block;font-size:15px}.defe-two small{display:block;font-size:9px;margin-top:3px;opacity:.8}
.defe-cats{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:8px}.defe-tours{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px}.defe-status{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px;margin-top:14px}.defe-status button{font-size:15px;min-height:52px}
@media(max-width:390px){.defe-leagues{gap:7px}.defe-league{min-height:116px;padding:8px 4px}.defe-league img{width:56px;height:56px}.defe-cats{grid-template-columns:repeat(4,minmax(0,1fr))}}
`;
    document.head.appendChild(s);
  }
  function bind(root,l){
    $$('[data-ui-comp]',root).forEach(b=>b.onclick=()=>click(l.comp[b.dataset.uiComp]));
    $('[data-ui-kind="baby"]',root)?.addEventListener('click',()=>{const o=findDiv(l.select,'baby');if(o)changeSelect(l.select,o.value);});
    $('[data-ui-kind="futsal"]',root)?.addEventListener('click',()=>{const o=findDiv(l.select,'futsal');if(o)changeSelect(l.select,o.value);});
    $$('[data-ui-baby]',root).forEach(b=>b.onclick=()=>{localStorage.setItem('defe_fefi_baby_category',b.dataset.uiBaby); const t=$('#fefiCategoryTable');if(t){const v=b.dataset.uiBaby==='Todas'?'GENERAL':b.dataset.uiBaby;changeSelect(t,v);} schedule();});
    $$('[data-ui-div]',root).forEach(b=>b.onclick=()=>changeSelect(l.select,b.dataset.uiDiv));
    $$('[data-ui-tour]',root).forEach(b=>b.onclick=()=>click(l.tour.find(x=>x.dataset.tour===b.dataset.uiTour)));
    $$('[data-ui-status]',root).forEach(b=>b.onclick=()=>click(l.status.find(x=>x.dataset.status===b.dataset.uiStatus)));
  }
  function render(){
    const l=findLegacy();if(!l)return;
    css();
    let root=$('#defe-competencias-ui',l.f);if(!root){root=document.createElement('div');root.id='defe-competencias-ui';l.f.prepend(root);}
    [...l.f.children].forEach(ch=>{if(ch!==root)ch.dataset.defeLegacyHidden='1';});
    const c=currentComp(l);
    root.innerHTML=`<h3>Seleccioná la liga</h3><div class="defe-leagues">${['FEFI','LAAMBA','ARGENLIGA','SUPERLIGA'].map(x=>compButton(x,l)).join('')}</div>${categoryBlock(c,l)}${tournamentBlock(l)}${statusBlock(l)}`;
    bind(root,l);
    document.documentElement.dataset.defeCompetenciasLayout=MARK;
  }
  function schedule(){clearTimeout(timer);timer=setTimeout(render,60);}
  function run(){render();new MutationObserver(schedule).observe(document.body,{subtree:true,childList:true,attributes:true,attributeFilter:['class','value']});}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',run,{once:true});else run();
})();
