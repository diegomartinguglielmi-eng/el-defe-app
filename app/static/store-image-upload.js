// El Defe · carga directa de fotos para Gestión de Tienda
(function(){
  if(window.__defeStoreImageUploadLoaded)return;
  window.__defeStoreImageUploadLoaded=true;
  const MAX_SOURCE=8*1024*1024, MAX_DIM=1400, QUALITY=.84;
  const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));

  function fileToDataURL(file){return new Promise((resolve,reject)=>{const r=new FileReader();r.onload=()=>resolve(r.result);r.onerror=reject;r.readAsDataURL(file);});}
  function loadImage(src){return new Promise((resolve,reject)=>{const i=new Image();i.onload=()=>resolve(i);i.onerror=reject;i.src=src;});}
  async function optimize(file){
    if(!file?.type?.startsWith('image/'))throw new Error('Elegí una imagen válida.');
    if(file.size>MAX_SOURCE)throw new Error('La foto supera 8 MB. Elegí una imagen más liviana.');
    const src=await fileToDataURL(file),img=await loadImage(src);
    const scale=Math.min(1,MAX_DIM/Math.max(img.naturalWidth||img.width,img.naturalHeight||img.height));
    const w=Math.max(1,Math.round((img.naturalWidth||img.width)*scale)),h=Math.max(1,Math.round((img.naturalHeight||img.height)*scale));
    const canvas=document.createElement('canvas');canvas.width=w;canvas.height=h;
    const ctx=canvas.getContext('2d');ctx.drawImage(img,0,0,w,h);
    return canvas.toDataURL('image/jpeg',QUALITY);
  }

  function enhanceForm(){
    const box=document.getElementById('storeAdminForm');
    const url=document.getElementById('sapImage')||document.getElementById('spImage');
    if(!box||!url||document.getElementById('spImageUploadWrap'))return;
    const wrap=document.createElement('div');wrap.id='spImageUploadWrap';wrap.style.margin='6px 0 12px';
    wrap.innerHTML=`<div style="font-size:11px;font-weight:900;margin-bottom:6px">Foto del producto</div>
      <label class="light" style="display:block;text-align:center;cursor:pointer">📷 Elegir foto desde el teléfono<input id="spImageFile" type="file" accept="image/*" style="display:none"></label>
      <div id="spImagePreview" style="margin-top:8px"></div>
      <button id="spImageRemove" type="button" class="light" style="margin-top:8px;display:none">Quitar foto</button>
      <div id="spImageUploadMsg" class="meta">La foto se optimiza automáticamente antes de guardarse.</div>`;
    url.parentNode.insertBefore(wrap,url);
    url.placeholder='O pegá una URL de foto';
    const file=document.getElementById('spImageFile'),preview=document.getElementById('spImagePreview'),remove=document.getElementById('spImageRemove'),msg=document.getElementById('spImageUploadMsg');
    function paint(){const v=url.value.trim();preview.innerHTML=v?`<img src="${esc(v)}" alt="Vista previa" style="width:100%;max-height:240px;object-fit:contain;border-radius:14px;border:1px solid var(--line);background:#f6f4ff">`:'';remove.style.display=v?'block':'none';url.style.display=v.startsWith('data:image/')?'none':'';}
    file.onchange=async()=>{const f=file.files?.[0];if(!f)return;msg.textContent='Procesando foto…';try{url.value=await optimize(f);url.dispatchEvent(new Event('input',{bubbles:true}));paint();msg.textContent='Foto lista. Tocá “Guardar producto” para publicarla.';}catch(e){msg.textContent=e.message||'No se pudo procesar la foto.';file.value='';}};
    remove.onclick=()=>{url.value='';file.value='';url.dispatchEvent(new Event('input',{bubbles:true}));paint();msg.textContent='Foto eliminada del formulario. Guardá el producto para aplicar el cambio.';};
    url.addEventListener('input',paint);paint();
  }

  function init(){
    enhanceForm();
    const root=document.getElementById('adminTools')||document.body;
    new MutationObserver(()=>enhanceForm()).observe(root,{childList:true,subtree:true});
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();