// El Defe · UX hotfix 2026-09-12 v2: selector de ligas + torneos + ingreso real
(() => {
  const API='https://el-defe-v5-production.up.railway.app';
  const MARK='DEFE_UI_HOTFIX_20260912_V2';
  const superLigaSvg=`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120"><rect width="120" height="120" rx="18" fill="#fff"/><circle cx="60" cy="60" r="43" fill="none" stroke="#16b7d7" stroke-width="4"/><circle cx="60" cy="60" r="33" fill="none" stroke="#16b7d7" stroke-width="2"/><text x="60" y="29" text-anchor="middle" font-family="Arial,sans-serif" font-size="8" font-weight="700" fill="#16b7d7">SUPER LIGA FUTSAL</text><path d="M43 51l17-10 17 10-6 20H49z" fill="none" stroke="#16b7d7" stroke-width="3"/><path d="M62 48l-9 13h8l-4 13 12-17h-8z" fill="#16b7d7"/><text x="60" y="96" text-anchor="middle" font-family="Arial,sans-serif" font-size="10" font-weight="800" fill="#16b7d7">SLF</text></svg>`;
  const SUPERLIGA_LOGO='data:image/svg+xml;charset=UTF-8,'+encodeURIComponent(superLigaSvg);

  function active(btn){return !!btn&&btn.classList.contains('btn');}
  function compName(c){return c==='FEFI'?'FEFI':c==='LAAMBA'?'LAAMBA':c==='ARGENLIGA'?'Argenliga':'Super Liga';}

  function makeCompVisual(btn,logo){
    if(!btn)return;
    const comp=btn.dataset.comp;
    btn.style.cssText+=';min-height:92px;padding:8px 4px;border-radius:16px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:5px;font-size:10px;overflow:hidden';
    const img=logo?`<img src="${logo}" alt="${compName(comp)}" style="width:58px;height:58px;object-fit:contain;display:block">`:'';
    btn.innerHTML=img+`<span style="font-size:10px;font-weight:900;line-height:1.05">${compName(comp)}</span>`;
  }

  function findDivisionOption(kind){
    const sel=document.getElementById('matchDivisionFilter');
    if(!sel)return null;
    const opts=[...sel.options].filter(o=>o.value!=='ALL');
    if(kind==='baby')return opts.find(o=>/zona\s*h|baby/i.test(o.textContent||o.value))||opts.find(o=>/201[3-9]/.test(o.textContent||''))||opts[0]||null;
    return opts.find(o=>/mayores\s*b|\+?42|senior/i.test(o.textContent||o.value))||null;
  }

  function chooseDivision(kind){
    const sel=document.getElementById('matchDivisionFilter');
    const opt=findDivisionOption(kind);
    if(!sel||!opt)return;
    sel.value=opt.value;
    sel.dispatchEvent(new Event('change',{bubbles:true}));
  }

  function fefiMode(){
    const fefi=document.querySelector('#matchFilters [data-comp="FEFI"]');
    if(!active(fefi))return;
    const card=fefi.closest('.card');
    if(!card||card.querySelector('[data-fefi-mode]'))return;
    const topGrid=fefi.parentElement;
    const mode=document.createElement('div');
    mode.dataset.fefiMode='1';
    mode.style.cssText='display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:10px';
    const sel=document.getElementById('matchDivisionFilter');
    const current=sel?.value||'ALL';
    const babyOpt=findDivisionOption('baby'), futsalOpt=findDivisionOption('futsal');
    const babyActive=current==='ALL'||(babyOpt&&current===babyOpt.value);
    const futsalActive=futsalOpt&&current===futsalOpt.value;
    mode.innerHTML=`<button type="button" data-fefi-kind="baby" class="${babyActive?'btn':'light'}" style="min-height:42px;border-radius:12px;font-weight:900">Baby</button><button type="button" data-fefi-kind="futsal" class="${futsalActive?'btn':'light'}" style="min-height:42px;border-radius:12px;font-weight:900">Futsal +42</button>`;
    topGrid.insertAdjacentElement('afterend',mode);
    mode.querySelector('[data-fefi-kind="baby"]').onclick=()=>chooseDivision('baby');
    mode.querySelector('[data-fefi-kind="futsal"]').onclick=()=>chooseDivision('futsal');
    if(current==='ALL'&&babyOpt)setTimeout(()=>chooseDivision('baby'),0);
  }

  function fixTournamentTabs(){
    const all=document.querySelector('#matchFilters [data-tour="ALL"]');
    if(!all)return;
    const row=all.parentElement;
    const wasActive=active(all);
    all.remove();
    if(row){
      const btns=[...row.querySelectorAll('[data-tour]')];
      row.style.gridTemplateColumns=`repeat(${Math.max(btns.length,1)},minmax(0,1fr))`;
      row.style.gap='8px';
      btns.forEach(b=>{b.style.minHeight='42px';b.style.borderRadius='12px';b.style.fontWeight='900';});
      if(wasActive){
        const preferred=row.querySelector('[data-tour="clausura"]')||row.querySelector('[data-tour="apertura"]')||row.querySelector('[data-tour="anual"]')||btns[0];
        if(preferred)setTimeout(()=>preferred.click(),0);
      }
    }
  }

  function fixLeagueTabs(){
    const filter=document.getElementById('matchFilters');
    if(!filter)return;
    const allBtn=filter.querySelector('[data-comp="ALL"]');
    const fefi=filter.querySelector('[data-comp="FEFI"]');
    if(!fefi)return;
    const grid=fefi.parentElement;
    if(allBtn){
      const wasActive=active(allBtn);
      allBtn.remove();
      if(wasActive)setTimeout(()=>fefi.click(),0);
    }
    if(!grid)return;
    const order=['FEFI','LAAMBA','ARGENLIGA','SUPERLIGA'];
    const buttons=order.map(c=>filter.querySelector(`[data-comp="${c}"]`)).filter(Boolean);
    const existingLogos={};
    buttons.forEach(b=>{const src=b.querySelector('img')?.src;if(src)existingLogos[b.dataset.comp]=src;});
    buttons.forEach(b=>grid.appendChild(b));
    [...grid.querySelectorAll('[data-comp]')].forEach(b=>{if(!order.includes(b.dataset.comp))b.remove();});
    grid.style.gridTemplateColumns='repeat(4,minmax(0,1fr))';
    grid.style.gap='8px';
    buttons.forEach(b=>makeCompVisual(b,b.dataset.comp==='SUPERLIGA'?SUPERLIGA_LOGO:existingLogos[b.dataset.comp]));
    fefiMode();
    fixTournamentTabs();
  }

  function closeLogin(){document.querySelector('[data-defe-login-modal]')?.remove();}

  function openLogin(){
    if(document.querySelector('[data-defe-login-modal]'))return;
    const modal=document.createElement('div');
    modal.dataset.defeLoginModal=MARK;
    modal.style.cssText='position:fixed;inset:0;z-index:100000;background:rgba(8,28,58,.64);display:flex;align-items:center;justify-content:center;padding:20px';
    modal.innerHTML=`<div style="width:min(420px,100%);background:#fff;border-radius:24px;padding:24px;box-shadow:0 24px 60px #0004;color:#17365f">
      <div style="display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:6px">
        <div><div style="font-size:12px;font-weight:900;letter-spacing:.08em;color:#0b4a8f">CLUB ATLÉTICO DEFENSORES DE SANTOS LUGARES</div><h2 style="margin:5px 0 0;font-size:28px">Ingresar</h2></div>
        <button data-close aria-label="Cerrar" style="border:0;background:#eef3f8;border-radius:999px;width:38px;height:38px;font-size:20px;color:#17365f">×</button>
      </div>
      <p style="margin:0 0 18px;color:#718096;font-size:14px">Ingresá con tu usuario para acceder a las funciones de gestión.</p>
      <form data-form>
        <label style="display:block;font-size:12px;font-weight:900;margin:0 0 6px">Correo electrónico</label>
        <input name="username" type="email" autocomplete="username" required style="box-sizing:border-box;width:100%;padding:13px 14px;border:1px solid #d7e0ea;border-radius:12px;font-size:16px;margin-bottom:14px;outline:none" placeholder="tu@email.com">
        <label style="display:block;font-size:12px;font-weight:900;margin:0 0 6px">Contraseña</label>
        <input name="password" type="password" autocomplete="current-password" required style="box-sizing:border-box;width:100%;padding:13px 14px;border:1px solid #d7e0ea;border-radius:12px;font-size:16px;margin-bottom:10px;outline:none" placeholder="Contraseña">
        <div data-msg style="min-height:20px;color:#b42318;font-size:13px;margin:3px 0 8px"></div>
        <button type="submit" data-submit style="width:100%;border:0;border-radius:13px;padding:13px 16px;background:#0b4a8f;color:#fff;font-weight:900;font-size:16px">Ingresar</button>
      </form>
    </div>`;
    document.body.appendChild(modal);
    modal.querySelector('[data-close]').onclick=closeLogin;
    modal.addEventListener('click',e=>{if(e.target===modal)closeLogin();});
    const form=modal.querySelector('[data-form]'),msg=modal.querySelector('[data-msg]'),submit=modal.querySelector('[data-submit]');
    form.onsubmit=async e=>{
      e.preventDefault();msg.textContent='';submit.disabled=true;submit.textContent='Ingresando…';
      try{
        const fd=new FormData(form),body=new URLSearchParams();
        body.set('username',String(fd.get('username')||'').trim());body.set('password',String(fd.get('password')||''));
        const r=await fetch(API+'/api/auth/login',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:body.toString()});
        const data=await r.json().catch(()=>({}));if(!r.ok)throw new Error(data.detail||'No se pudo iniciar sesión');
        localStorage.setItem('defe_auth_token',data.access_token);localStorage.setItem('defe_auth_user',JSON.stringify(data.user||{}));
        closeLogin();location.reload();
      }catch(err){msg.textContent=String(err?.message||err);submit.disabled=false;submit.textContent='Ingresar';}
    };
    setTimeout(()=>modal.querySelector('input[name="username"]')?.focus(),50);
  }

  function installLoginIntercept(){
    document.addEventListener('click',e=>{
      const el=e.target.closest('button,a,[role="button"]');if(!el)return;
      const txt=String(el.textContent||'').trim().replace(/\s+/g,' ');
      if(!/^Ingresar$/i.test(txt))return;
      e.preventDefault();e.stopImmediatePropagation();openLogin();
    },true);
  }

  function run(){
    document.documentElement.dataset.defeUiHotfix=MARK;
    fixLeagueTabs();installLoginIntercept();
    const obs=new MutationObserver(()=>fixLeagueTabs());
    obs.observe(document.body,{subtree:true,childList:true});
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',run,{once:true});else run();
})();
