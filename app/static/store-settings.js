// El Defe · Configuración editable de Tienda
(function(){
  if(window.__defeStoreSettingsModuleLoaded)return;
  window.__defeStoreSettingsModuleLoaded=true;
  const API=()=>window.EL_DEFE_API_URL||'';
  const token=()=>localStorage.getItem('defe_token')||'';
  const role=()=>localStorage.getItem('defe_role')||'';
  let ensuring=false;
  async function api(path,opts={}){opts.headers=opts.headers||{};if(token())opts.headers.Authorization='Bearer '+token();const r=await fetch(API()+path,{...opts,cache:'no-store'}),j=await r.json().catch(()=>({}));if(!r.ok)throw new Error(j.detail||'Error');return j;}
  function removeDuplicates(){const nodes=[...document.querySelectorAll('#storeWhatsappSetting')];nodes.slice(1).forEach(n=>n.remove());}
  async function ensureAdminSetting(){
    if(ensuring||!['admin','delegado'].includes(role()))return;
    const card=document.getElementById('storeAdminCard');if(!card)return;
    removeDuplicates();
    if(document.getElementById('storeWhatsappSetting'))return;
    ensuring=true;
    let current='';
    try{current=(await api('/api/store/admin/settings')).whatsapp_number||'';}catch{return;}finally{ensuring=false;}
    removeDuplicates();
    if(document.getElementById('storeWhatsappSetting'))return;
    const box=document.createElement('div');box.id='storeWhatsappSetting';box.style.margin='12px 0 4px';box.innerHTML=`<div style="padding:12px;border:1px solid var(--line);border-radius:16px"><div class="row"><div><b>WhatsApp de pedidos</b><div class="meta">Número que recibe consultas y pedidos de la Tienda.</div></div><span class="badge">EDITABLE</span></div><input id="storeWhatsappInput" inputmode="tel" placeholder="Ej. 5491140811194" value="${current}"><button id="storeWhatsappSave" class="light" style="margin-top:8px">Guardar número</button><div id="storeWhatsappMsg" class="meta"></div></div>`;
    const newBtn=document.getElementById('storeNewProduct');card.insertBefore(box,newBtn);
    document.getElementById('storeWhatsappSave').onclick=async()=>{const msg=document.getElementById('storeWhatsappMsg');msg.textContent='Guardando…';try{const j=await api('/api/store/admin/settings',{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({whatsapp_number:document.getElementById('storeWhatsappInput').value})});document.getElementById('storeWhatsappInput').value=j.whatsapp_number;msg.textContent='Número guardado.';}catch(e){msg.textContent=e.message;}};
  }
  document.addEventListener('click',async e=>{
    const btn=e.target?.closest?.('#storeWhatsBtn');if(!btn||typeof window.defeStoreOpenWhatsApp!=='function')return;
    e.preventDefault();e.stopImmediatePropagation();const name=document.querySelector('#storeDetailBody h2')?.textContent?.trim()||'este producto';await window.defeStoreOpenWhatsApp(`Hola, quiero consultar por ${name}.`);
  },true);
  function init(){const mo=new MutationObserver(()=>{removeDuplicates();ensureAdminSetting();});mo.observe(document.body,{childList:true,subtree:true});removeDuplicates();setTimeout(ensureAdminSetting,600);}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();