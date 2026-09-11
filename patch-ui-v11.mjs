import fs from 'node:fs';
import path from 'node:path';

const dist='defe-web-build/dist';
const assets=path.join(dist,'assets');
const jsFile=fs.readdirSync(assets).find(f=>/^index-.*\.js$/.test(f));
if(!jsFile) throw new Error('No se encontró el bundle JS');
const jsPath=path.join(assets,jsFile);
let js=fs.readFileSync(jsPath,'utf8');

// V12: partir del bundle V10 real. El editor de categorías tiene estado propio.
const oldState='const[q,Q]=C.useState(!1),[A,P]=C.useState(()=>[...e]);C.useEffect(()=>{P([...e])},[e.join("|")]);return u.jsxs("div",{className:"defe-home space-y-5 px-4 pb-6",children:[';
const newState='const[q,Q]=C.useState(()=>e.length===0),[A,P]=C.useState(()=>[...e]);C.useEffect(()=>{P([...e])},[e.join("|")]);return u.jsxs("div",{className:"defe-home space-y-5 px-4 pb-6",children:[';
if(!js.includes(oldState)) throw new Error('No se encontró estado V10 de Home');
js=js.replace(oldState,newState);

// En V10 el selector era siempre visible. Desde V12 depende sólo de q.
const oldSelector='u.jsxs("div",{className:"defe-category-card defe-category-card-v10 rounded-3xl",children:[';
const newSelector='q&&u.jsxs("div",{className:"defe-category-card defe-category-card-v10 rounded-3xl",children:[';
if(!js.includes(oldSelector)) throw new Error('No se encontró selector V10 visible');
js=js.replace(oldSelector,newSelector);

// Guardar: primero cerrar visualmente, después persistir.
const oldSave='onClick:()=>F(A),disabled:A.length===0,className:"defe-category-save",children:"Guardar selección"';
const newSave='onClick:()=>{Q(!1),F(A)},disabled:A.length===0,className:"defe-category-save",children:"Guardar selección"';
if(!js.includes(oldSave)) throw new Error('No se encontró botón Guardar selección V10');
js=js.replace(oldSave,newSave);

// Bajo Próxima fecha, el check deja de ser sólo decorativo y reabre el editor.
const oldMark='u.jsx("span",{className:"defe-selected-mark",children:"✓"})';
const newMark='u.jsx("button",{type:"button",onClick:()=>{P([...e]),Q(!0)},className:"defe-selected-mark defe-selected-edit","aria-label":"Cambiar categorías",children:"✓"})';
if(!js.includes(oldMark)) throw new Error('No se encontró check informativo V10');
js=js.split(oldMark).join(newMark);

js+='\n/* DEFE_UI_V12_20260909 EXPLICIT_CATEGORY_EDITOR_STATE */\n';
fs.writeFileSync(jsPath,js);

const cssFile=fs.readdirSync(assets).find(f=>/^index-.*\.css$/.test(f));
if(cssFile){
  const cssPath=path.join(assets,cssFile);
  let css=fs.readFileSync(cssPath,'utf8');
  css+='\n/* DEFE UI V12 */\n.defe-selected-edit{border:none;cursor:pointer}.defe-selected-edit:active{transform:scale(.95)}\n';
  fs.writeFileSync(cssPath,css);
}

const indexPath=path.join(dist,'index.html');
let html=fs.readFileSync(indexPath,'utf8');
html=html.replace(/<meta name="defe-brand" content="[^"]*"\s*\/>/,'<meta name="defe-brand" content="v12-20260909" />');

