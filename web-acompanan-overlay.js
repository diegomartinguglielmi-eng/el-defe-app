(() => {
  if (window.__defeSponsorsLoaded) return;
  window.__defeSponsorsLoaded = true;

  const API = 'https://el-defe-v5-production.up.railway.app';
  let sponsors = [];
  const fallback = [
    {name:'JM Distribuidora',category:'Distribución',short_mark:'JM'},
    {name:'Wimer',category:'Servicios',short_mark:'W'},
    {name:'La Milagrosa Papelería',category:'Papelería',short_mark:'LM'},
    {name:'Matafuegos CADECI',category:'Seguridad',short_mark:'MC'},
    {name:'VA',category:'Servicios',short_mark:'VA'},
    {name:'Shop Ferretero',category:'Ferretería',short_mark:'SF'},
    {name:'Ascensores Pastorino',category:'Ascensores',short_mark:'AP'},
    {name:'Lo de Abru',category:'Beauty Bar',short_mark:'LA'}
  ];

  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));
  function jwtFromValue(value){if(!value||typeof value!=='string')return null;const m=value.match(/eyJ[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+/);if(m)return m[0];try{const p=JSON.parse(value);if(typeof p==='string')return jwtFromValue(p);if(p&&typeof p==='object')for(const v of Object.values(p)){const f=jwtFromValue(typeof v==='string'?v:JSON.stringify(v));if(f)return f}}catch(_){}return null}
  function token(){for(const st of [localStorage,sessionStorage])for(let i=0;i<st.length;i++){const t=jwtFromValue(st.getItem(st.key(i)));if(t)return t}return null}
  function role(){try{const t=token();if(!t)return '';const p=t.split('.')[1].replace(/-/g,'+').replace(/_/g,'/');return JSON.parse(atob(p.padEnd(Math.ceil(p.length/4)*4,'='))).role||''}catch(_){return ''}}
  function primary(s){return s.primary_url||s.instagram_url||s.website_url||s.facebook_url||s.whatsapp_url||''}
  function logoHtml(s, cls='da-mark'){return s.logo_url?`<div class="${cls}"><img src="${esc(s.logo_url)}" alt="${esc(s.name)}"></div>`:`<div class="${cls}">${esc(s.short_mark||s.name?.slice(0,2)||'SP')}</div>`}
  function openUrl(url){if(url)window.open(url,'_blank','noopener,noreferrer')}

  const css=document.createElement('style');
  css.textContent=`
  .da-fab{position:fixed;right:12px;bottom:82px;z-index:9997;border:0;border-radius:999px;padding:11px 14px;background:#0b3b78;color:#fff;font-weight:900;box-shadow:0 6px 18px #0003}
  .da-fab.admin{background:#40368f}.da-fab[hidden]{display:none!important}
  #defe-acompanan-modal,#defe-sponsors-admin{position:fixed;inset:0;background:#f5f7fb;z-index:2147482500;overflow:auto;color:#112f55}
  .da-top{position:sticky;top:0;background:#0b3b78;color:#fff;padding:18px;display:flex;align-items:center;gap:14px;z-index:2}.da-back{border:0;background:#ffffff18;color:#fff;border-radius:50%;width:40px;height:40px;font-size:22px}.da-title{font-size:23px;font-weight:900}.da-sub{padding:18px 20px 4px;color:#65758b}.da-list{padding:12px 18px 100px;display:grid;gap:12px}.da-card{background:#fff;border:1px solid #dbe4ef;border-radius:16px;padding:13px;display:flex;align-items:center;gap:13px;text-align:left}.da-info{flex:1}.da-name{font-weight:900;font-size:17px}.da-rubro{font-size:13px;color:#718096;margin-top:4px}.da-arrow{font-size:24px;color:#0b3b78}.da-detail{padding:26px 20px;text-align:center}.da-mark,.da-mark-lg{border-radius:13px;border:1px solid #dbe4ef;display:flex;align-items:center;justify-content:center;font-weight:900;color:#0b3b78;background:#fff;overflow:hidden}.da-mark{width:64px;height:48px}.da-mark-lg{width:110px;height:110px;margin:20px auto;font-size:27px}.da-mark img,.da-mark-lg img{width:100%;height:100%;object-fit:contain}.da-socials{display:flex;flex-wrap:wrap;justify-content:center;gap:8px;margin-top:18px}.da-socials button{border:1px solid #cbd5e1;background:#fff;border-radius:999px;padding:9px 12px;font-weight:800}.sp-admin-wrap{padding:16px;max-width:760px;margin:auto}.sp-admin-card{background:#fff;border:1px solid #dbe4ef;border-radius:16px;padding:14px;margin:10px 0}.sp-grid{display:grid;grid-template-columns:1fr 1fr;gap:10px}.sp-grid label{font-size:12px;font-weight:700;color:#475569}.sp-grid input,.sp-grid select{width:100%;box-sizing:border-box;margin-top:4px;padding:10px;border:1px solid #cbd5e1;border-radius:10px}.sp-actions{display:flex;gap:8px;flex-wrap:wrap;margin-top:10px}.sp-actions button,.sp-primary{border:0;border-radius:10px;padding:10px 12px;font-weight:800}.sp-primary{background:#0b3b78;color:#fff}.sp-danger{background:#fee2e2;color:#991b1b}.sp-status{font-size:12px;color:#64748b;margin-top:8px}@media(max-width:640px){.sp-grid{grid-template-columns:1fr}}
  `;
  document.head.appendChild(css);

  async function loadPublic(){try{const r=await fetch(API+'/api/sponsors',{cache:'no-store'});if(!r.ok)throw 0;const d=await r.json();sponsors=Array.isArray(d)&&d.length?d:fallback}catch(_){sponsors=fallback}}
  function socials(s){return [['Instagram',s.instagram_url],['Web',s.website_url],['Facebook',s.facebook_url],['WhatsApp',s.whatsapp_url]].filter(x=>x[1]).map(([n,u])=>`<button type="button" data-url="${esc(u)}">${n}</button>`).join('')}
  function detail(s){const m=document.getElementById('defe-acompanan-modal');if(!m)return;m.innerHTML=`<div class="da-top"><button class="da-back" data-back>‹</button><div class="da-title">Nos acompañan</div></div><div class="da-detail">${logoHtml(s,'da-mark-lg')}<h2>${esc(s.name)}</h2><p>${esc(s.category||'Sponsor')}</p>${primary(s)?'<button class="sp-primary" data-primary>Visitar sponsor</button>':''}<div class="da-socials">${socials(s)}</div></div>`;m.querySelector('[data-back]').onclick=show;m.querySelector('[data-primary]')?.addEventListener('click',()=>openUrl(primary(s)));m.querySelectorAll('[data-url]').forEach(b=>b.onclick=()=>openUrl(b.dataset.url))}
  function show(){let m=document.getElementById('defe-acompanan-modal');if(!m){m=document.createElement('div');m.id='defe-acompanan-modal';document.body.appendChild(m)}m.innerHTML=`<div class="da-top"><button class="da-back" data-close>‹</button><div class="da-title">Nos acompañan</div></div><div class="da-sub">Empresas y comercios que acompañan al Defe.</div><div class="da-list">${sponsors.map((s,i)=>`<button class="da-card" data-i="${i}">${logoHtml(s)}<div class="da-info"><div class="da-name">${esc(s.name)}</div><div class="da-rubro">${esc(s.category||'Sponsor')}</div></div><div class="da-arrow">›</div></button>`).join('')}</div>`;m.querySelector('[data-close]').onclick=()=>m.remove();m.querySelectorAll('[data-i]').forEach(b=>b.onclick=()=>detail(sponsors[+b.dataset.i]))}

  async function fileData(file){if(!file)return null;if(file.size>2*1024*1024)throw new Error('El logo debe pesar menos de 2 MB');return await new Promise((res,rej)=>{const r=new FileReader();r.onload=()=>res(r.result);r.onerror=rej;r.readAsDataURL(file)})}
  async function adminData(){const r=await fetch(API+'/api/sponsors/admin',{headers:{Authorization:`Bearer ${token()}`},cache:'no-store'});const d=await r.json().catch(()=>({}));if(!r.ok)throw new Error(d.detail||'No se pudieron cargar los sponsors');return d}
  function formHtml(s={}){return `<div class="sp-grid"><label>Nombre<input data-f="name" value="${esc(s.name||'')}"></label><label>Rubro<input data-f="category" value="${esc(s.category||'')}"></label><label>Sigla<input data-f="short_mark" value="${esc(s.short_mark||'')}"></label><label>Orden<input data-f="sort_order" type="number" value="${Number(s.sort_order||0)}"></label><label>Instagram<input data-f="instagram_url" value="${esc(s.instagram_url||'')}"></label><label>Web<input data-f="website_url" value="${esc(s.website_url||'')}"></label><label>Facebook<input data-f="facebook_url" value="${esc(s.facebook_url||'')}"></label><label>WhatsApp<input data-f="whatsapp_url" value="${esc(s.whatsapp_url||'')}"></label><label>URL principal<input data-f="primary_url" value="${esc(s.primary_url||'')}"></label><label>Logo<input data-f="logo_file" type="file" accept="image/*"></label><label>Activo<select data-f="active"><option value="1" ${s.active!==false?'selected':''}>Sí</option><option value="0" ${s.active===false?'selected':''}>No</option></select></label><label>Destacado<select data-f="featured"><option value="1" ${s.featured?'selected':''}>Sí</option><option value="0" ${!s.featured?'selected':''}>No</option></select></label></div>`}
  async function payload(card,old={}){const q=n=>card.querySelector(`[data-f="${n}"]`);let logo=old.logo_url||null;const f=q('logo_file')?.files?.[0];if(f)logo=await fileData(f);return {name:q('name').value.trim(),category:q('category').value.trim()||null,short_mark:q('short_mark').value.trim()||null,sort_order:Number(q('sort_order').value||0),instagram_url:q('instagram_url').value.trim()||null,website_url:q('website_url').value.trim()||null,facebook_url:q('facebook_url').value.trim()||null,whatsapp_url:q('whatsapp_url').value.trim()||null,primary_url:q('primary_url').value.trim()||null,logo_url:logo,active:q('active').value==='1',featured:q('featured').value==='1'}}
  async function saveSponsor(card,s){const msg=card.querySelector('.sp-status');try{msg.textContent='Guardando…';const body=await payload(card,s);const r=await fetch(API+(s.id?`/api/sponsors/admin/${s.id}`:'/api/sponsors/admin'),{method:s.id?'PUT':'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${token()}`},body:JSON.stringify(body)});const d=await r.json().catch(()=>({}));if(!r.ok)throw new Error(d.detail||'No se pudo guardar');msg.textContent='Guardado';await loadPublic();await renderAdmin()}catch(e){msg.textContent=e.message}}
  async function deactivate(id){if(!confirm('¿Desactivar este sponsor?'))return;const r=await fetch(API+`/api/sponsors/admin/${id}`,{method:'DELETE',headers:{Authorization:`Bearer ${token()}`}});if(!r.ok)return alert('No se pudo desactivar el sponsor.');await loadPublic();await renderAdmin()}
  async function renderAdmin(){const p=document.getElementById('defe-sponsors-admin');if(!p)return;const body=p.querySelector('[data-body]');try{const rows=await adminData();body.innerHTML=`<button class="sp-primary" data-new>+ Nuevo sponsor</button>`+rows.map(s=>`<div class="sp-admin-card" data-id="${s.id}"><strong>${esc(s.name)}</strong>${formHtml(s)}<div class="sp-actions"><button class="sp-primary" data-save>Guardar</button><button class="sp-danger" data-off>Desactivar</button></div><div class="sp-status"></div></div>`).join('');body.querySelector('[data-new]').onclick=()=>{const c=document.createElement('div');c.className='sp-admin-card';c.innerHTML='<strong>Nuevo sponsor</strong>'+formHtml({active:true,featured:false,sort_order:rows.length})+'<div class="sp-actions"><button class="sp-primary" data-save>Guardar</button></div><div class="sp-status"></div>';body.insertBefore(c,body.children[1]);c.querySelector('[data-save]').onclick=()=>saveSponsor(c,{})};body.querySelectorAll('[data-id]').forEach(c=>{const s=rows.find(x=>x.id===Number(c.dataset.id));c.querySelector('[data-save]').onclick=()=>saveSponsor(c,s);c.querySelector('[data-off]').onclick=()=>deactivate(s.id)})}catch(e){body.textContent=e.message}}
  function openAdmin(){if(role()!=='admin')return;let p=document.getElementById('defe-sponsors-admin');if(!p){p=document.createElement('div');p.id='defe-sponsors-admin';p.innerHTML='<div class="da-top"><button class="da-back" data-close>‹</button><div class="da-title">Gestión de Sponsors</div></div><div class="sp-admin-wrap"><div class="da-sub" style="padding:0 0 12px">Alta, edición, logo, orden y enlaces.</div><div data-body>Cargando…</div></div>';document.body.appendChild(p);p.querySelector('[data-close]').onclick=()=>p.remove()}renderAdmin()}

  function pageState(){
    const profile=!!document.querySelector('.defe-profile-page');
    const home=!profile && !![...document.querySelectorAll('div,span,h1,h2,h3')].find(el=>el.childElementCount===0&&String(el.textContent||'').trim()==='Competiciones'&&el.offsetParent!==null);
    return {profile,home};
  }
  function syncFab(){
    const st=pageState();
    let publicBtn=document.getElementById('defe-sponsors-public-fab');
    if(!publicBtn){publicBtn=document.createElement('button');publicBtn.id='defe-sponsors-public-fab';publicBtn.className='da-fab';publicBtn.textContent='🤝 Nos acompañan';publicBtn.onclick=show;document.body.appendChild(publicBtn)}
    publicBtn.hidden=!st.home;
    let adminBtn=document.getElementById('defe-sponsors-admin-fab');
    if(!adminBtn){adminBtn=document.createElement('button');adminBtn.id='defe-sponsors-admin-fab';adminBtn.className='da-fab admin';adminBtn.textContent='🤝 Gestionar Sponsors';adminBtn.onclick=openAdmin;document.body.appendChild(adminBtn)}
    adminBtn.hidden=!(st.profile&&role()==='admin');
  }

  window.defeAcompanantes={show,openAdmin,get sponsors(){return sponsors}};
  loadPublic();
  syncFab();
  setInterval(syncFab,700);
  window.addEventListener('focus',syncFab);
})();