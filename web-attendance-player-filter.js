(()=>{
const API='https://el-defe-v5-production.up.railway.app';
const norm=s=>String(s||'').trim().toUpperCase();
function jwt(v){if(!v||typeof v!=='string')return null;const m=v.match(/eyJ[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+/);return m?m[0]:null}
function token(){for(const st of [localStorage,sessionStorage])for(let i=0;i<st.length;i++){const t=jwt(st.getItem(st.key(i)));if(t)return t}return localStorage.getItem('defe_token')||''}
let links=null,loading=false,scheduled=false;
async function load(){if(links||loading||!token())return;loading=true;try{const r=await fetch(API+'/api/availability/admin/player-links',{headers:{Authorization:'Bearer '+token()},cache:'no-store'});if(!r.ok)return;const d=await r.json();links=new Map((d.items||[]).map(x=>[norm(x.email),x.players||[]]));patch()}catch(_){}finally{loading=false}}
function selection(card){const k=card.querySelector('.av-kicker')?.textContent||'';const [competition,...rest]=k.split('·');return{competition:norm(competition),category:norm(rest.join('·'))}}
function matches(player,sel){return (player.teams||[]).some(t=>norm(t.competition)===sel.competition&&norm(t.category)===sel.category)}
function setText(el,value){if(el&&el.textContent!==value)el.textContent=value}
function patch(){if(!links){load();return}document.querySelectorAll('.ava-card').forEach(card=>{const sel=selection(card);card.querySelectorAll('.ava-person').forEach(row=>{const small=[...row.querySelectorAll('small')].find(x=>/^Familia:/i.test(x.textContent||''));if(!small)return;const email=norm((small.textContent||'').replace(/^Familia:\s*/i,''));const all=links.get(email)||[];const current=all.filter(p=>matches(p,sel));const strong=row.querySelector('strong');if(current.length)setText(strong,current.map(p=>p.name).join(' / '));else if(all.length)setText(strong,'Jugador pendiente para esta categoría')})})}
function schedule(){if(scheduled)return;scheduled=true;setTimeout(()=>{scheduled=false;patch()},80)}
new MutationObserver(schedule).observe(document.documentElement,{childList:true,subtree:true});setInterval(patch,1500);load();
})();