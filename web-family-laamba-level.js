(()=>{
const API='https://el-defe-v5-production.up.railway.app';
let laamba={};
const originalFetch=window.fetch.bind(window);

async function catalog(){
  if(Object.keys(laamba).length)return laamba;
  const r=await originalFetch(API+'/api/family/catalog');
  if(!r.ok)throw new Error('No se pudo cargar el catálogo LAAMBA');
  const d=await r.json();
  const row=(d.competitions||[]).find(x=>x.competition==='LAAMBA');
  laamba=Object.fromEntries((row?.branches||[]).map(x=>[x.branch,x.categories||[]]));
  return laamba;
}

function esc(s){return String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]))}
function splitStored(v){const p=String(v||'').split('·').map(x=>x.trim());return p.length>1?p:['','']}

async function enhance(league){
  const grid=league.closest('.df-grid');
  if(!grid)return;
  const category=grid.querySelector('[data-category]');
  if(!category)return;
  const parent=grid.parentElement;
  const extras=[...(parent?.querySelectorAll(':scope > [data-laamba-extra]')||[])];
  let existing=extras[0]||null;
  extras.slice(1).forEach(x=>x.remove());
  if(league.value!=='LAAMBA'){
    extras.forEach(x=>x.remove());
    category.dataset.laambaBranch='';
    const label=category.closest('label');
    if(label)label.childNodes[0].textContent='Categoría / división';
    return;
  }
  const map=await catalog();
  let branch='',division='';
  const stored=splitStored(category.value);
  if(stored[0]){branch=stored[0];division=stored[1]}
  else if(map[category.value])branch=category.value;
  const branches=Object.keys(map);
  category.innerHTML='<option value="">Seleccionar…</option>'+branches.map(x=>`<option value="${esc(x)}" ${x===branch?'selected':''}>${esc(x)}</option>`).join('');
  category.dataset.laambaBranch='1';
  const label=category.closest('label');
  if(label)label.childNodes[0].textContent='Rama';
  let extra=existing;
  if(!extra){
    extra=document.createElement('div');extra.dataset.laambaExtra='1';extra.className='df-grid';
    extra.innerHTML='<label>Categoría<select data-laamba-category></select></label><div></div>';
    grid.after(extra);
    const sel=extra.querySelector('select');
    sel.style.cssText='box-sizing:border-box;width:100%;padding:12px;border:1px solid #d7dee7;border-radius:12px;margin-top:5px;font:inherit;background:#fff';
    extra.querySelector('label').style.cssText='font-size:12px;font-weight:800;color:#17365d';
    extra.style.cssText='display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:10px';
  }
  const third=extra.querySelector('[data-laamba-category]');
  const sync=()=>{const root=grid.parentElement;const save=root?.querySelector('[data-save],[data-ok]');if(save)save.disabled=!(category.value&&third.value)};
  const fill=()=>{const vals=map[category.value]||[];third.innerHTML='<option value="">Seleccionar…</option>'+vals.map(x=>`<option value="${esc(x)}" ${x===division?'selected':''}>${esc(x)}</option>`).join('');third.disabled=!category.value;sync()};
  category.onchange=()=>{division='';fill()};third.onchange=sync;fill();
}

const realFetch=window.fetch;
window.fetch=async function(input,init={}){
  try{
    const url=typeof input==='string'?input:(input?.url||'');
    if(init?.body && /\/api\/availability\/family\/children(?:\/\d+\/teams)?$/.test(url) && (init.method||'GET').toUpperCase()==='POST'){
      const body=JSON.parse(init.body);
      if(body.competition==='LAAMBA' && !String(body.category||'').includes('·')){
        const visible=[...document.querySelectorAll('[data-league]')].find(x=>x.value==='LAAMBA'&&x.offsetParent!==null);
        const grid=visible?.closest('.df-grid');
        const branch=grid?.querySelector('[data-category]')?.value;
        const division=grid?.parentElement?.querySelector('[data-laamba-category]')?.value;
        if(!branch||!division)throw new Error('Elegí rama y categoría de LAAMBA.');
        body.category=`${branch} · ${division}`;init={...init,body:JSON.stringify(body)};
      }
    }
  }catch(e){return Promise.reject(e)}
  return realFetch(input,init);
};

let busy=false;
async function scan(){if(busy)return;busy=true;try{
  document.querySelectorAll('[data-league]').forEach(l=>{const g=l.closest('.df-grid'),p=g?.parentElement;if(p){const xs=[...p.querySelectorAll(':scope > [data-laamba-extra]')];xs.slice(1).forEach(x=>x.remove())}});
  for(const l of document.querySelectorAll('[data-league]')){if(l.value==='LAAMBA'&&!l.dataset.laambaEnhanced){l.dataset.laambaEnhanced='1';await enhance(l)}if(!l.dataset.laambaWatch){l.dataset.laambaWatch='1';l.addEventListener('change',()=>{l.dataset.laambaEnhanced='';setTimeout(()=>enhance(l).catch(console.error),0)})}}
}finally{busy=false}}
new MutationObserver(()=>scan().catch(console.error)).observe(document.documentElement,{childList:true,subtree:true});
setInterval(()=>scan().catch(console.error),700);scan().catch(console.error);
})();