// El Defe · UX hotfix 2026-09-12 v4: Competencias visual + FEFI unificado + categorías
(() => {
  const API='https://el-defe-v5-production.up.railway.app';
  const MARK='DEFE_UI_HOTFIX_20260912_V4';
  let observerTimer=null;
  const FEFI_BABY_CATS=['2013','2014','2015','2016','2017','2018','2019'];
  const superLigaSvg=`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120"><rect width="120" height="120" rx="18" fill="#fff"/><circle cx="60" cy="60" r="43" fill="none" stroke="#16b7d7" stroke-width="4"/><circle cx="60" cy="60" r="33" fill="none" stroke="#16b7d7" stroke-width="2"/><text x="60" y="29" text-anchor="middle" font-family="Arial,sans-serif" font-size="8" font-weight="700" fill="#16b7d7">SUPER LIGA FUTSAL</text><path d="M43 51l17-10 17 10-6 20H49z" fill="none" stroke="#16b7d7" stroke-width="3"/><path d="M62 48l-9 13h8l-4 13 12-17h-8z" fill="#16b7d7"/><text x="60" y="96" text-anchor="middle" font-family="Arial,sans-serif" font-size="10" font-weight="800" fill="#16b7d7">SLF</text></svg>`;
  const SUPERLIGA_LOGO='data:image/svg+xml;charset=UTF-8,'+encodeURIComponent(superLigaSvg);

  function active(btn){return !!btn&&btn.classList.contains('btn');}
  function compName(c){return c==='FEFI'?'FEFI':c==='LAAMBA'?'LAAMBA':c==='ARGENLIGA'?'Argenliga':'Super Liga';}
  function compSubtitle(c){return c==='FEFI'?'Baby Fútbol y Futsal +42':c==='LAAMBA'?'Futsal M y F':c==='ARGENLIGA'?'Futsal Masculino':'Futsal Junior';}

  function makeCompVisual(btn,logo){
    if(!btn)return;
    const comp=btn.dataset.comp;
    btn.dataset.defeVisual='2';
    btn.style.minHeight='116px';btn.style.padding='10px 5px 9px';btn.style.borderRadius='18px';btn.style.display='flex';btn.style.flexDirection='column';btn.style.alignItems='center';btn.style.justifyContent='center';btn.style.gap='5px';btn.style.fontSize='10px';btn.style.overflow='hidden';btn.style.boxShadow='0 3px 12px rgba(11,58,122,.07)';
    const img=logo?`<img src="${logo}" alt="${compName(comp)}" style="width:62px;height:62px;object-fit:contain;display:block">`:'';
    btn.innerHTML=img+`<span style="font-size:11px;font-weight:950;line-height:1.05">${compName(comp)}</span><small style="font-size:8px;line-height:1.15;opacity:.78;font-weight:750">${compSubtitle(comp)}</small>`;
  }

  function findDivisionOption(kind){
    const sel=document.getElementById('matchDivisionFilter');if(!sel)return null;
    const opts=[...sel.options].filter(o=>o.value!=='ALL');
    if(kind==='baby')return opts.find(o=>/zona\s*h|baby/i.test(o.textContent||o.value))||opts.find(o=>/201[3-9]/.test(o.textContent||''))||opts[0]||null;
    return opts.find(o=>/mayores\s*b|\+?42|senior/i.test(o.textContent||o.value))||null;
  }
  function chooseDivision(kind){const sel=document.getElementById('matchDivisionFilter'),opt=findDivisionOption(kind);if(!sel||!opt)return;if(sel.value!==opt.value){sel.value=opt.value;sel.dispatchEvent(new Event('change',{bubbles:true}));}}

  function selectedBabyCategory(){return localStorage.getItem('defe_fefi_baby_category')||'ALL';}
  function chooseBabyCategory(cat){
    localStorage.setItem('defe_fefi_baby_category',cat);
    document.querySelectorAll('[data-fefi-cat]').forEach(b=>{const on=b.dataset.fefiCat===cat;b.className=on?'btn':'light';});
    const table=document.getElementById('fefiCategoryTable');
    if(table){const wanted=cat==='ALL'?'GENERAL':cat;const opt=[...table.options].find(o=>o.value===wanted);if(opt&&table.value!==wanted){table.value=wanted;table.dispatchEvent(new Event('change',{bubbles:true}));}}
  }

  function renderBabyCategories(host){
    if(!host||host.querySelector('[data-fefi-categories]'))return;
    const selected=selectedBabyCategory();
    const wrap=document.createElement('div');wrap.dataset.fefiCategories='1';wrap.style.cssText='margin-top:10px;padding:10px;border-radius:16px;background:#f8fbff;border:1px solid #e2eaf3';
    wrap.innerHTML=`<div style="font-size:10px;font-weight:950;color:#17365f;margin-bottom:7px">Categoría · Baby Fútbol</div><div style="display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:6px"><button type="button" data-fefi-cat="ALL" class="${selected==='ALL'?'btn':'light'}" style="padding:8px 4px;border-radius:11px;font-size:9px">Todas</button>${FEFI_BABY_CATS.map(c=>`<button type="button" data-fefi-cat="${c}" class="${selected===c?'btn':'light'}" style="padding:8px 4px;border-radius:11px;font-size:9px">${c}</button>`).join('')}</div></div>`;
    host.appendChild(wrap);wrap.querySelectorAll('[data-fefi-cat]').forEach(b=>b.onclick=()=>chooseBabyCategory(b.dataset.fefiCat));
    setTimeout(()=>chooseBabyCategory(selected),0);
  }

  function fefiMode(){
    const fefi=document.querySelector('#matchFilters [data-comp="FEFI"]');if(!active(fefi))return;
    const card=fefi.closest('.card');if(!card)return;
    let mode=card.querySelector('[data-fefi-mode]');
    const sel=document.getElementById('matchDivisionFilter'),current=sel?.value||'ALL',babyOpt=findDivisionOption('baby'),futsalOpt=findDivisionOption('futsal');
    const futsalActive=!!(futsalOpt&&current===futsalOpt.value),babyActive=!futsalActive;
    if(!mode){mode=document.createElement('div');mode.dataset.fefiMode='1';mode.style.cssText='margin-top:11px';fefi.parentElement.insertAdjacentElement('afterend',mode);}
    mode.innerHTML=`<div style="font-size:10px;font-weight:950;color:#17365f;margin-bottom:7px">Seleccioná la categoría</div><div style="display:grid;grid-template-columns:1fr 1fr;gap:8px"><button type="button" data-fefi-kind="baby" class="${babyActive?'btn':'light'}" style="min-height:54px;border-radius:14px;font-weight:950"><span style="display:block;font-size:12px">Baby Fútbol</span><small style="display:block;font-size:8px;margin-top:2px;opacity:.8">FEFI · Zona H</small></button><button type="button" data-fefi-kind="futsal" class="${futsalActive?'btn':'light'}" style="min-height:54px;border-radius:14px;font-weight:950"><span style="display:block;font-size:12px">Futsal +42</span><small style="display:block;font-size:8px;margin-top:2px;opacity:.8">FEFI · Mayores B</small></button></div>`;
    const babyBtn=mode.querySelector('[data-fefi-kind="baby"]'),futsalBtn=mode.querySelector('[data-fefi-kind="futsal"]');
    babyBtn.onclick=()=>{chooseDivision('baby');setTimeout(scheduleFix,60);};
    futsalBtn.onclick=()=>{chooseDivision('futsal');setTimeout(scheduleFix,60);};
    if(babyActive)renderBabyCategories(mode);
    if(current==='ALL'&&babyOpt)setTimeout(()=>chooseDivision('baby'),0);
  }

  function fixTournamentTabs(){
    const all=document.querySelector('#matchFilters [data-tour="ALL"]');if(!all)return;
    const row=all.parentElement,wasActive=active(all);all.remove();
    if(!row)return;
    const btns=[...row.querySelectorAll('[data-tour]')];row.style.gridTemplateColumns=`repeat(${Math.max(btns.length,1)},minmax(0,1fr))`;row.style.gap='8px';btns.forEach(b=>{b.style.minHeight='42px';b.style.borderRadius='12px';b.style.fontWeight='900';});
    if(wasActive){const preferred=row.querySelector('[data-tour="clausura"]')||row.querySelector('[data-tour="apertura"]')||row.querySelector('[data-tour="anual"]')||btns[0];if(preferred)setTimeout(()=>preferred.click(),0);}
  }

  function fixLeagueTabs(){
    const filter=document.getElementById('matchFilters');if(!filter)return;
    const allBtn=filter.querySelector('[data-comp="ALL"]'),fefi=filter.querySelector('[data-comp="FEFI"]');if(!fefi)return;
    const grid=fefi.parentElement;
    if(allBtn){const wasActive=active(allBtn);allBtn.remove();if(wasActive){setTimeout(()=>fefi.click(),0);return;}}
    if(!grid)return;
    const order=['FEFI','LAAMBA','ARGENLIGA','SUPERLIGA'];
    const buttons=order.map(c=>filter.querySelector(`[data-comp="${c}"]`)).filter(Boolean);
    // Elimina cualquier tile legacy u órfano (incluido el segundo ícono FEFI sin etiqueta).
    [...grid.children].forEach(node=>{if(!buttons.includes(node))node.remove();});
    buttons.forEach(b=>grid.appendChild(b));
    grid.style.gridTemplateColumns='repeat(4,minmax(0,1fr))';grid.style.gap='8px';
    buttons.forEach(b=>{const existing=b.querySelector('img')?.src||'';makeCompVisual(b,b.dataset.comp==='SUPERLIGA'?SUPERLIGA_LOGO:existing);});
    fefiMode();fixTournamentTabs();
  }

  function closeLogin(){document.querySelector('[data-defe-login-modal]')?.remove();}
  function openLogin(){
    if(document.querySelector('[data-defe-login-modal]'))return;
    const modal=document.createElement('div');modal.dataset.defeLoginModal=MARK;modal.style.cssText='position:fixed;inset:0;z-index:100000;background:rgba(8,28,58,.64);display:flex;align-items:center;justify-content:center;padding:20px';
    modal.innerHTML=`<div style="width:min(420px,100%);background:#fff;border-radius:24px;padding:24px;box-shadow:0 24px 60px #0004;color:#17365f"><div style="display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:6px"><div><div style="font-size:12px;font-weight:900;letter-spacing:.08em;color:#0b4a8f">CLUB ATLÉTICO DEFENSORES DE SANTOS LUGARES</div><h2 style="margin:5px 0 0;font-size:28px">Ingresar</h2></div><button data-close aria-label="Cerrar" style="border:0;background:#eef3f8;border-radius:999px;width:38px;height:38px;font-size:20px;color:#17365f">×</button></div><p style="margin:0 0 18px;color:#718096;font-size:14px">Ingresá con tu usuario para acceder a las funciones de gestión.</p><form data-form><label style="display:block;font-size:12px;font-weight:900;margin:0 0 6px">Correo electrónico</label><input name="username" type="email" autocomplete="username" required style="box-sizing:border-box;width:100%;padding:13px 14px;border:1px solid #d7e0ea;border-radius:12px;font-size:16px;margin-bottom:14px;outline:none" placeholder="tu@email.com"><label style="display:block;font-size:12px;font-weight:900;margin:0 0 6px">Contraseña</label><input name="password" type="password" autocomplete="current-password" required style="box-sizing:border-box;width:100%;padding:13px 14px;border:1px solid #d7e0ea;border-radius:12px;font-size:16px;margin-bottom:10px;outline:none" placeholder="Contraseña"><div data-msg style="min-height:20px;color:#b42318;font-size:13px;margin:3px 0 8px"></div><button type="submit" data-submit style="width:100%;border:0;border-radius:13px;padding:13px 16px;background:#0b4a8f;color:#fff;font-weight:900;font-size:16px">Ingresar</button></form></div>`;
    document.body.appendChild(modal);modal.querySelector('[data-close]').onclick=closeLogin;modal.addEventListener('click',e=>{if(e.target===modal)closeLogin();});
    const form=modal.querySelector('[data-form]'),msg=modal.querySelector('[data-msg]'),submit=modal.querySelector('[data-submit]');
    form.onsubmit=async e=>{e.preventDefault();msg.textContent='';submit.disabled=true;submit.textContent='Ingresando…';try{const fd=new FormData(form),body=new URLSearchParams();body.set('username',String(fd.get('username')||'').trim());body.set('password',String(fd.get('password')||''));const r=await fetch(API+'/api/auth/login',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:body.toString()});const data=await r.json().catch(()=>({}));if(!r.ok)throw new Error(data.detail||'No se pudo iniciar sesión');localStorage.setItem('defe_auth_token',data.access_token);localStorage.setItem('defe_auth_user',JSON.stringify(data.user||{}));closeLogin();location.reload();}catch(err){msg.textContent=String(err?.message||err);submit.disabled=false;submit.textContent='Ingresar';}};
    setTimeout(()=>modal.querySelector('input[name="username"]')?.focus(),50);
  }
  function installLoginIntercept(){document.addEventListener('click',e=>{const el=e.target.closest('button,a,[role="button"]');if(!el)return;const txt=String(el.textContent||'').trim().replace(/\s+/g,' ');if(!/^Ingresar$/i.test(txt))return;e.preventDefault();e.stopImmediatePropagation();openLogin();},true);}
  function scheduleFix(){clearTimeout(observerTimer);observerTimer=setTimeout(fixLeagueTabs,30);}
  function run(){document.documentElement.dataset.defeUiHotfix=MARK;fixLeagueTabs();installLoginIntercept();const obs=new MutationObserver(scheduleFix);obs.observe(document.body,{subtree:true,childList:true});}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',run,{once:true});else run();
})();
