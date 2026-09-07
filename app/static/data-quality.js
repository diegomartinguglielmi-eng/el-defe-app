(function(){
 const API=()=>window.EL_DEFE_API_URL||'';
 const token=()=>localStorage.getItem('defe_token')||'';
 const role=()=>localStorage.getItem('defe_role')||'';
 const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));
 async function load(){
   const tools=document.getElementById('adminTools');
   if(!tools||!token()||!['admin','delegado'].includes(role()))return;
   let box=document.getElementById('dataQualityBox');
   if(!box){box=document.createElement('div');box.id='dataQualityBox';box.className='card';tools.appendChild(box);}
   box.innerHTML='<b>Calidad de datos</b><div class="meta">Revisando consistencia…</div>';
   try{
     const r=await fetch(API()+'/api/admin/data-quality',{headers:{Authorization:'Bearer '+token()}});const d=await r.json();if(!r.ok)throw new Error(d.detail||'Error');
     const cards=d.summary.map(x=>`<div style="padding:8px 0;border-top:1px solid var(--line)"><div class="row"><b>${esc(x.competition)}</b><span class="badge ${x.matches?'ok':'gold'}">${x.matches} partidos</span></div><div class="meta">Finalizados ${x.final} · Próximos ${x.scheduled} · sin fecha ${x.missing_date} · sin sede ${x.missing_venue}</div></div>`).join('');
     const f=d.sources.fefi,l=d.sources.laamba,a=d.sources.argenliga;
     box.innerHTML=`<div class="row"><b>Calidad de datos</b><span class="badge ${d.duplicates.length?'gold':'ok'}">${d.duplicates.length} grupos duplicados</span></div>${cards}<div class="meta" style="margin-top:8px"><b>FEFI:</b> Clausura ${f.clausura} · legacy ${f.legacy_sync}</div><div class="meta"><b>LAAMBA:</b> Clausura ${l.clausura} · tabla ${l.standings_clausura} · legacy ${l.legacy_sync}</div><div class="meta"><b>Argenliga:</b> carga asistida/manual</div>`;
   }catch(e){box.innerHTML=`<b>Calidad de datos</b><div class="meta">${esc(e.message)}</div>`;}
 }
 function init(){setTimeout(load,250);const oldShow=window.show;if(typeof oldShow==='function'&&!oldShow.__dataQuality){const wrapped=function(id){const r=oldShow.apply(this,arguments);if(id==='admin')setTimeout(load,100);return r};wrapped.__dataQuality=true;window.show=wrapped;}}
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
 window.defeLoadDataQuality=load;
})();
