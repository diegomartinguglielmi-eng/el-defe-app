(() => {
  if (window.__defeSponsorsHomeSync) return;
  window.__defeSponsorsHomeSync = true;
  const API='https://el-defe-v5-production.up.railway.app';
  let rows=[];
  const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));
  const css=document.createElement('style');
  css.textContent=`#defe-sponsors-live{margin:20px 0 8px;background:#fff;border:1px solid #dbe4ef;border-radius:20px;padding:16px;color:#112f55}#defe-sponsors-live h2{margin:0 0 4px;font-size:21px;color:#0b3b78}#defe-sponsors-live .dsl-sub{font-size:12px;color:#64748b;margin-bottom:14px}.dsl-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}.dsl-card{border:1px solid #e2e8f0;border-radius:14px;background:#fff;padding:10px;display:flex;align-items:center;gap:10px;text-align:left;min-width:0}.dsl-logo{width:58px;height:44px;flex:0 0 58px;border:1px solid #e2e8f0;border-radius:10px;display:flex;align-items:center;justify-content:center;overflow:hidden;background:#fff;color:#0b3b78;font-weight:900}.dsl-logo img{width:100%;height:100%;object-fit:contain}.dsl-name{font-size:13px;font-weight:900;overflow:hidden;text-overflow:ellipsis}.dsl-rubro{font-size:11px;color:#64748b;margin-top:2px}@media(max-width:420px){.dsl-grid{grid-template-columns:1fr 1fr}.dsl-logo{width:48px;height:40px;flex-basis:48px}}`;
  document.head.appendChild(css);
  function isHome(){return !!document.querySelector('.defe-home') && !document.querySelector('.defe-profile-page')}
  function url(s){return s.primary_url||s.instagram_url||s.website_url||s.facebook_url||s.whatsapp_url||''}
  function render(){
    if(!isHome()){document.getElementById('defe-sponsors-live')?.remove();return}
    const home=document.querySelector('.defe-home'); if(!home)return;
    let box=document.getElementById('defe-sponsors-live');
    if(!box){box=document.createElement('section');box.id='defe-sponsors-live';home.appendChild(box)}
    box.innerHTML=`<h2>Nos acompañan</h2><div class="dsl-sub">Sponsors del Club</div><div class="dsl-grid">${rows.map(s=>`<button class="dsl-card" type="button" data-id="${Number(s.id)||0}"><span class="dsl-logo">${s.logo_url?`<img src="${esc(s.logo_url)}" alt="${esc(s.name)}">`:esc(s.short_mark||s.name?.slice(0,2)||'SP')}</span><span><div class="dsl-name">${esc(s.name)}</div><div class="dsl-rubro">${esc(s.category||'Sponsor')}</div></span></button>`).join('')}</div>`;
    box.querySelectorAll('.dsl-card').forEach(b=>{const s=rows.find(x=>Number(x.id)===Number(b.dataset.id));const u=s&&url(s);b.onclick=()=>{if(u)window.open(u,'_blank','noopener,noreferrer')}});
  }
  async function refresh(){
    try{const r=await fetch(API+'/api/sponsors?ts='+Date.now(),{cache:'no-store'});if(!r.ok)throw new Error();const d=await r.json();rows=Array.isArray(d)?d:[];render()}catch(_){/* Si API falla, conservar última lista válida; nunca revivir sponsors fijos. */}
  }
  document.addEventListener('click',e=>{if(e.target.closest('#defe-sponsors-admin [data-save],#defe-sponsors-admin [data-off]'))setTimeout(refresh,900)},true);
  window.addEventListener('focus',refresh);
  document.addEventListener('visibilitychange',()=>{if(!document.hidden)refresh()});
  setInterval(()=>{if(isHome())refresh();else render()},5000);
  setInterval(render,700);
  refresh();
})();
