(() => {
  const sponsors=[
    {name:'JM Distribuidora',rubro:'Distribución',logo:'JM'},
    {name:'Wimer',rubro:'Servicios',logo:'W'},
    {name:'La Milagrosa Papelería',rubro:'Papelería',logo:'LM'},
    {name:'Matafuegos CADECI',rubro:'Seguridad',logo:'MC'},
    {name:'VA',rubro:'Servicios',logo:'VA'},
    {name:'Shop Ferretero',rubro:'Ferretería',logo:'SF'},
    {name:'Ascensores Pastorino',rubro:'Ascensores',logo:'AP'},
    {name:'Lo de Abru',rubro:'Beauty Bar',logo:'LA'}
  ];

  const css=document.createElement('style');
  css.textContent=`#defe-acompanan-modal{position:fixed;inset:0;background:#f5f7fb;z-index:2147482500;overflow:auto;color:#112f55}.da-top{position:sticky;top:0;background:#0b3b78;color:#fff;padding:18px;display:flex;align-items:center;gap:14px}.da-back{border:0;background:#ffffff18;color:#fff;border-radius:50%;width:40px;height:40px;font-size:22px}.da-title{font-size:23px;font-weight:900}.da-sub{padding:18px 20px 4px;color:#65758b}.da-list{padding:12px 18px 100px;display:grid;gap:12px}.da-card{background:#fff;border:1px solid #dbe4ef;border-radius:16px;padding:13px;display:flex;align-items:center;gap:13px}.da-mark{width:64px;height:64px;border-radius:13px;border:1px solid #dbe4ef;display:flex;align-items:center;justify-content:center;font-weight:900;color:#0b3b78;background:#f9fbfe}.da-info{flex:1;text-align:left}.da-name{font-weight:900;font-size:17px}.da-rubro{font-size:13px;color:#718096;margin-top:4px}.da-arrow{font-size:24px;color:#0b3b78}.da-detail{padding:26px 20px}.da-detail .da-mark{width:110px;height:110px;margin:20px auto;font-size:27px}.da-detail h2,.da-detail p{text-align:center}.da-detail p{color:#64748b}.da-note{text-align:center;padding:22px;color:#0b3b78;font-weight:800}`;
  document.head.appendChild(css);

  function detail(s){
    const m=document.getElementById('defe-acompanan-modal');
    m.innerHTML=`<div class="da-top"><button class="da-back" id="da-detail-back">‹</button><div class="da-title">Nos acompañan</div></div><div class="da-detail"><div class="da-mark">${s.logo}</div><h2>${s.name}</h2><p>${s.rubro}</p><p>Acompaña al Defe y ayuda a sostener las actividades del club.</p><div class="da-note">Gracias por acompañar al Defe</div></div>`;
    document.getElementById('da-detail-back').onclick=show;
  }

  function show(){
    let m=document.getElementById('defe-acompanan-modal');
    if(!m){m=document.createElement('div');m.id='defe-acompanan-modal';document.body.appendChild(m)}
    m.innerHTML=`<div class="da-top"><button class="da-back" id="da-close">‹</button><div class="da-title">Nos acompañan</div></div><div class="da-sub">Empresas y comercios que acompañan al Defe.</div><div class="da-list">${sponsors.map((s,i)=>`<button class="da-card" data-i="${i}"><div class="da-mark">${s.logo}</div><div class="da-info"><div class="da-name">${s.name}</div><div class="da-rubro">${s.rubro}</div></div><div class="da-arrow">›</div></button>`).join('')}</div>`;
    document.getElementById('da-close').onclick=()=>m.remove();
    m.querySelectorAll('.da-card').forEach(b=>b.onclick=()=>detail(sponsors[+b.dataset.i]));
  }

  window.defeAcompanantes={show,detail,sponsors};
})();