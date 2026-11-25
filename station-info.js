(() => {
  const marketReady=new Promise(resolve=>{const s=document.createElement('script');s.src='market-insights.js?v=1';s.onload=()=>resolve(window.PetroMarket);s.onerror=()=>resolve(null);document.head.appendChild(s);});
  const snapshotReady=new Promise(resolve=>{if(window.PETROMATE_DASHBOARD_DATA)return resolve();const s=document.createElement('script');s.src='dashboard-data.js?v=1';s.onload=resolve;s.onerror=resolve;document.head.appendChild(s);});
  const esc = value => String(value ?? '').replace(/[&<>"']/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const fuels = {B027:'보통휘발유',D047:'경유',B034:'고급휘발유',C004:'실내등유',K015:'자동차부탄'};
  async function json(url) {
    const response = await fetch(url);
    if (!response.ok || !(response.headers.get('content-type') || '').includes('application/json')) throw new Error('조회 실패');
    const data = await response.json();
    if (data.error) throw new Error('조회 실패');
    return data;
  }
  function markup(s) {
    const flag = value=>value===true?'있음':value===false?'없음':'정보 없음';
    const quality = s.qualityCertified===true?'품질인증 협약':s.qualityCertified===false?'품질인증 비협약':'인증 정보 없음';
    const stamp = p=>/^\d{8}$/.test(p.date)?`${p.date.slice(0,4)}.${p.date.slice(4,6)}.${p.date.slice(6,8)} ${/^\d{6}$/.test(p.time)?p.time.slice(0,2)+':'+p.time.slice(2,4):''}`:'기준일 정보 없음';
    return `<div class="eyebrow">OPINET · STATION PROFILE</div><h2>${esc(s.name)}</h2><p>${esc(s.address || '주소 정보 없음')}<br>${esc(s.phone || '전화번호 정보 없음')}</p><div class="data-line"><span>상표 / 업종</span><strong>${esc(s.brand)} · ${s.type==='Y'?'LPG 충전소':s.type==='C'?'주유소·충전소':'주유소'}</strong></div><div class="data-line"><span>품질인증</span><strong>${quality}</strong></div><p class="note">한국석유관리원 품질인증프로그램 협약 여부입니다.</p><div class="facility-grid"><article>세차장 <b>${flag(s.facilities.carWash)}</b></article><article>경정비 <b>${flag(s.facilities.maintenance)}</b></article><article>편의점 <b>${flag(s.facilities.store)}</b></article></div><h3>유종별 판매가격</h3><div class="table-wrap"><table><thead><tr><th>유종</th><th>원/L</th><th>가격 기준</th></tr></thead><tbody>${s.prices.length?s.prices.map(p=>`<tr><td>${esc(fuels[p.fuel] || p.fuel)}</td><td>${p.price===null?'정보 없음':Number(p.price).toLocaleString('ko-KR')}</td><td>${esc(stamp(p))}</td></tr>`).join(''):'<tr><td colspan="3">판매가격 정보 없음</td></tr>'}</tbody></table></div><p class="note">출처: 오피넷 상세정보 · 조회 ${esc(new Date(s.queried_at).toLocaleString('ko-KR'))} · 부대시설은 주유 도움 가능 여부와 별도 정보입니다.</p>`;
  }
  async function loadInto(target,id) {
    target.innerHTML='<p class="note">주유소 상세정보를 불러오고 있어요.</p>';
    try {const s=await json('/api/station-detail?id='+encodeURIComponent(id)); if(target.isConnected){target.innerHTML=markup(s);const p=s.prices.find(x=>x.fuel==='B027'&&x.price>0)||s.prices.find(x=>['B027','D047','B034'].includes(x.fuel)&&x.price>0);if(p){const box=document.createElement('div');box.className='market-box';target.appendChild(box);marketReady.then(m=>m?.nearby(box,id,p.fuel,p.price));}}}
    catch {
      await snapshotReady;
      const saved=window.PETROMATE_DASHBOARD_DATA?.details?.[id];
      if(target.isConnected)target.innerHTML=saved?'<p class="notice">저장된 상세정보 · 아래 조회 시각 기준</p>'+markup(saved):'<p class="notice">상세정보에 연결하지 못했어요. 시연 시작 파일로 접속한 뒤 다시 확인해 주세요.</p>';
    }
  }
  function show(id) {
    const dialog=document.createElement('dialog');dialog.className='request-dialog';dialog.setAttribute('aria-label','오피넷 주유소 상세정보');
    const content=document.createElement('div');dialog.appendChild(content);
    const close=document.createElement('button');close.className='secondary';close.textContent='닫기';close.onclick=()=>dialog.close();dialog.appendChild(close);
    document.body.appendChild(dialog);dialog.addEventListener('close',()=>dialog.remove());dialog.showModal();loadInto(content,id);
  }
  window.PetroStationInfo={json,show,loadInto};
})();
