(() => {
  if (window.__defeSponsorsHomeSync) return;
  window.__defeSponsorsHomeSync = true;
  const API='https://el-defe-v5-production.up.railway.app';
  let rows=[];
  const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));
  const css=document.createElement('style');
  css.textContent=`
  .dsl-strip{display:flex;gap:12px;overflow-x:auto;padding:2px 0 4px;scrollbar-width:none}.dsl-strip::-webkit-scrollbar{display:none}
  .dsl-card{width:108px;min-width:108px;border:0;background:transparent;padding:0;text-align:center;color:#102f55}
  .dsl-logo{height:86px;border:1px solid #dbe4ef;border-radius:16px;background:#fff;display:flex;align-items:center;justify-content:center;overflow:hidden;font-weight:900;font-size:18px;color:#0b3b78}
  .dsl-logo img{width:100%;height:100%;object-fit:contain;padding:7px;box-sizing:border-box}
  .dsl-name{margin-top:8px;font-size:13px;line-height:1.15;font-weight:900;min-height:30px;display:flex;align-items:flex-start;justify-content:center}
  .dsl-rubro{margin-top:3px;font-size:11px;line-height:1.15;color:#7a889b}
  .dsl-empty{font-size:13px;color:#64748b;padding:6px 0 2px}
  @media(max-width:420px){.dsl-card{width:98px;min-width:98px}.dsl-logo{height:80px}}
  `;
  document.head.appendChild(css);

  function isHome(){return !!document.querySelector('.defe-home')&&!document.querySelector('.defe-profile-page')}
  function url(s){return s.primary_url||s.instagram_url||s.website_url||s.facebook_url||s.whatsapp_url||''}
  function leafText(txt){return [...document.querySelectorAll('h1,h2,h3,h4,div,span,p')].find(el=>el.childElementCount===0&&String(el.textContent||'').trim()===txt&&el.offsetParent!==null)}
  function nativeSponsorBox(){
    const h=leafText('Nos acompañan'); if(!h)return null;
    let n=h;
    for(let i=0;i<6&&n?.parentElement;i++,n=n.parentElement){
      const t=String(n.textContent||'');
      if(t.includes('Nos acompañan')&&t.includes('Gracias a quienes hacen posible'))return n;
    }
    return h.parentElement?.parentElement||null;
  }
  function removeStandaloneLive(){document.getElementById('defe-sponsors-live')?.remove()}
  function removeLegacyFutsalPromo(){
    const home=document.querySelector('.defe-home'); if(!home)return;
    const candidates=[...home.querySelectorAll('section,article,div')].filter(el=>{
      const t=String(el.textContent||'').replace(/\s+/g,' ');
      return t.includes('All Boys 0')&&t.includes('Defe')&&t.includes('Tres partidos, tres triunfos');
    });
    if(!candidates.length)return;
    candidates.sort((a,b)=>a.textContent.length-b.textContent.length);
    let target=candidates[0];
    for(let i=0;i<3&&target?.parentElement;i++){
      const p=target.parentElement, t=String(p.textContent||'').replace(/\s+/g,' ');
      if(t.includes('All Boys 0')&&t.includes('Tres partidos, tres triunfos')&&t.length<500){target=p;continue}
      break;
    }
    target?.remove();
  }
  function render(){
    if(!isHome())return;
    removeStandaloneLive();
    const box=nativeSponsorBox(); if(!box)return;
    box.dataset.dynamicSponsors='1';
    box.innerHTML=`
      <div style="display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:6px">
        <h2 style="margin:0;font-size:20px;color:#0b3b78;font-weight:900">Nos acompañan</h2>
        <button type="button" data-all style="border:0;background:transparent;color:#0b3b78;font-weight:800;font-size:14px;padding:4px 0">Ver todos →</button>
      </div>
      <div style="font-size:13px;color:#748196;margin-bottom:14px">Gracias a quienes hacen posible que el Defe siga creciendo.</div>
      ${rows.length?`<div class="dsl-strip">${rows.map(s=>`<button class="dsl-card" type="button" data-id="${Number(s.id)||0}"><span class="dsl-logo">${s.logo_url?`<img src="${esc(s.logo_url)}" alt="${esc(s.name)}">`:esc(s.short_mark||s.name?.slice(0,2)||'SP')}</span><span class="dsl-name">${esc(s.name)}</span><span class="dsl-rubro">${esc(s.category||'Sponsor')}</span></button>`).join('')}</div>`:'<div class="dsl-empty">No hay sponsors activos.</div>'}
    `;
    box.querySelector('[data-all]')?.addEventListener('click',()=>window.defeAcompanantes?.show?.());
    box.querySelectorAll('.dsl-card').forEach(b=>{const s=rows.find(x=>Number(x.id)===Number(b.dataset.id));b.onclick=()=>{const u=s&&url(s);if(u)window.open(u,'_blank','noopener,noreferrer');else window.defeAcompanantes?.show?.()}});
    removeLegacyFutsalPromo();
  }
  async function refresh(){
    try{const r=await fetch(API+'/api/sponsors?ts='+Date.now(),{cache:'no-store'});if(!r.ok)throw new Error();const d=await r.json();rows=Array.isArray(d)?d:[];render()}catch(_){render()}
  }
  document.addEventListener('click',e=>{if(e.target.closest('#defe-sponsors-admin [data-save],#defe-sponsors-admin [data-off]'))setTimeout(refresh,900)},true);
  window.addEventListener('focus',refresh);
  document.addEventListener('visibilitychange',()=>{if(!document.hidden)refresh()});
  setInterval(()=>{if(isHome())render()},700);
  setInterval(()=>{if(isHome())refresh()},5000);
  refresh();
})();
