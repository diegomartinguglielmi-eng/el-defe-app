(() => {
  if (window.__defeFollowingLoaded) return;
  window.__defeFollowingLoaded = true;

  const API = 'https://el-defe-v5-production.up.railway.app';
  let state = { options: [], selections: [], events: [], ready: false, editing: false };
  let loading = false;

  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));

  function jwtFromValue(value){
    if(!value||typeof value!=='string')return null;
    const m=value.match(/eyJ[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+/);if(m)return m[0];
    try{const p=JSON.parse(value);if(typeof p==='string')return jwtFromValue(p);if(p&&typeof p==='object')for(const v of Object.values(p)){const f=jwtFromValue(typeof v==='string'?v:JSON.stringify(v));if(f)return f}}catch(_){}
    return null;
  }
  function token(){for(const st of [localStorage,sessionStorage])for(let i=0;i<st.length;i++){const t=jwtFromValue(st.getItem(st.key(i)));if(t)return t}return null}
  async function api(path, init={}){
    const t=token();
    if(!t) throw new Error('Iniciá sesión para elegir qué equipos seguir.');
    const headers=new Headers(init.headers||{});headers.set('Authorization',`Bearer ${t}`);if(init.body)headers.set('Content-Type','application/json');
    const r=await fetch(API+path,{...init,headers,cache:'no-store'});const d=await r.json().catch(()=>({}));if(!r.ok)throw new Error(d.detail||'No se pudo completar la operación');return d;
  }

  function isHome(){return !!document.querySelector('.defe-home') && !document.querySelector('.defe-profile-page')}
  function isProfile(){return !!document.querySelector('.defe-profile-page') || !![...document.querySelectorAll('div,span,p')].find(el=>el.childElementCount===0&&/categoría\(s\) seguidas/i.test(el.textContent||''))}

  const css=document.createElement('style');
  css.textContent=`
    .defe-category-card{display:none!important}
    #defe-following-home,#defe-following-profile{margin:14px 0;background:#fff;border:1px solid #dbe4ef;border-radius:18px;padding:14px;color:#112f55;box-shadow:0 2px 8px #0000000d}
    #defe-following-profile{margin:14px 28px}
    .df-head{display:flex;align-items:flex-start;justify-content:space-between;gap:10px}.df-title{font-size:18px;font-weight:900;color:#0b3b78}.df-sub{font-size:12px;color:#64748b;margin-top:3px}.df-edit{border:0;background:#eef4fb;color:#0b3b78;border-radius:10px;padding:8px 10px;font-weight:800;white-space:nowrap}
    .df-chips{display:flex;gap:6px;flex-wrap:wrap;margin-top:10px}.df-chip{font-size:12px;font-weight:800;background:#eef4fb;color:#0b3b78;border-radius:999px;padding:6px 9px}
    .df-editor{margin-top:12px;border-top:1px solid #e5e7eb;padding-top:10px}.df-league{margin:10px 0 12px}.df-league-name{font-size:13px;font-weight:900;color:#0b3b78;margin-bottom:7px}.df-options{display:flex;flex-wrap:wrap;gap:7px}.df-option{border:1px solid #cbd5e1;border-radius:999px;padding:7px 10px;background:#fff;color:#334155;font-size:12px;font-weight:800}.df-option[data-on="1"]{background:#0b3b78;color:#fff;border-color:#0b3b78}.df-save{width:100%;margin-top:8px;border:0;border-radius:11px;background:#0b3b78;color:#fff;padding:11px;font-weight:900}.df-msg{font-size:12px;color:#64748b;margin-top:7px}
    #defe-next-followed{margin:14px 0}.df-agenda-head{display:flex;justify-content:space-between;align-items:center;margin-bottom:8px}.df-agenda-title{font-size:18px;font-weight:900;color:#112f55}.df-agenda-count{font-size:11px;color:#64748b}.df-event{background:#fff;border:1px solid #dbe4ef;border-radius:15px;padding:11px 12px;margin-bottom:8px}.df-event-top{display:flex;justify-content:space-between;gap:8px;align-items:flex-start}.df-event-tag{font-size:11px;font-weight:900;color:#0b3b78}.df-event-date{font-size:11px;font-weight:800;color:#475569;text-align:right}.df-event-rival{font-size:15px;font-weight:900;margin-top:3px}.df-event-line{display:flex;gap:7px;margin-top:5px;font-size:12px;color:#64748b;align-items:flex-start}.df-event-line b{color:#334155}.df-map{display:inline-flex;margin-top:8px;border:0;border-radius:9px;padding:7px 9px;background:#eef4fb;color:#0b3b78;font-weight:900;font-size:12px;text-decoration:none}.df-empty{background:#fff;border:1px dashed #cbd5e1;border-radius:14px;padding:12px;color:#64748b;font-size:12px}
    [data-defe-legacy-next="1"]{display:none!important}
    @media(max-width:640px){#defe-following-profile{margin:14px 28px}.df-event{padding:10px}.df-event-rival{font-size:14px}}
  `;
  document.head.appendChild(css);

  function legacyLocalSelections(){
    const years=new Set();
    for(const st of [localStorage,sessionStorage]){
      for(let i=0;i<st.length;i++){
        const k=String(st.key(i)||'');if(!/categor|follow|favor/i.test(k))continue;
        const v=String(st.getItem(k)||'');
        (v.match(/20(?:13|14|15|16|17|18|19)/g)||[]).forEach(y=>years.add(`FEFI|${y}`));
      }
    }
    return [...years];
  }

  async function load(){
    if(loading||!token())return;loading=true;
    try{
      const [o,m]=await Promise.all([api('/api/following/options'),api('/api/following/me')]);
      state.options=o.competitions||[];state.selections=m.selections||[];
      if(!state.selections.length){
        const legacy=legacyLocalSelections();
        if(legacy.length){const saved=await api('/api/following/me',{method:'PUT',body:JSON.stringify({selections:legacy})});state.selections=saved.selections||legacy;}
      }
      const n=await api('/api/following/next?limit=12');state.events=n.events||[];state.ready=true;
      renderAll();
    }catch(e){state.ready=true;renderAll(e.message)}finally{loading=false}
  }

  function chips(){return state.selections.map(x=>{const [l,c]=x.split('|');return `<span class="df-chip">${esc(l)} · ${esc(c)}</span>`}).join('')}
  function editorHtml(){
    if(!state.editing)return '';
    return `<div class="df-editor">${state.options.map(g=>`<div class="df-league"><div class="df-league-name">${esc(g.competition)}</div><div class="df-options">${(g.categories||[]).map(c=>{const key=`${g.competition}|${c}`,on=state.selections.includes(key);return `<button type="button" class="df-option" data-key="${esc(key)}" data-on="${on?'1':'0'}">${esc(c)}</button>`}).join('')}</div></div>`).join('')}<button type="button" class="df-save" data-follow-save>Guardar selección</button><div class="df-msg" data-follow-msg></div></div>`;
  }
  function selectionCard(id,profile=false){
    const count=state.selections.length;
    return `<section id="${id}"><div class="df-head"><div><div class="df-title">Qué quiero seguir</div><div class="df-sub">Elegí categorías de una o varias ligas.</div></div><button type="button" class="df-edit" data-follow-edit>${state.editing?'Cerrar':'Editar'}</button></div>${count?`<div class="df-chips">${chips()}</div>`:`<div class="df-empty" style="margin-top:10px">Todavía no elegiste equipos o categorías.</div>`}${editorHtml()}</section>`;
  }

  function bindSelection(root){
    root.querySelector('[data-follow-edit]')?.addEventListener('click',()=>{state.editing=!state.editing;renderAll()});
    root.querySelectorAll('.df-option').forEach(b=>b.onclick=()=>{const k=b.dataset.key;if(state.selections.includes(k))state.selections=state.selections.filter(x=>x!==k);else state.selections=[...state.selections,k];renderAll()});
    root.querySelector('[data-follow-save]')?.addEventListener('click',async()=>{const msg=root.querySelector('[data-follow-msg]');try{if(msg)msg.textContent='Guardando…';const d=await api('/api/following/me',{method:'PUT',body:JSON.stringify({selections:state.selections})});state.selections=d.selections||state.selections;state.editing=false;const n=await api('/api/following/next?limit=12');state.events=n.events||[];renderAll();document.dispatchEvent(new CustomEvent('defe:following-changed',{detail:{selections:state.selections}}))}catch(e){if(msg)msg.textContent=e.message}});
  }

  function formatDate(raw){if(!raw)return 'Fecha a confirmar';try{const [y,m,d]=raw.split('-').map(Number);return new Intl.DateTimeFormat('es-AR',{weekday:'short',day:'2-digit',month:'2-digit'}).format(new Date(y,m-1,d))}catch(_){return raw}}
  function eventHtml(e){
    const when=`${formatDate(e.date)} · ${e.time||'Hora a confirmar'}`;
    const venue=e.venue||e.club||'Sede a confirmar';
    const address=e.address||'Dirección a confirmar';
    const side=e.local?'Local':'Visitante';
    return `<article class="df-event"><div class="df-event-top"><div><div class="df-event-tag">${esc(e.competition)} · ${esc(e.category)}</div><div class="df-event-rival">${esc(e.rival||'Rival a confirmar')}</div></div><div class="df-event-date">${esc(when)}<br>${esc(side)}</div></div><div class="df-event-line"><span>🏟️</span><span><b>${esc(venue)}</b></span></div><div class="df-event-line"><span>📍</span><span>${esc(address)}</span></div>${e.maps_url?`<a class="df-map" href="${esc(e.maps_url)}" target="_blank" rel="noopener noreferrer">Cómo llegar ›</a>`:''}</article>`;
  }
  function agendaHtml(){
    if(!state.selections.length)return `<section id="defe-next-followed"><div class="df-agenda-head"><div class="df-agenda-title">Próximas fechas</div></div><div class="df-empty">Elegí qué categorías seguís para ver acá sus próximos partidos.</div></section>`;
    const shown=state.events.slice(0,3);
    return `<section id="defe-next-followed"><div class="df-agenda-head"><div class="df-agenda-title">Próximas fechas</div><div class="df-agenda-count">${state.events.length} selección${state.events.length===1?'':'es'}</div></div>${shown.length?shown.map(eventHtml).join(''):`<div class="df-empty">Todavía no hay próximas fechas publicadas para tus selecciones.</div>`}${state.events.length>3?`<button type="button" class="df-edit" data-agenda-more style="width:100%;margin-top:2px">Ver agenda completa</button>`:''}</section>`;
  }

  function hideLegacyNext(){
    document.querySelectorAll('[data-defe-legacy-next="1"]').forEach(el=>el.removeAttribute('data-defe-legacy-next'));
    const heading=[...document.querySelectorAll('h1,h2,h3,div')].find(el=>el.id!=='defe-next-followed'&&el.childElementCount===0&&/^Próxima fecha$/i.test((el.textContent||'').trim())&&!el.closest('#defe-next-followed'));
    if(!heading)return;
    let n=heading;
    for(let i=0;i<4&&n.parentElement;i++,n=n.parentElement){const r=n.getBoundingClientRect();if(r.width>250&&r.height>80&&r.height<650){n.setAttribute('data-defe-legacy-next','1');break}}
  }

  function renderHome(){
    if(!isHome()){document.getElementById('defe-following-home')?.remove();document.getElementById('defe-next-followed')?.remove();return}
    const home=document.querySelector('.defe-home');if(!home)return;
    hideLegacyNext();
    let select=document.getElementById('defe-following-home');
    if(!select){select=document.createElement('div');select.innerHTML=selectionCard('defe-following-home');const node=select.firstElementChild;home.prepend(node);select=node}else select.outerHTML=selectionCard('defe-following-home');
    select=document.getElementById('defe-following-home');bindSelection(select);
    let agenda=document.getElementById('defe-next-followed');if(!agenda){const wrap=document.createElement('div');wrap.innerHTML=agendaHtml();agenda=wrap.firstElementChild;select.insertAdjacentElement('afterend',agenda)}else agenda.outerHTML=agendaHtml();
    agenda=document.getElementById('defe-next-followed');
    agenda.querySelector('[data-agenda-more]')?.addEventListener('click',()=>showAgenda());
  }

  function showAgenda(){
    document.getElementById('defe-following-agenda-modal')?.remove();const m=document.createElement('div');m.id='defe-following-agenda-modal';m.style.cssText='position:fixed;inset:0;z-index:2147482600;background:#f5f7fb;overflow:auto;color:#112f55';m.innerHTML=`<div style="position:sticky;top:0;background:#0b3b78;color:#fff;padding:18px;display:flex;gap:12px;align-items:center"><button data-close style="border:0;border-radius:50%;width:40px;height:40px;background:#ffffff18;color:#fff;font-size:22px">‹</button><strong style="font-size:22px">Próximas fechas</strong></div><div style="padding:16px 16px 90px">${state.events.length?state.events.map(eventHtml).join(''):'<div class="df-empty">No hay fechas publicadas.</div>'}</div>`;document.body.appendChild(m);m.querySelector('[data-close]').onclick=()=>m.remove();
  }

  function renderProfile(error){
    if(!isProfile()){document.getElementById('defe-following-profile')?.remove();return}
    const old=[...document.querySelectorAll('div,span,p')].find(el=>el.childElementCount===0&&/\d+ categoría\(s\) seguidas/i.test(el.textContent||''));if(old)old.textContent=`${state.selections.length} equipo${state.selections.length===1?'':'s'} seguido${state.selections.length===1?'':'s'}`;
    let box=document.getElementById('defe-following-profile');if(!box){const anchor=[...document.querySelectorAll('button')].find(b=>/cerrar sesión/i.test(b.textContent||''));const parent=anchor?.closest('div[class]')?.parentElement||document.querySelector('.defe-profile-page');if(!parent)return;box=document.createElement('div');box.id='defe-following-profile';parent.insertAdjacentElement('afterend',box)}
    box.outerHTML=selectionCard('defe-following-profile',true);box=document.getElementById('defe-following-profile');bindSelection(box);if(error){const msg=document.createElement('div');msg.className='df-msg';msg.textContent=error;box.appendChild(msg)}
  }

  function renderAll(error){renderHome();renderProfile(error)}
  setInterval(()=>{if(state.ready)renderAll();else if(token())load()},1200);
  window.addEventListener('focus',()=>{if(token())load()});
  document.addEventListener('visibilitychange',()=>{if(!document.hidden&&token())load()});
  setTimeout(load,250);
})();
