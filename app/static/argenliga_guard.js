// El Defe · Argenliga assisted import guard
(function(){
  const API=()=>window.EL_DEFE_API_URL||'';
  const token=()=>localStorage.getItem('defe_token')||'';
  const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));
  const norm=s=>String(s||'').replace(/\s+/g,' ').trim().toUpperCase();
  const intOrNull=v=>{const x=String(v??'').trim();return /^-?\d+$/.test(x)?Number(x):null;};
  const key=m=>`${m.date||''}|${norm(m.home)}|${norm(m.away)}`;

  async function api(path,opts={}){
    opts.headers=opts.headers||{};
    if(token())opts.headers.Authorization='Bearer '+token();
    const r=await fetch(API()+path,opts);
    const j=await r.json().catch(()=>({}));
    if(!r.ok)throw new Error(j.detail||'Error');
    return j;
  }

  async function guardedImport(){
    const ta=document.getElementById('argenImportText'),msg=document.getElementById('argenImportMsg');
    if(!ta||!msg)return;
    const lines=(ta.value||'').split(/\n/).map(x=>x.trim()).filter(Boolean);
    if(!lines.length){msg.textContent='Pegá al menos un partido.';return;}

    const parsed=[];const errors=[];
    lines.forEach((line,i)=>{
      const p=line.split('|').map(x=>x.trim());
      if(p.length<3||!p[1]||!p[2]){errors.push(`Línea ${i+1}: faltan local/visitante`);return;}
      if(p[0]&&!/^\d{4}-\d{2}-\d{2}$/.test(p[0])){errors.push(`Línea ${i+1}: la fecha debe ser AAAA-MM-DD`);return;}
      const hs=intOrNull(p[3]),as=intOrNull(p[4]);
      if((p[3]&&hs===null)||(p[4]&&as===null)){errors.push(`Línea ${i+1}: goles inválidos`);return;}
      if((hs===null)!==(as===null)){errors.push(`Línea ${i+1}: completar ambos goles o ninguno`);return;}
      parsed.push({date:p[0]||null,home:p[1],away:p[2],home_score:hs,away_score:as,status:(hs!==null&&as!==null)?'final':'scheduled'});
    });
    if(errors.length){msg.innerHTML=`<b>Revisar antes de importar</b><br>${errors.map(esc).join('<br>')}`;return;}

    try{
      msg.textContent='Comparando con Argenliga ya cargada…';
      const existing=await api('/api/matches?competition=ARGENLIGA');
      const byKey=new Map(existing.map(x=>[key(x),x]));
      let updates=0,created=0;
      const unique=new Map();
      for(const m of parsed){
        const found=byKey.get(key(m));
        if(found){m.home=found.home;m.away=found.away;updates++;}else created++;
        unique.set(key(m),m);
      }
      const matches=[...unique.values()];
      msg.innerHTML=`Validado: <b>${matches.length}</b> partido${matches.length===1?'':'s'} · ${updates} actualización${updates===1?'':'es'} · ${created} nuevo${created===1?'':'s'}. Importando…`;
      const r=await api('/api/import/argenliga',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({matches})});
      msg.innerHTML=`<b>Argenliga actualizada:</b> ${esc(r.imported)} partido${r.imported===1?'':'s'} procesado${r.imported===1?'':'s'} · ${updates} actualizado${updates===1?'':'s'} · ${created} nuevo${created===1?'':'s'}.`;
      ta.value='';
      if(typeof window.defeLoadMatchExplorer==='function')window.defeLoadMatchExplorer();
      if(typeof window.defeLoadDataQuality==='function')window.defeLoadDataQuality();
    }catch(e){msg.textContent=e.message;}
  }

  function install(){
    if(typeof window.defeImportArgenliga==='function')window.defeImportArgenliga=guardedImport;
    else setTimeout(install,200);
  }
  install();
})();
