(() => {
  const infoReady = new Promise(resolve=>{const script=document.createElement('script');script.src='station-info.js?v=1';script.onload=()=>resolve(window.PetroStationInfo);document.head.appendChild(script);});
  const style = document.createElement('link');
  style.rel = 'stylesheet'; style.href = 'journey.css?v=1'; document.head.appendChild(style);
  const panel = document.createElement('section');
  panel.className = 'journey-panel';
  panel.innerHTML = `<div class="eyebrow">PETROMATE · COMPARE</div><h2>나에게 맞는 주유 선택</h2><p>가격과 거리를 비교하고, 나에게 편한 주유소를 선택하세요.</p><div class="journey-controls"><label>주유 예정량 <input id="journey-liters" type="number" min="1" max="200" step="1" value="30"> L</label><label>우선 기준 <select id="journey-priority"><option value="price">가격 먼저</option><option value="distance">거리 먼저</option></select></label></div><p class="note">협력 주유소를 우선으로, 선택한 가격·거리 기준에 맞춰 안내해요.</p><div id="journey-results" aria-live="polite"></div><p class="note">표시 거리는 직선거리예요. 직원 도움은 요청 후 확인하세요.</p>`;
  document.querySelector('.searchbar').after(panel);
  const facilities = document.createElement('section');
  facilities.className = 'journey-panel facility-panel';
  facilities.innerHTML = `<div class="eyebrow">PUBLIC DATA · SEOUL</div><h2>함께 살펴볼 편의시설</h2><p>주유 전후에 살펴볼 서울역 주변 편의시설이에요.</p><div class="facility-grid"><article><b>장애인용 화장실 정보 · 서울역 1호선</b><p>지하 1층 2번 출구 부근 · 개찰구 밖<br>공개자료상 남·여 장애인용 대변기 각 1개 · 05:00~24:00</p><p class="note">서울교통공사 · 2026.02.12 기준</p><a href="https://www.data.go.kr/data/15044453/fileData.do" target="_blank" rel="noopener">공공데이터 원문 ↗</a></article><article><b>전동휠체어 급속충전기 · 서울역</b><p>서울역 2층 맞이방 · 2대<br>공개자료상 운영시간 06:00~23:30</p><p class="note">용산구 · 2026.09.21 기준</p><a href="https://www.data.go.kr/data/15034533/standard.do" target="_blank" rel="noopener">공공데이터 원문 ↗</a></article></div><p class="note">현재 등록된 주변 시설 2곳 · 주유소와 별도 장소입니다. 이용 전 운영시간을 확인해 주세요.</p><button type="button" class="secondary" id="facility-map">지도에서 시설 위치 보기</button>`;
  document.querySelector('.map-layout').after(facilities);
  const liters = document.getElementById('journey-liters');
  const priority = document.getElementById('journey-priority');
  const results = document.getElementById('journey-results');
  const detail = document.createElement('dialog');
  detail.className = 'request-dialog journey-detail';
  detail.setAttribute('aria-labelledby', 'journey-detail-title');
  document.body.appendChild(detail);
  function showDetail(station, amount, cheapest) {
    const verified = station.matched && !PetroReview.excluded(station.id);
    const price = Number.isFinite(station.price) && station.price > 0 ? station.price : null;
    const total = price === null ? null : Math.round(price * amount);
    const diff = price !== null && cheapest ? Math.round((price - cheapest.price) * amount) : null;
    const fuelName = {B027:'보통휘발유', D047:'경유', B034:'고급휘발유'}[lastFuel] || '유종 미확인';
    const source = dataSource === 'live' ? '오피넷 조회 · '+new Date(lastTime).toLocaleString('ko-KR') : '저장된 예시 · '+(lastTime ? new Date(lastTime).toLocaleString('ko-KR') : '조회 시각 확인 필요')+' 조회 · 현재 가격 아님';
    const reason = `선택한 ${station.name}까지 서울역 기준 직선거리는 ${number(Math.round(station.distance))}m입니다. ${verified?'2026.07.16 협력 명단에 기재되어 있습니다':'협력 여부는 확인되지 않았습니다'}. ${price===null?'가격 정보가 없어 예상 주유비를 계산할 수 없습니다.':`${number(amount)}L 기준 예상 주유비는 ${number(total)}원입니다.`} 필요한 도움은 요청 후 직원의 응답으로 확인해 주세요.`;
    const record = {stationId:station.id,stationName:station.name,matched:verified,fuel:fuelName,liters:amount,price,total,distance:station.distance,diff,source,reason,selectedAt:new Date().toISOString()};
    try { localStorage.setItem('petromate-demo-selection-v1',JSON.stringify(record)); } catch { /* 상세 화면은 계속 사용 가능 */ }
    detail.innerHTML = `<div class="eyebrow">선택한 주유소</div><h2 id="journey-detail-title">${escapeText(station.name)}</h2><p>${escapeText(station.address || '상세 주소 미확인')}</p><div class="ai-box"><b>주유소 비교 안내</b><p>${escapeText(reason)}</p><p class="note">선택한 유종·주유량·거리 기준 안내</p></div><div class="data-line"><span>${escapeText(fuelName)} · ${number(amount)}L</span><strong>${price===null?'가격 미확인':number(price)+'원/L'}</strong></div><div class="data-line"><span>예상 주유비</span><strong>${total===null?'계산 불가':number(total)+'원'}</strong></div><div class="data-line"><span>비교 범위 최저가 대비</span><strong>${diff===null?'비교 불가':number(diff)+'원 차이'}</strong></div><div class="data-line"><span>직원 도움</span><strong>요청 후 확인</strong></div><p class="note">${escapeText(source)} · 직선거리 기준 · 결제 전 현장 가격 확인</p><div class="form-actions"><button class="secondary" id="journey-close">비교로 돌아가기</button>${verified?'<button class="primary" id="journey-request">도움 요청하기 →</button>':'<span class="note">협력 여부 확인 전이라 시연 요청을 보낼 수 없어요.</span>'}</div>`;
    document.getElementById('journey-close').addEventListener('click',()=>detail.close());
    const requestButton = document.getElementById('journey-request');
    if (requestButton) requestButton.addEventListener('click',()=>{ detail.close(); openStationRequest(station); });
    const profile = document.createElement('section');
    profile.className='journey-panel'; detail.appendChild(profile);
    infoReady.then(api=>api.loadInto(profile,station.id));
    detail.showModal();
  }
  function renderComparison() {
    const range = selectedDistance();
    const visible = fetched.filter(s => (range.min === 0 ? s.distance >= 0 : s.distance > range.min) && s.distance <= range.max)
      .map(s => ({...s, verified: s.matched && !PetroReview.excluded(s.id)}))
      .filter(s => !filter.checked || s.verified);
    const matched = visible.filter(s => s.verified);
    const candidates = (matched.length ? matched : visible).filter(s => Number.isFinite(Number(s.distance)));
    candidates.sort((a,b) => priority.value === 'price'
      ? ((a.price == null ? Infinity : Number(a.price)) - (b.price == null ? Infinity : Number(b.price)) || a.distance-b.distance)
      : (a.distance-b.distance || (a.price == null ? Infinity : Number(a.price))-(b.price == null ? Infinity : Number(b.price))));
    const amount = Number(liters.value);
    if (!Number.isInteger(amount) || amount < 1 || amount > 200) { results.innerHTML = '<p class="notice">주유량을 1~200L 정수로 입력해 주세요.</p>'; return; }
    const cheapest = visible.filter(s=>Number.isFinite(s.price) && s.price > 0).sort((a,b)=>a.price-b.price)[0];
    if (!candidates.length) { results.innerHTML = dataSource === 'none' ? '<p class="note">주유소 정보를 불러오고 있어요.</p>' : '<p class="notice">현재 조건에서 비교할 주유소가 없어요. 검색 범위와 유종, 서버 연결을 확인해 주세요.</p>'; return; }
    results.innerHTML = `<div class="compare-grid">${candidates.slice(0,3).map((s,i)=> {
      const valid = Number.isFinite(s.price) && s.price > 0;
      const total = valid ? Math.round(s.price * amount) : null;
      const diff = valid && cheapest ? Math.round((s.price - cheapest.price) * amount) : null;
      return `<article class="compare-card"><span class="compare-kicker">${i===0?'선택 기준 첫 번째':'비교 후보 '+(i+1)} · ${s.verified?'협력 명단 기재':'협력 여부 미확인'}</span><h3>${escapeText(s.name)}</h3><p><b>${valid ? number(s.price)+'원/L' : '가격 정보 없음'}</b> · ${number(Math.round(s.distance))}m 직선거리</p><p>예상 주유비 <strong>${total===null?'계산 불가':number(total)+'원'}</strong><br>${diff===null?'비교 불가':diff===0?'표시된 비교 범위의 최저가와 같음':`표시된 비교 범위의 최저가보다 ${number(diff)}원 높음`}</p><p class="note">${amount}L × ${valid?number(s.price)+'원/L':'가격 미확인'} · 이동비 제외</p><button class="secondary wide" data-journey-id="${escapeText(s.id)}">이 주유소 자세히 보기 →</button></article>`;
    }).join('')}</div><p class="note">비교 기준 최저가: ${escapeText(cheapest?.name || '가격 정보 없음')} ${cheapest?number(cheapest.price)+'원/L':''} · 선택된 거리와 필터 내 조회 결과 기준 · ${dataSource==='snapshot'?'저장된 조회 자료, 현재 가격 아님':'오피넷 제공 가격'}</p>`;
    results.querySelectorAll('[data-journey-id]').forEach(button => button.addEventListener('click', () => {
      const station = candidates.find(s => s.id === button.dataset.journeyId);
      if (station) showDetail(station,amount,cheapest);
    }));
  }
  const originalDraw = draw;
  const partnerScript=document.createElement('script');partnerScript.src='admin-data.js';
  partnerScript.onload=()=>{const ids=new Set((window.PETROMATE_ADMIN_DATA||[]).filter(p=>p.opinetId).map(p=>p.opinetId));fetched=fetched.map(s=>({...s,matched:ids.has(s.id)}));draw();};document.head.appendChild(partnerScript);
  draw = function() { originalDraw(); renderComparison(); };
  liters.addEventListener('input',renderComparison); priority.addEventListener('change',renderComparison);
  filter.addEventListener('change',renderComparison);
  renderComparison();
  document.getElementById('facility-map').addEventListener('click', () => {
    if (!map) { document.getElementById('map-status').textContent = '시설 위치를 보려면 시연 시작 파일로 서버를 실행해 주세요.'; return; }
    if (!window.petromateFacilities) {
      window.petromateFacilities = L.layerGroup().addTo(map);
      L.marker([37.556878,126.972578]).addTo(window.petromateFacilities).bindPopup('서울역 1호선 역사 화장실 · 시설 정보 2026.02.12 기준');
      L.marker([37.55483769,126.9717341]).addTo(window.petromateFacilities).bindPopup('서울역 전동휠체어 충전기 · 시설 정보 2026.09.21 기준');
    }
    map.setView(SEOUL_STATION,16); document.getElementById('map').scrollIntoView({behavior:'smooth',block:'center'});
  });
})();
