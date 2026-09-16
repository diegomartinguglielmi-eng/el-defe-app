import fs from 'node:fs';
import path from 'node:path';

const assets=path.join('defe-web-build','dist','assets');
const jsFile=fs.readdirSync(assets).find(f=>/^index-.*\.js$/.test(f));
if(!jsFile) throw new Error('No se encontró bundle JS');
const jsPath=path.join(assets,jsFile);
let js=fs.readFileSync(jsPath,'utf8');

const oldStart='x=async()=>{c(!0);const{pedido:_,error:y}=await r({...s,retiro:p[s.retiro],total:e.total,items:e.items});if(c(!1),y||!_)return d("No pudimos registrar el pedido. Probá de nuevo.");const f=w(_.nro);o({nro:_.nro,texto:f}),window.open(`https://wa.me/${(n==null?void 0:n.whatsapp)||""}?text=${encodeURIComponent(f)}`,"_blank","noopener")};';

const newStart='x=async()=>{c(!0),d(null);try{const Zr=await fetch("https://el-defe-v5-production.up.railway.app/api/store/products?checkout=native-v6",{cache:"no-store"});if(!Zr.ok)throw new Error("No pude leer el catálogo actual de la Tienda.");const Zj=await Zr.json(),Zc=Array.isArray(Zj)?Zj:(Zj.products||Zj.items||Zj.data||[]),Zn=Q=>String(Q??"").normalize("NFD").replace(/[\\u0300-\\u036f]/g,"").toLowerCase().replace(/[^a-z0-9]+/g," ").replace(/\\s+/g," ").trim(),Zslug=Q=>Zn(Q.slug||""),Zname=Q=>Zn(Q.name||Q.nombre||Q.title||Q.product_name||""),Zpick=Q=>{const A=String(Q.nombre??Q.name??Q.producto?.nombre??Q.producto?.name??Q.product?.name??""),B=String(Q.talle??Q.size??Q.medida??Q.variant??""),C=Zn(A);let D="";C.includes("camiseta")&&(C.includes("titular")||C.includes("suplente")||C.includes("alternativa")||C.includes("2026"))?D="camiseta partido":C.includes("short")?D="short partido":C.includes("medias")?D="medias":C.includes("remera")&&C.includes("entrenamiento")?D="remera entrenamiento":C.includes("buzo")?D="buzo":C.includes("campera")?D="campera":C.includes("gorra")&&(D="gorra");let E=D?Zc.find(H=>Zslug(H)===D):null;if(!E)E=Zc.find(H=>Zname(H)===C)||null;if(!E){let H=0;for(const J of Zc){const K=Zname(J).split(" ").filter(L=>L.length>2);if(!K.length)continue;const L=K.filter(M=>C.includes(M)).length/K.length;L>H&&(H=L,E=J)}H<.5&&(E=null)}if(!E)throw new Error("No pude vincular el producto "+A+" con el catálogo actual.");const F=Array.isArray(E.sizes)?E.sizes.map(String):[],G=F.find(H=>Zn(H)===Zn(B))||B;if(F.length&&!F.some(H=>Zn(H)===Zn(B)))throw new Error("Talle inválido para "+(E.name||A)+": "+B);return{product_id:Number(E.id),product_name:E.name||A,size:G,qty:Number(Q.cant??Q.cantidad??Q.qty??Q.quantity??1)||1}},Zi=e.items.map(Zpick);if(!Zi.length)throw new Error("El carrito está vacío.");try{localStorage.setItem("defe_store_buyer_phone",String(s.telefono||"").replace(/\\D/g,""))}catch(e){}const Y=document.createElement("form");Y.method="POST",Y.action="https://el-defe-v5-production.up.railway.app/api/store/orders/submit",Y.style.display="none";const R={buyer_name:s.nombre.trim(),buyer_phone:s.telefono.trim(),buyer_category:s.categoria||"",buyer_note:s.nota||"",items:JSON.stringify(Zi)};Object.entries(R).forEach(([N,f])=>{const W=document.createElement("input");W.type="hidden",W.name=N,W.value=f,Y.appendChild(W)}),document.body.appendChild(Y),sessionStorage.setItem("defe-store-reset-after-order","1"),Y.submit()}catch(_){c(!1),d(((_==null?void 0:_.message)||"No pudimos registrar el pedido. Probá de nuevo."))}};';

if(js.includes('DEFE_STORE_NATIVE_EXACT_V7')){
  console.log('Checkout nativo exacto V7 ya aplicado.');
  process.exit(0);
}

if(!js.includes(oldStart)) throw new Error('No se encontró el checkout nativo esperado en el bundle limpio');
js=js.replace(oldStart,newStart);

const patchedClick='onClick:(...Q)=>typeof window.defeStoreCheckout==="function"?window.defeStoreCheckout():x(...Q)';
if(js.includes(patchedClick)) js=js.replace(patchedClick,'onClick:x');

if(!js.includes('defe-store-reset-after-order')){
  js+='\nwindow.addEventListener("pageshow",()=>{try{if(sessionStorage.getItem("defe-store-reset-after-order")==="1"){sessionStorage.removeItem("defe-store-reset-after-order");location.reload()}}catch(e){}});\n';
}
js+='\n/* DEFE_STORE_NATIVE_EXACT_V7 */\n/* DEFE_STORE_NATIVE_RAILWAY_V1 */\n';
fs.writeFileSync(jsPath,js);
console.log('Checkout nativo V7: carrito React + catálogo Railway vivo + teléfono para Mis pedidos.');
