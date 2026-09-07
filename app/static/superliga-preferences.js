// El Defe · preferencia Super Liga Futsal
(function(){
  const KEY='defe_followed_v1',PREF='SUPERLIGA|Junior A';
  function read(){try{return JSON.parse(localStorage.getItem(KEY)||'[]')}catch{return []}}
  function install(){
    const picker=document.getElementById('followedPicker');
    if(!picker||document.getElementById('followSuperLiga'))return false;
    const block=document.createElement('div');
    block.id='followSuperLiga';
    block.style.marginTop='12px';
    const selected=read().includes(PREF);
    block.innerHTML=`<b style="font-size:11px">SUPER LIGA FUTSAL</b><div style="display:flex;flex-wrap:wrap;gap:6px;margin-top:7px"><button type="button" data-follow="${PREF}" class="${selected?'btn':'light'}" style="width:auto;padding:7px 10px;border-radius:999px;font-size:9px" onclick="window.defeToggleFollow(this)">Junior A</button></div>`;
    const save=[...picker.querySelectorAll('button')].find(b=>(b.textContent||'').includes('Guardar preferencias'));
    if(save)picker.insertBefore(block,save);else picker.appendChild(block);
    return true;
  }
  let tries=0;const timer=setInterval(()=>{tries++;if(install()||tries>50)clearInterval(timer)},100);
  document.addEventListener('defe:preferences-updated',()=>setTimeout(install,50));
})();