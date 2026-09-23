// DEFE_FAMILY_MATCH_CALLUP_MERGE_V1
// Unifica visualmente el partido FEFI y su convocatoria en Inicio Familia.
(()=>{
  if(window.__defeFamilyMatchCallupMergeV1)return; window.__defeFamilyMatchCallupMergeV1=true;
  const norm=s=>String(s||'').replace(/\s+/g,' ').trim().toUpperCase();
  const txt=e=>norm(e?.textContent);
  function cardFor(el){
    let n=el;
    while(n&&n!==document.body){
      const t=txt(n), cs=getComputedStyle(n);
      if(t.length>40&&t.length<900&&parseFloat(cs.borderRadius||'0')>=12&&(cs.backgroundColor!=='rgba(0, 0, 0, 0)'||cs.borderStyle!=='none')) return n;
      n=n.parentElement;
    }
    return null;
  }
  function leaf(re,root=document){
    return [...root.querySelectorAll('div,span,p,strong,b,h1,h2,h3,h4')].find(e=>e.children.length===0&&re.test(txt(e)));
  }
  function sameEvent(a,b){
    const ta=txt(a),tb=txt(b);
    const dateA=(ta.match(/\b20\d{2}[-/]\d{2}[-/]\d{2}\b/)||ta.match(/\b\d{2}[-/]\d{2}\b/)||[])[0];
    const dateB=(tb.match(/\b20\d{2}[-/]\d{2}[-/]\d{2}\b/)||tb.match(/\b\d{2}[-/]\d{2}\b/)||[])[0];
    const rival=/BOYA|C\.\s*A\.\s*I\.|DEF\. DE SANTOS LUGARES/;
    return (!dateA||!dateB||dateA.slice(-5)===dateB.slice(-5)) && rival.test(ta) && rival.test(tb);
  }
  function enhance(){
    const nextLabel=leaf(/PR[ÓO]XIMO PARTIDO.*FEFI/);
    const callLabel=leaf(/^CONVOCATORIA\s*[·•-]/);
    if(!nextLabel||!callLabel)return;
    const next=cardFor(nextLabel), call=cardFor(callLabel);
    if(!next||!call||next===call||!sameEvent(next,call)||next.dataset.callupMerged==='1')return;
    const category=(txt(callLabel).match(/CONVOCATORIA\s*[·•-]\s*(\d{4})/)||[])[1]||'';
    const meta=[...call.querySelectorAll('div,p,span')].find(e=>/CITACI[ÓO]N/.test(txt(e))&&e.children.length<4);
    const actions=[...call.querySelectorAll('div')].find(e=>{
      const t=txt(e); const bs=e.querySelectorAll('button');
      return bs.length>=1 && (/ASISTENCIA CONFIRMADA|NO PUEDO ASISTIR|CONFIRMAR ASISTENCIA|S[IÍ],? VOY/.test(t));
    });
    const section=document.createElement('div');
    section.className='defe-callup-merged';
    section.style.cssText='margin-top:18px;padding-top:16px;border-top:1px solid #e3eaf2';
    section.innerHTML='<div style="font-size:12px;font-weight:900;letter-spacing:.08em;color:#718096;margin-bottom:8px">CONVOCATORIA'+(category?' · '+category:'')+'</div>';
    if(meta){const m=document.createElement('div');m.style.cssText='font-size:15px;line-height:1.4;color:#1d4f7d;margin-bottom:12px';m.textContent=meta.textContent.trim();section.appendChild(m);}
    if(actions){actions.style.marginTop='8px';section.appendChild(actions);}
    else {
      const status=leaf(/ASISTENCIA CONFIRMADA|NO PUEDO ASISTIR|CONFIRMAR ASISTENCIA/,call);
      if(status){const wrap=status.parentElement; if(wrap)section.appendChild(wrap);}
    }
    const detail=[...next.querySelectorAll('a,button')].find(e=>/VER DETALLE/.test(txt(e)));
    if(detail)detail.style.display='none';
    next.appendChild(section);
    next.dataset.callupMerged='1';
    call.style.display='none';
    call.dataset.mergedIntoNext='1';
  }
  let timer;
  const schedule=()=>{clearTimeout(timer);timer=setTimeout(enhance,80)};
  new MutationObserver(schedule).observe(document.body,{childList:true,subtree:true});
  document.addEventListener('visibilitychange',()=>{if(!document.hidden)schedule()});
  window.addEventListener('focus',schedule);
  setTimeout(enhance,250); setTimeout(enhance,1000); setTimeout(enhance,2500);
})();