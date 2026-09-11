import fs from 'node:fs';
import path from 'node:path';

const assets=path.join('defe-web-build','dist','assets');
const jsFile=fs.readdirSync(assets).find(f=>/^index-.*\.js$/.test(f));
if(!jsFile) throw new Error('No se encontró bundle JS');
const jsPath=path.join(assets,jsFile);
let js=fs.readFileSync(jsPath,'utf8');

const oldStart='x=async()=>{c(!0);const{pedido:_,error:y}=await r({...s,retiro:p[s.retiro],total:e.total,items:e.items});if(c(!1),y||!_)return d("No pudimos registrar el pedido. Probá de nuevo.");const f=w(_.nro);o({nro:_.nro,texto:f}),window.open(`https://wa.me/${(n==null?void 0:n.whatsapp)||""}?text=${encodeURIComponent(f)}`,"_blank","noopener")};';

const newStart='x=()=>{c(!0),d(null);try{const _=e.items.map(y=>({product_id:Number(y.productoId),size:y.talle,qty:y.cant})),Y=document.createElement("form");Y.method="POST",Y.action="https://el-defe-v5-production.up.railway.app/api/store/orders/submit",Y.style.display="none";const R={buyer_name:s.nombre.trim(),buyer_phone:s.telefono.trim(),buyer_category:s.categoria||"",buyer_note:s.nota||"",items:JSON.stringify(_)};Object.entries(R).forEach(([N,f])=>{const W=document.createElement("input");W.type="hidden",W.name=N,W.value=f,Y.appendChild(W)}),document.body.appendChild(Y),Y.submit()}catch(_){c(!1),d(((_==null?void 0:_.message)||"No pudimos registrar el pedido. Probá de nuevo."))}};';

if(!js.includes(oldStart)) throw new Error('No se encontró el checkout nativo esperado');
js=js.replace(oldStart,newStart);

const patchedClick='onClick:(...Q)=>typeof window.defeStoreCheckout==="function"?window.defeStoreCheckout():x(...Q)';
if(js.includes(patchedClick)) js=js.replace(patchedClick,'onClick:x');

js+='\n/* DEFE_STORE_NATIVE_FORM_V2 */\n';
fs.writeFileSync(jsPath,js);
console.log('Checkout nativo de Tienda cambiado a POST HTML + redirect a WhatsApp.');
