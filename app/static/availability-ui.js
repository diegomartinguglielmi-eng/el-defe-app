// El Defe · disponibilidad por próxima fecha + tablero administrativo
(function(){
  if(window.__defeAvailabilityLoaded)return;window.__defeAvailabilityLoaded=true;
  const API='https://el-defe-v5-production.up.railway.app';
  const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));
  function jwtFromValue(v){if(!v||typeof v!=='string')return null;const m=v.match(/eyJ[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+/);if(m)return m[0];try{const p=JSON.parse(v);if(p&&typeof p==='object')for(const x of Object.values(p)){const f=jwtFromValue(typeof x==='string'?x:JSON.stringify(x));if(f)return f}}catch(_){}return null}
  function token(){for(const st of [localStorage,sessionStorage])for(let i=0;i<st.length;i++){const t=jwtFromValue(st.getItem(st.key(i)));if(t)return t}return localStorage.getItem('defe_token')||localStorage.getItem('defe_auth_token')||sessionStorage.getItem('defe_token')||sessionStorage.getItem('defe_auth_token')||''}
  function role(){
    for(const st of [localStorage,sessionStorage]){
      for(const k of ['defe_role','role','user_role']){const v=String(st.getItem(k)||'').toLowerCase();if(v)return v}
      for(let i=0;i<st.length;i++){
        try{const raw=st.getItem(st.key(i));const obj=JSON.parse(raw||'null');const v=String(obj?.role||obj?.user?.role||'').toLowerCase();if(v)return v}catch(_){}
      }
    }
    return '';
  }
  async function api(path,init={}){const h=new Headers(init.headers||{});const t=token();if(t)h.set('Authorization','Bearer '+t);if(init.body)h.set('Content-Type','application/json');const r=await fetch(API+path,{...init,headers:h,cache:'no-store'});const d=await r.json().catch(()=>({}));if(!r.ok)throw new Error(d.detail||`Error ${r.status}`);return d}
  function fmtDate(v){if(!v)return'Fecha a confirmar';try{const [y,m,d]=String(v).slice(0,10).split('-').map(Number);return new Intl.DateTimeFormat('es-AR',{weekday:'short',day:'2-digit',month:'2-digit'}).format(new Date(y,m-1,d))}catch{return v}}
  const labels={yes:'Sí, voy',no:'No puedo',maybe:'A confirmar',pending:'Sin responder'};

  const style=document.createElement('style');style.textContent=`
    .av-wrap{background:#fff;border:1px solid #dbe4ef;border-radius:18px;padding:14px;margin-bottom:12px;box-shadow:0 2px 8px #0000000d}.av-wrap h3{margin:0 0 4px;font-size:18px}.av-sub{font-size:12px;color:#64748b;margin-bottom:10px}.av-card{border:1px solid #dbe4ef;border-radius:16px;padding:13px;margin-top:10px;background:linear-gradient(180deg,#fff,#fbfdff)}.av-kicker{font-size:11px;font-weight:950;color:#0b4a8f}.av-title{font-size:16px;font-weight:950;color:#17365f;margin-top:3px}.av-meta{font-size:12px;color:#64748b;margin-top:4px}.av-buttons{display:grid;grid-template-columns:repeat(3,1fr);gap:7px;margin-top:12px}.av-btn{border:1px solid #d7e1ec;background:#eef4fb;color:#17365f;border-radius:12px;padding:10px 5px;font-size:12px;font-weight:900}.av-btn[data-active=yes]{background:#e8f7ef;border-color:#16865b;color:#0d7a50}.av-btn[data-active=no]{background:#fff0f0;border-color:#d84a4a;color:#b42318}.av-btn[data-active=maybe]{background:#edf5ff;border-color:#8fb7e5;color:#0b4a8f}.av-status{margin-top:9px;font-size:12px;font-weight:800;color:#64748b}.av-empty{border:1px dashed #cbd5e1;border-radius:13px;padding:12px;color:#64748b;font-size:12px}.av-admin-entry{margin:12px 0;border:1px solid #d8e3ee;border-radius:16px;background:#fff;padding:14px;box-shadow:0 2px 8px #0000000d}.av-admin-entry button{width:100%;border:0;border-radius:12px;background:#0b4a8f;color:#fff;padding:12px;font-weight:900}.av-admin{position:fixed;inset:0;z-index:2147483000;background:#f3f6fa;color:#17365f;overflow:auto;font-family:Inter,system-ui,-apple-system,Segoe UI,Roboto,Arial,sans-serif}.ava-head{position:sticky;top:0;z-index:3;background:#0b4a8f;color:#fff;padding:16px}.ava-row{max-width:820px;margin:auto;display:flex;align-items:center;gap:10px}.ava-close{border:1px solid #ffffff55;background:#ffffff18;color:#fff;border-radius:12px;width:40px;height:40px;font-size:22px}.ava-main{max-width:820px;margin:auto;padding:16px 16px 90px}.ava-card{background:#fff;border:1px solid #dbe4ef;border-radius:18px;padding:14px;margin-bottom:12px}.ava-top{display:flex;justify-content:space-between;gap:8px;align-items:flex-start}.ava-stats{display:grid;grid-template-columns:repeat(4,1fr);gap:6px;margin-top:10px}.ava-stat{border-radius:12px;padding:9px 6px;text-align:center;background:#f4f7fb}.ava-stat b{display:block;font-size:20px}.ava-stat.y b{color:#16865b}.ava-stat.n b{color:#b42318}.ava-stat.m b{color:#0b4a8f}.ava-stat.p b{color:#718096}.ava-people{margin-top:10px;border-top:1px solid #edf1f5}.ava-person{display:grid;grid-template-columns:1fr auto;gap:10px;padding:9px 0;border-bottom:1px solid #edf1f5;font-size:12px}.ava-badge{font-weight:900}.ava-badge.y{color:#16865b}.ava-badge.n{color:#b42318}.ava-badge.m{color:#0b4a8f}.ava-badge.p{color:#718096}
  `;document.head.appendChild(style);

  let loadingUser=false;
  async function injectUser(){
    const page=document.getElementById('defe-mi-defe');
    if(!page||page.querySelector('[data-availability-user]')||!token()||loadingUser)return;
    loadingUser=true;
    try{
      const data=await api('/api/availability/me');
      const box=document.createElement('section');box.className='av-wrap';box.dataset.availabilityUser='1';
      const items=Array.isArray(data.items)?data.items:[];
      box.innerHTML=`<h3>Disponibilidad para la próxima fecha</h3><div class="av-sub">Confirmá por cada categoría que seguís. Cuando se publique una nueva fecha, la confirmación vuelve a quedar pendiente.</div>${items.length?items.map(userCard).join(''):'<div class="av-empty">Elegí al menos una liga o categoría en Personalizar Mi Defe.</div>'}`;
      const cards=page.querySelectorAll('.md-card');
      if(cards.length>=2)cards[1].after(box);else page.querySelector('.md-body')?.prepend(box);
      box.querySelectorAll('[data-av-answer]').forEach(b=>b.onclick=async()=>{
        const card=b.closest('[data-av-card]');if(!card)return;
        const msg=card.querySelector('[data-av-msg]');
        try{msg.textContent='Guardando…';await api('/api/availability/'+b.dataset.matchId,{method:'PUT',body:JSON.stringify({selection:b.dataset.selection,status:b.dataset.avAnswer})});box.remove();await injectUser()}catch(e){msg.textContent=e.message}
      });
    }catch(e){console.warn('Disponibilidad no disponible',e)}finally{loadingUser=false}
  }
  function userCard(x){
    if(x.available===false)return `<div class="av-card"><div class="av-kicker">${esc(x.competition)} · ${esc(x.category)}</div><div class="av-title">Sin próxima fecha publicada</div><div class="av-meta">Cuando haya una nueva fecha aparecerá automáticamente para confirmar.</div></div>`;
    const r=x.response||'pending';
    return `<div class="av-card" data-av-card><div class="av-kicker">${esc(x.competition)} · ${esc(x.category)}</div><div class="av-title">${esc(x.rival||'Rival a confirmar')}</div><div class="av-meta">${esc(fmtDate(x.date))} · ${esc(x.time||'Hora a confirmar')} · ${x.local===true?'Local':x.local===false?'Visitante':'Condición a confirmar'}</div><div class="av-buttons"><button class="av-btn" data-active="${r==='yes'?'yes':''}" data-av-answer="yes" data-match-id="${x.match_id}" data-selection="${esc(x.selection)}">✓ Sí, voy</button><button class="av-btn" data-active="${r==='no'?'no':''}" data-av-answer="no" data-match-id="${x.match_id}" data-selection="${esc(x.selection)}">✕ No puedo</button><button class="av-btn" data-active="${r==='maybe'?'maybe':''}" data-av-answer="maybe" data-match-id="${x.match_id}" data-selection="${esc(x.selection)}">◷ A confirmar</button></div><div class="av-status" data-av-msg>Estado: ${esc(labels[r]||'Sin responder')}</div></div>`
  }

  function addAdminEntry(main,placement='prepend'){
    if(!main||main.querySelector(':scope > [data-av-admin-entry]'))return;
    const c=document.createElement('div');c.className='av-admin-entry';c.dataset.avAdminEntry='1';
    c.innerHTML='<b>Confirmaciones de asistencia</b><div style="font-size:12px;color:#718096;margin:4px 0 10px">Seguimiento por liga, categoría y próxima fecha.</div><button>Abrir tablero de asistencia</button>';
    if(placement==='append')main.appendChild(c);else main.prepend(c);
    c.querySelector('button').onclick=openAdmin;
  }
  function ensureAdminEntry(){
    if(!['admin','delegado','dt'].includes(role())||!token())return;
    const adminMain=document.querySelector('#admin .main')||document.querySelector('#admin');
    const profileMain=document.querySelector('#profile .main')||document.querySelector('#profile');
    addAdminEntry(adminMain,'prepend');
    addAdminEntry(profileMain,'append');
  }
  async function openAdmin(){
    document.querySelector('.av-admin')?.remove();
    const root=document.createElement('div');root.className='av-admin';root.innerHTML='<header class="ava-head"><div class="ava-row"><button class="ava-close">←</button><div><div style="font-size:12px;opacity:.8;font-weight:800">EL DEFE</div><div style="font-size:22px;font-weight:950">Confirmaciones de asistencia</div></div></div></header><main class="ava-main"><div class="av-empty">Cargando confirmaciones…</div></main>';document.body.appendChild(root);root.querySelector('.ava-close').onclick=()=>root.remove();
    try{const d=await api('/api/availability/admin');const items=Array.isArray(d.items)?d.items:[];root.querySelector('.ava-main').innerHTML=items.length?items.map(adminCard).join(''):'<div class="av-empty">Todavía no hay categorías con próxima fecha y familias siguiéndolas.</div>'}catch(e){root.querySelector('.ava-main').innerHTML=`<div class="av-empty">${esc(e.message)}</div>`}
  }
  function adminCard(x){
    const people=(x.people||[]).slice().sort((a,b)=>({pending:0,maybe:1,no:2,yes:3}[a.status]??9)-({pending:0,maybe:1,no:2,yes:3}[b.status]??9));
    return `<section class="ava-card"><div class="ava-top"><div><div class="av-kicker">${esc(x.competition)} · ${esc(x.category)}</div><div class="av-title">${esc(x.rival||'Rival a confirmar')}</div><div class="av-meta">${esc(fmtDate(x.date))} · ${esc(x.time||'Hora a confirmar')}</div></div><b>Seguidos: ${x.followers||0}</b></div><div class="ava-stats"><div class="ava-stat y"><b>${x.yes||0}</b><span>Vienen</span></div><div class="ava-stat n"><b>${x.no||0}</b><span>No vienen</span></div><div class="ava-stat m"><b>${x.maybe||0}</b><span>A confirmar</span></div><div class="ava-stat p"><b>${x.pending||0}</b><span>Sin responder</span></div></div><div class="ava-people">${people.map(p=>`<div class="ava-person"><span>${esc(p.email)}</span><span class="ava-badge ${p.status==='yes'?'y':p.status==='no'?'n':p.status==='maybe'?'m':'p'}">${esc(labels[p.status]||p.status)}</span></div>`).join('')}</div></section>`
  }

  function tick(){injectUser();ensureAdminEntry()}
  setInterval(tick,1500);window.addEventListener('focus',tick);document.addEventListener('click',()=>setTimeout(tick,100),true);tick();
})();