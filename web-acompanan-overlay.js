(() => {
  const sponsors = [
    {name:'JM Distribuidora', rubro:'Distribución', logo:'JM', note:'Acompaña al Defe y ayuda a sostener las actividades del club.'},
    {name:'Wimer', rubro:'Servicios', logo:'W', note:'Acompaña al Defe y ayuda a sostener las actividades del club.'},
    {name:'La Milagrosa Papelería', rubro:'Papelería', logo:'LM', note:'Acompaña al Defe y ayuda a sostener las actividades del club.'},
    {name:'Matafuegos CADECI', rubro:'Seguridad', logo:'MC', note:'Acompaña al Defe y ayuda a sostener las actividades del club.'},
    {name:'VA', rubro:'Servicios', logo:'VA', note:'Acompaña al Defe y ayuda a sostener las actividades del club.'},
    {name:'Shop Ferretero', rubro:'Ferretería', logo:'SF', note:'Acompaña al Defe y ayuda a sostener las actividades del club.'},
    {name:'Ascensores Pastorino', rubro:'Ascensores', logo:'AP', note:'Acompaña al Defe y ayuda a sostener las actividades del club.'},
    {name:'Lo de Abru', rubro:'Beauty Bar', logo:'LA', note:'Acompaña al Defe y ayuda a sostener las actividades del club.'}
  ];

  const css = document.createElement('style');
  css.textContent = `
    #defe-acompanan-launch{margin:18px 28px 12px;background:#fff;border:1px solid #dbe4ef;border-radius:18px;padding:16px;box-shadow:0 5px 18px #12325b12}
    #defe-acompanan-launch .da-head{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:12px}
    #defe-acompanan-launch h3{margin:0;color:#102f59;font-size:20px}.da-link{border:0;background:none;color:#0b4d91;font-weight:800;font-size:14px}
    .da-logos{display:flex;gap:10px;overflow:auto;padding-bottom:2px}.da-logo{min-width:82px;height:72px;border:1px solid #dce5ef;border-radius:13px;background:#fff;display:flex;align-items:center;justify-content:center;color:#0b3b78;font-weight:900;font-size:18px;padding:7px;text-align:center}
    #defe-acompanan-modal{position:fixed;inset:0;background:#f5f7fb;z-index:2147482500;overflow:auto;color:#112f55;font-family:inherit}.da-top{position:sticky;top:0;background:#0b3b78;color:#fff;padding:18px 18px 16px;display:flex;align-items:center;gap:14px;z-index:2}.da-back{border:0;background:#ffffff18;color:#fff;border-radius:50%;width:40px;height:40px;font-size:22px}.da-title{font-size:23px;font-weight:900}.da-sub{padding:18px 20px 4px;color:#65758b}.da-list{padding:12px 18px 100px;display:grid;gap:12px}.da-card{background:#fff;border:1px solid #dbe4ef;border-radius:16px;padding:13px;display:flex;align-items:center;gap:13px;box-shadow:0 4px 14px #12325b0c}.da-mark{width:64px;height:64px;border-radius:13px;border:1px solid #dbe4ef;display:flex;align-items:center;justify-content:center;font-weight:900;color:#0b3b78;background:#f9fbfe}.da-info{flex:1}.da-name{font-weight:900;font-size:17px}.da-rubro{font-size:13px;color:#718096;margin-top:4px}.da-arrow{font-size:24px;color:#0b3b78}.da-detail{padding:26px 20px}.da-detail .da-mark{width:110px;height:110px;margin:20px auto;font-size:27px}.da-detail h2{text-align:center;margin:8px 0}.da-detail p{text-align:center;color:#64748b;line-height:1.5}.da-actions{display:grid;gap:10px;margin-top:24px}.da-action{border:0;border-radius:12px;padding:14px;background:#0b3b78;color:#fff;font-weight:800;font-size:16px}.da-note{text-align:center;padding:22px;color:#0b3b78;font-weight:800}
  `;
  document.head.appendChild(css);

  function detail(s){
    const m=document.getElementById('defe-acompanan-modal');
    m.innerHTML=`<div class="da-top"><button class="da-back" id="da-detail-back">‹</button><div class="da-title">Nos acompañan</div></div><div class="da-detail"><div class="da-mark">${s.logo}</div><h2>${s.name}</h2><p>${s.rubro}</p><p>${s.note}</p><div class="da-actions"><button class="da-action" disabled>Web / Instagram / WhatsApp · a cargar</button></div><div class="da-note">Gracias por acompañar al Defe</div></div>`;
    document.getElementById('da-detail-back').onclick=show;
  }
  function show(){
    let m=document.getElementById('defe-acompanan-modal');if(!m){m=document.createElement('div');m.id='defe-acompanan-modal';document.body.appendChild(m)}
    m.innerHTML=`<div class="da-top"><button class="da-back" id="da-close">‹</button><div class="da-title">Nos acompañan</div></div><div class="da-sub">Empresas y comercios que acompañan al Defe.</div><div class="da-list">${sponsors.map((s,i)=>`<button class="da-card" data-i="${i}"><div class="da-mark">${s.logo}</div><div class="da-info"><div class="da-name">${s.name}</div><div class="da-rubro">${s.rubro}</div></div><div class="da-arrow">›</div></button>`).join('')}</div>`;
    document.getElementById('da-close').onclick=()=>m.remove();
    m.querySelectorAll('.da-card').forEach(b=>b.onclick=()=>detail(sponsors[+b.dataset.i]));
  }
  function mount(){
    if(document.getElementById('defe-acompanan-launch'))return;
    const root=document.getElementById('root');if(!root)return;
    const nav=[...document.querySelectorAll('nav,footer,[class*=bottom],[class*=Bottom]')].find(x=>x.getBoundingClientRect().bottom>innerHeight-100);
    const box=document.createElement('section');box.id='defe-acompanan-launch';box.innerHTML=`<div class="da-head"><h3>Nos acompañan</h3><button class="da-link">Ver todos →</button></div><div class="da-logos">${sponsors.slice(0,6).map(s=>`<button class="da-logo" title="${s.name}">${s.logo}</button>`).join('')}</div>`;
    box.querySelector('.da-link').onclick=show;box.querySelectorAll('.da-logo').forEach((b,i)=>b.onclick=()=>{show();detail(sponsors[i])});
    if(nav&&nav.parentNode)nav.parentNode.insertBefore(box,nav);else root.appendChild(box);
  }
  const mo=new MutationObserver(()=>mount());mo.observe(document.body,{childList:true,subtree:true});
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mount,{once:true});else mount();
  window.defeAcompanantes={show,sponsors};
})();