const sponsorLogoHelper=`<script>(function(){
  if(window.__defeSponsorLogoHelper)return;window.__defeSponsorLogoHelper=true;
  const API='https://el-defe-v5-production.up.railway.app';
  let rowsCache=null,rowsAt=0;
  function jwtFromValue(value){if(!value||typeof value!=='string')return null;const m=value.match(/eyJ[a-zA-Z0-9_-]+\\.[a-zA-Z0-9_-]+\\.[a-zA-Z0-9_-]+/);if(m)return m[0];try{const p=JSON.parse(value);if(typeof p==='string')return jwtFromValue(p);if(p&&typeof p==='object')for(const v of Object.values(p)){const f=jwtFromValue(typeof v==='string'?v:JSON.stringify(v));if(f)return f}}catch(_){}return null}
  function token(){for(const st of [localStorage,sessionStorage])for(let i=0;i<st.length;i++){const t=jwtFromValue(st.getItem(st.key(i)));if(t)return t}return null}
  async function rows(){if(rowsCache&&Date.now()-rowsAt<3000)return rowsCache;try{const r=await fetch(API+'/api/sponsors/admin',{headers:{Authorization:'Bearer '+token()},cache:'no-store'});if(!r.ok)return [];rowsCache=await r.json();rowsAt=Date.now();return rowsCache}catch(_){return []}}
  function previewBox(input){let box=input.parentElement.querySelector('.sp-logo-preview');if(!box){box=document.createElement('div');box.className='sp-logo-preview';box.style.cssText='margin-top:8px;display:flex;align-items:center;gap:10px;font-size:12px;color:#64748b';input.parentElement.appendChild(box)}return box}
  function showPreview(input,url,label){const box=previewBox(input);box.innerHTML='';if(url){const img=document.createElement('img');img.src=url;img.alt='Logo';img.style.cssText='width:72px;height:52px;object-fit:contain;border:1px solid #dbe4ef;border-radius:10px;background:#fff;padding:4px';box.appendChild(img)}const span=document.createElement('span');span.textContent=label;box.appendChild(span)}
  async function compress(file){return await new Promise((resolve,reject)=>{const fr=new FileReader();fr.onerror=reject;fr.onload=()=>{const img=new Image();img.onerror=reject;img.onload=()=>{const max=512,scale=Math.min(1,max/Math.max(img.width,img.height)),w=Math.max(1,Math.round(img.width*scale)),h=Math.max(1,Math.round(img.height*scale));const c=document.createElement('canvas');c.width=w;c.height=h;const ctx=c.getContext('2d');ctx.clearRect(0,0,w,h);ctx.drawImage(img,0,0,w,h);c.toBlob(blob=>{if(!blob)return reject(new Error('No se pudo procesar el logo'));resolve(new File([blob],'logo.webp',{type:'image/webp'}))},'image/webp',0.86)};img.src=fr.result};fr.readAsDataURL(file)})}
  async function bindInput(input,row){if(input.dataset.logoHelperBound)return;input.dataset.logoHelperBound='1';if(row&&row.logo_url)showPreview(input,row.logo_url,'Logo guardado');else showPreview(input,null,'Sin logo guardado');input.addEventListener('change',async()=>{const file=input.files&&input.files[0];if(!file)return;input.dataset.processing='1';showPreview(input,URL.createObjectURL(file),'Preparando logo…');try{const compact=await compress(file);const dt=new DataTransfer();dt.items.add(compact);input.files=dt.files;showPreview(input,URL.createObjectURL(compact),'Logo listo para guardar')}catch(e){showPreview(input,null,e.message||'No se pudo procesar el logo')}finally{delete input.dataset.processing}})}
  async function enhance(){const panel=document.getElementById('defe-sponsors-admin');if(!panel)return;const data=await rows();panel.querySelectorAll('.sp-admin-card').forEach(card=>{const input=card.querySelector('input[data-f="logo_file"]');if(!input)return;const id=Number(card.dataset.id||0),row=data.find(x=>x.id===id);bindInput(input,row)});}
  document.addEventListener('click',e=>{const save=e.target.closest('#defe-sponsors-admin [data-save]');if(!save)return;const card=save.closest('.sp-admin-card'),input=card&&card.querySelector('input[data-f="logo_file"]');if(input&&input.dataset.processing==='1'){e.preventDefault();e.stopImmediatePropagation();alert('Esperá un segundo mientras preparamos el logo.');}},true);
  new MutationObserver(()=>{clearTimeout(window.__defeSponsorLogoTimer);window.__defeSponsorLogoTimer=setTimeout(enhance,80)}).observe(document.body,{childList:true,subtree:true});
  window.addEventListener('focus',enhance);setTimeout(enhance,300);
})();</script>`;
html=html.replace('</body>',sponsorLogoHelper+'</body>');
fs.writeFileSync(indexPath,html);

console.log('UI V12 aplicada: Guardar cierra el selector, el check permite reabrirlo y Sponsors mejora logos.');
