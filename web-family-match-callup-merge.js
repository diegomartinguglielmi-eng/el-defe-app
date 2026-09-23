// DEFE_FAMILY_MATCH_CALLUP_MERGE_V2
// Inicio Familia: unifica partido + convocatoria y agrega resumen deportivo FEFI.
(()=>{
 if(window.__defeFamilyMatchCallupMergeV2)return; window.__defeFamilyMatchCallupMergeV2=true;
 const API='https://el-defe-v2-staging-production.up.railway.app';
 const CLUB=/DEFENSORES|DEF\. DE SANTOS LUGARES|DEFENSORES DE SL|DEF\. DE STOS?\. LUGARES/i;
 const norm=s=>String(s||'').replace(/\s+/g,' ').trim().toUpperCase(), txt=e=>norm(e?.textContent);
 const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));
 const token=()=>localStorage.getItem('defe_token')||'';
 async function api(path){const h={};if(token())h.Authorization='Bearer '+token();const r=await fetch(API+path,{headers:h,cache:'no-store'});if(!r.ok)throw Error('No disponible');return r.json()}
 function leaf(re,root=document){return [...root.querySelectorAll('div,span,p,strong,b,h1,h2,h3,h4')].find(e=>e.children.length===0&&re.test(txt(e)))}
 function cardFor(el){let n=el;while(n&&n!==document.body){const t=txt(n),cs=getComputedStyle(n);if(t.length>35&&t.length<1400&&parseFloat(cs.borderRadius||'0')>=12)return n;n=n.parentElement}return null}
 function dateKey(t){const iso=t.match(/\b20\d{2}[-/]\d{2}[-/]\d{2}\b/);if(iso)return iso[0].replaceAll('/','-');const d=t.match(/\b(?:S[AÁ]B|DOM|LUN|MAR|MI[EÉ]|JUE|VIE)?\s*(\d{1,2})[-/]([01]?\d)\b/);if(!d)return '';return '2026-'+String(d[2]).padStart(2,'0')+'-'+String(d[1]).padStart(2,'0')}
 function teamsKey(t){const m=t.match(/(DEF\. DE SANTOS LUGARES|DEFENSORES DE SANTOS LUGARES)\s+VS\.?\s+([^\n]+?)(?=\s+(?:S[AÁ]B|DOM|LUN|MAR|MI[EÉ]|JUE|VIE|20\d{2}|CITACI[ÓO]N|SEDE:)|$)/);return m?norm(m[2]).replace(/[^A-Z0-9]/g,''):''}
 function sameEvent(a,b){const ta=txt(a),tb=txt(b),da=dateKey(ta),db=dateKey(tb),ra=teamsKey(ta),rb=teamsKey(tb);return !!da&&da===db&&(!ra||!rb||ra===rb)}
 function merge(){
   const nextLabel=leaf(/PR[ÓO]XIMO PARTIDO\s*[·•-]\s*FEFI/), callLabel=leaf(/^CONVOCATORIA\s*[·•-]\s*\d{4}/);
   if(!nextLabel||!callLabel)return null;
   const next=cardFor(nextLabel),call=cardFor(callLabel); if(!next||!call||next===call||!sameEvent(next,call))return null;
   if(next.dataset.callupMerged!=='1'){
     const category=(txt(callLabel).match(/(20\d{2})/)||[])[1]||'';
     const section=document.createElement('div');section.className='defe-callup-merged';section.style.cssText='margin-top:18px;padding-top:16px;border-top:1px solid #e3eaf2';
     section.innerHTML='<div style="font-size:12px;font-weight:900;letter-spacing:.08em;color:#718096;margin-bottom:8px">CONVOCATORIA'+(category?' · '+category:'')+'</div>';
     const meta=[...call.querySelectorAll('div,p,span')].find(e=>/CITACI[ÓO]N/.test(txt(e))&&e.children.length<4);
     if(meta){const m=document.createElement('div');m.style.cssText='font-size:15px;line-height:1.45;color:#1d4f7d;margin-bottom:12px';m.textContent=meta.textContent.trim();section.appendChild(m)}
     const buttons=[...call.querySelectorAll('button')].filter(b=>/ASISTENCIA CONFIRMADA|NO PUEDO ASISTIR|CONFIRMAR ASISTENCIA|S[IÍ],? VOY/.test(txt(b)));
     if(buttons.length){const row=document.createElement('div');row.style.cssText='display:grid;grid-template-columns:1fr 1fr;gap:10px';buttons.forEach(b=>row.appendChild(b));section.appendChild(row)}
     const detail=[...next.querySelectorAll('a,button')].find(e=>/VER DETALLE/.test(txt(e)));if(detail)detail.remove();
     next.appendChild(section);next.dataset.callupMerged='1';call.style.display='none';
   }
   return {next,category:(txt(callLabel).match(/(20\d{2})/)||[])[1]||'2013'}
 }
 async function sports(anchor,category){
   if(document.getElementById('defe-family-sports-pill'))return;
   try{
     const [st,matches]=await Promise.all([api('/api/fefi/standings?tournament=clausura&category='+encodeURIComponent(category)),api('/api/matches?competition=FEFI')]);
     const rows=st.rows||[],idx=rows.findIndex(x=>CLUB.test(x.team||'')),team=idx>=0?rows[idx]:null;
     const today=new Date();today.setHours(0,0,0,0);
     const past=(matches||[]).filter(m=>m.date&&new Date(String(m.date).slice(0,10)+'T12:00:00')<today&&String(m.division||'')!=='Mayores B · +42').sort((a,b)=>String(b.date).localeCompare(String(a.date)));
     let last=null;
     for(const m of past.slice(0,8)){const round=Number(String(m.round_name||'').match(/\d+/)?.[0]);if(!round)continue;try{const rr=await api('/api/fefi/results/'+round),r=(rr||[]).find(x=>String(x.category)===String(category));if(r){const home=CLUB.test(r.home||''),mine=home?r.home_value:r.away_value,other=home?r.away_value:r.home_value;last={rival:home?r.away:r.home,mine,other,date:m.date};break}}catch(e){}}
     if(!team&&!last)return;
     const card=document.createElement('div');card.id='defe-family-sports-pill';card.style.cssText='margin:14px 0 22px;padding:16px 18px;background:#fff;border:1px solid #e0e8f0;border-radius:22px;box-shadow:0 8px 24px rgba(20,60,100,.06);color:#174f80';
     const result=last?'<div><div style="font-size:11px;font-weight:900;letter-spacing:.08em;color:#7b8ba0">ÚLTIMO PARTIDO</div><div style="font-size:19px;font-weight:900;margin-top:4px">'+esc(last.mine)+' - '+esc(last.other)+'</div><div style="font-size:12px;color:#66788d;margin-top:2px">vs. '+esc(last.rival)+'</div></div>':'';
     const table=team?'<div style="text-align:right"><div style="font-size:11px;font-weight:900;letter-spacing:.08em;color:#7b8ba0">TABLA · FEFI '+esc(category)+'</div><div style="font-size:19px;font-weight:900;margin-top:4px">'+(idx+1)+'° · '+esc(team.pts??'—')+' pts</div><div style="font-size:12px;color:#66788d;margin-top:2px">'+esc(team.played??'—')+' PJ · '+esc(team.won??'—')+' G · '+esc(team.drawn??'—')+' E · '+esc(team.lost??'—')+' P</div></div>':'';
     card.innerHTML='<div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;align-items:center">'+result+table+'</div>';
     anchor.insertAdjacentElement('afterend',card);
   }catch(e){}
 }
 let timer;async function run(){const x=merge();if(x)await sports(x.next,x.category)}
 const schedule=()=>{clearTimeout(timer);timer=setTimeout(run,120)};
 new MutationObserver(schedule).observe(document.body,{childList:true,subtree:true});window.addEventListener('focus',schedule);document.addEventListener('visibilitychange',()=>{if(!document.hidden)schedule()});setTimeout(run,250);setTimeout(run,1000);setTimeout(run,2500);
})();