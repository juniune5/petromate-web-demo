const statusEl = document.getElementById('status');
const listEl = document.getElementById('station-list');
const countEl = document.getElementById('count');
const fuel = document.getElementById('fuel');
const filter = document.getElementById('only-matched');
const distanceRange = document.getElementById('distance-range');
const distanceMode = document.getElementById('distance-mode');
const radiusLabel = document.getElementById('radius-label');
const RADII = [3000, 5000, 7000, 10000];
function selectedDistance() {
  const index = Math.max(0, Math.min(RADII.length-1, Number(distanceRange.value)));
  const max = RADII[index], min = distanceMode.value === 'band' && index > 0 ? RADII[index-1] : 0;
  return {min, max, label:min ? `${min/1000}~${max/1000}km` : `${max/1000}km 이내`};
}
function updateDistanceLabel() {
  const label = selectedDistance().label;
  radiusLabel.textContent = label;
  distanceRange.setAttribute('aria-valuetext',label);
}
updateDistanceLabel();
const escapeText = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const number = n => Number(n).toLocaleString('ko-KR');
const SEOUL_STATION = [37.5551,126.9707];
let map, originMarker, markers, fetched = [], lastCenter = SEOUL_STATION, lastTime = '', lastFuel = '', lastRadius = 0, pending = 0, dataSource = 'none';
const mapStatus = document.getElementById('map-status');
const overview = document.createElement('section');
overview.className = 'request-overview';
overview.setAttribute('aria-live', 'polite');
document.querySelector('.notice').after(overview);
const requestDialog = document.createElement('dialog');
requestDialog.className = 'request-dialog';
requestDialog.setAttribute('aria-labelledby', 'request-title');
requestDialog.innerHTML = `<form id="request-form"><h2 id="request-title">주유 도움 요청 · 시연</h2><p id="request-station" class="muted"></p><div class="notice"><b>체험 모드</b> · 요청은 시연 직원 화면으로 연결됩니다. 실제 주유소에 전송되지 않습니다.</div><fieldset class="keyword-field"><legend>어떤 도움이 필요하세요?</legend><div class="keyword-grid"><label><input type="radio" name="category" value="차에서 내리기 어려워요"> 차에서 내리기 어려워요</label><label><input type="radio" name="category" value="주유기 사용에 도움이 필요해요"> 주유기 사용에 도움이 필요해요</label><label><input type="radio" name="category" value="직접 입력"> 직접 입력할게요</label></div></fieldset><fieldset class="keyword-field" id="tail-field" hidden><legend>어떤 도움이 필요한가요? <small>여러 개 선택 가능</small></legend><div id="tail-options" class="keyword-grid"></div></fieldset><div id="custom-wrap" hidden><label for="request-custom">직접 입력 <span class="muted">100자 이내</span></label><textarea id="request-custom" maxlength="100" placeholder="필요한 도움만 적어 주세요."></textarea><p class="note">직원에게 필요한 도움만 알려주세요. 이름이나 상세한 건강정보는 입력하지 않아도 돼요.</p></div><label for="request-eta">방문 예정 · 직접 선택</label><select id="request-eta"><option>약 10분 후</option><option>약 20분 후</option><option>약 30분 후</option><option>미정</option></select><div id="request-summary" class="ai-box">도움 유형을 선택하면 여기에서 내용을 확인할 수 있어요.</div><p class="note">방문 예정 시간을 선택해 주세요.</p><label class="consent"><input id="request-confirm" type="checkbox" required> 체험 모드의 도움 요청임을 확인했어요.</label><p id="request-error" class="error" role="alert"></p><div class="form-actions"><button type="button" class="secondary" id="request-close">닫기</button><button type="submit" class="primary">가상 요청 보내기</button></div></form>`;
document.body.appendChild(requestDialog);
let requestStation = null;
const tailChoices = {'차에서 내리기 어려워요':['차 안에서 직원의 주유 도움','주유구 주변 조작 도움','아직 잘 모르겠어요'], '주유기 사용에 도움이 필요해요':['주유기 조작 도움','주유 중 직원 도움','결제 방법 확인','아직 잘 모르겠어요']};
function selectedHelp() {
  const category = requestDialog.querySelector('input[name="category"]:checked')?.value;
  const selected = [...requestDialog.querySelectorAll('input[name="tail"]:checked')].map(x=>x.value);
  const custom = document.getElementById('request-custom').value.trim();
  return category === '직접 입력' ? custom : [...selected, ...(custom ? [custom] : [])].join(' · ');
}
function updateSummary() {
  const help = selectedHelp();
  document.getElementById('request-summary').textContent = help ? `전달할 내용: ${help} · ${document.getElementById('request-eta').value}` : '도움 유형을 선택하면 여기에서 내용을 확인할 수 있어요.';
}
requestDialog.querySelectorAll('input[name="category"]').forEach(radio=>radio.addEventListener('change',()=>{
  const group = tailChoices[radio.value];
  document.getElementById('tail-field').hidden = !group;
  document.getElementById('tail-options').innerHTML = group ? group.map((v,i)=>`<label><input type="checkbox" name="tail" value="${escapeText(v)}"> ${escapeText(v)}</label>`).join('')+'<label><input type="checkbox" id="custom-toggle"> 다른 도움이 필요해요</label>' : '';
  document.getElementById('request-custom').value='';
  document.getElementById('custom-wrap').hidden = radio.value !== '직접 입력';
  const toggle = document.getElementById('custom-toggle');
  if(toggle) toggle.addEventListener('change',()=>{document.getElementById('custom-wrap').hidden=!toggle.checked; if(!toggle.checked)document.getElementById('request-custom').value=''; updateSummary();});
  requestDialog.querySelectorAll('input[name="tail"]').forEach(box=>box.addEventListener('change',updateSummary));
  updateSummary();
}));
document.getElementById('request-custom').addEventListener('input',updateSummary);
document.getElementById('request-eta').addEventListener('change',updateSummary);
document.getElementById('request-close').addEventListener('click', () => requestDialog.close());
document.getElementById('request-form').addEventListener('submit', event => {
  event.preventDefault();
  if (!document.getElementById('request-confirm').checked) return;
  const help = selectedHelp();
  if (!help) { document.getElementById('request-error').textContent = '필요한 도움을 선택하거나 직접 입력해 주세요.'; return; }
  const row = PetroRequests.add(requestStation, help, document.getElementById('request-eta').value);
  if (!row) { document.getElementById('request-error').textContent = '이 브라우저에 요청을 저장할 수 없어요. 저장 기능을 확인해 주세요.'; return; }
  requestDialog.close(); renderRequests();
  overview.scrollIntoView({behavior:'smooth',block:'center'});
});
function renderRequests() {
  const rows = PetroRequests.read().slice().reverse();
  overview.innerHTML = `<div class="eyebrow">MY REQUESTS</div><strong>내 도움 요청</strong><p class="note">체험 모드 · 실제 주유소에는 전송되지 않습니다.</p>${rows.length ? rows.map(r => `<p><b>${escapeText(r.stationName)}</b> · ${escapeText(r.help)} · ${escapeText(r.eta)} <span class="state ${r.status === '응답 대기' ? 'warn' : 'gray'}">${escapeText(r.status)}</span> ${r.status !== '취소됨' ? `<button class="link" data-cancel="${escapeText(r.id)}">요청 취소</button>` : ''}</p>`).join('') : '<p class="note">선택한 주유소에 필요한 도움을 요청해 보세요.</p>'}<a href="staff.html">직원 화면으로 이동 →</a>`;
  overview.querySelectorAll('[data-cancel]').forEach(button => button.addEventListener('click', () => { PetroRequests.update(button.dataset.cancel, '취소됨'); renderRequests(); }));
}
renderRequests();
window.addEventListener('storage', renderRequests);

if (location.protocol === 'file:') {
  mapStatus.textContent = '파일을 직접 열어 브이월드 지도를 불러올 수 없어요. 저장된 주유소 목록은 아래에 표시합니다.';
  document.getElementById('search').disabled = true;
  useSnapshot();
} else if (!window.L) {
  mapStatus.textContent = '지도 구성 요소를 불러오지 못했어요. 저장된 주유소 목록은 아래에 표시합니다.';
  document.getElementById('map').innerHTML = '<p class="map-failed">지도 구성 요소를 불러오지 못했습니다.</p>';
  document.getElementById('search').disabled = true;
  useSnapshot();
} else {
  map = L.map('map').setView(lastCenter, 13);
  const tiles = L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {maxZoom: 19, attribution:'&copy; OpenStreetMap contributors'}).addTo(map);
  let loadedTiles = 0, failedTiles = 0;
  tiles.on('loading', () => { loadedTiles = 0; failedTiles = 0; });
  tiles.on('tileload', () => { loadedTiles++; });
  tiles.on('tileerror', () => { failedTiles++; });
  tiles.on('load', () => { mapStatus.textContent = failedTiles ? `지도 일부를 불러오지 못했어요 (${failedTiles}개). 인터넷 연결을 확인해 주세요.` : '서울역 주변 지도'; });
  markers = L.layerGroup().addTo(map);
  originMarker = L.circleMarker(lastCenter, {radius:8,color:'#fff',weight:3,fillColor:'#1d1d1f',fillOpacity:1}).addTo(map).bindPopup('서울역 · 주유소까지 직선거리의 기준');
  search(lastCenter);
}

function draw() {
  const {min:minDistance,max:maxDistance}=selectedDistance();
  const visible = fetched.map(s=>({...s, reviewPending:s.matched && PetroReview.excluded(s.id), matched:s.matched && !PetroReview.excluded(s.id)})).filter(s => (!filter.checked || s.matched) && (minDistance === 0 ? s.distance >= 0 : s.distance > minDistance) && s.distance <= maxDistance);
  countEl.textContent = `${visible.length}곳`;
  if (markers) markers.clearLayers();
  const empty = dataSource === 'snapshot' && minDistance >= lastRadius ? `저장된 자료는 ${lastRadius/1000}km까지만 있어요. 이 거리의 주유소가 없다는 뜻은 아닙니다.` : '현재 자료와 선택 조건에서 확인된 주유소가 없습니다. 협력 주유소가 없다는 뜻은 아닙니다.';
  listEl.innerHTML = visible.length ? visible.map(s => `<article class="map-card"><span class="state ${s.matched?'':s.reviewPending?'warn':'gray'}">${s.matched?'협력 명단 기재 · 2026.07.16':s.reviewPending?'시연 관리자 추가 검토':'협력 여부 미확인'}</span><h3>${escapeText(s.name)}</h3><div class="map-card-row"><strong>${s.price === null ? '가격 정보 없음' : number(s.price)+'원/L'}</strong><span>${number(Math.round(s.distance))}m · 직선거리</span></div><p class="note">${s.priceDate ? `가격 기준 ${escapeText(s.priceDate)} ${escapeText(s.priceTime || '')} · ` : ''}직원 도움 · 요청 후 확인</p><div class="request-actions">${map?`<button class="link" data-id="${escapeText(s.id)}">지도에서 보기 →</button>`:''}${s.matched ? `<button class="link" data-request="${escapeText(s.id)}">도움 요청 →</button>` : ''}</div></article>`).join('') : `<p class="note">${empty}</p>`;
  if (markers) visible.forEach(s => {
    const marker = L.circleMarker([s.lat,s.lon], {radius:s.matched?9:6,color:'#fff',weight:2,fillColor:s.matched?'#c40014':'#85858a',fillOpacity:.95}).addTo(markers);
    const name = escapeText(s.name), address = s.address ? `<br>${escapeText(s.address)}` : '';
    marker.bindPopup(`<strong>${name}</strong>${address}<br>${s.matched?'2026.07.16 협력 명단 기재':s.reviewPending?'시연 관리자 추가 검토':'협력 여부 미확인'}<br>직원 도움 · 요청 후 확인<br>${s.price===null?'가격 정보 없음':number(s.price)+'원/L'}<br>${s.priceDate ? `가격 기준 ${escapeText(s.priceDate)} ${escapeText(s.priceTime || '')}` : '가격 기준 시각은 이 검색 응답에서 미제공'}`);
    marker.stationId = s.id;
  });
  listEl.querySelectorAll('[data-id]').forEach(button => button.addEventListener('click', () => {
    const station = visible.find(s => s.id === button.dataset.id);
    if (!station) return;
    map.setView([station.lat,station.lon], 16);
    markers.eachLayer(marker => { if(marker.stationId === station.id) marker.openPopup(); });
    document.getElementById('map').scrollIntoView({behavior:'smooth',block:'center'});
  }));
  listEl.querySelectorAll('[data-request]').forEach(button => button.addEventListener('click', () => {
    const station = visible.find(s => s.id === button.dataset.request && s.matched);
    if (station) openStationRequest(station);
  }));
}

function openStationRequest(station) {
  if (!station || !station.matched || PetroReview.excluded(station.id)) return;
  requestStation = station;
  document.getElementById('request-station').textContent = station.name + ' · 2026.07.16 기준 협력 명단 기재';
  document.getElementById('request-form').reset();
  document.getElementById('request-confirm').checked = false;
  document.getElementById('tail-field').hidden=true;
  document.getElementById('custom-wrap').hidden=true;
  document.getElementById('tail-options').innerHTML='';
  updateSummary();
  document.getElementById('request-error').textContent = '';
  requestDialog.showModal();
}

async function search(center) {
  useSnapshot(); return;
  const request = ++pending, requestedFuel = fuel.value, radius = selectedDistance().max;
  statusEl.textContent = radius > 5000 ? '오피넷의 5km 검색을 여러 지점에서 조회하고 있어요. 시간이 조금 걸릴 수 있습니다.' : '오피넷에서 주변 주유소를 불러오고 있어요.';
  try {
    const query = new URLSearchParams({lat:center[0],lon:center[1],fuel:requestedFuel,radius});
    const response = await fetch('/api/stations?' + query);
    const contentType = response.headers.get('content-type') || '';
    if (!contentType.includes('application/json')) throw new Error('시연 서버가 올바르게 응답하지 않았어요. 시연 시작 파일을 다시 실행해 주세요.');
    const body = await response.text();
    if (!body.trim()) throw new Error('시연 서버에서 빈 응답을 받았어요. 서버 창이 열려 있는지 확인해 주세요.');
    let data;
    try { data = JSON.parse(body); } catch { throw new Error('시연 서버의 응답을 읽지 못했어요. 시연 시작 파일을 다시 실행해 주세요.'); }
    if(request !== pending) return;
    if (!response.ok) throw new Error(data.error || '조회에 실패했어요.');
    if (!Array.isArray(data.items)) throw new Error('주유소 응답을 확인할 수 없어요.');
    if (data.items.length === 0 && requestedFuel === 'B027') { useSnapshot('오피넷에서 검색 결과를 받지 못했어요.'); return; }
    if (data.items.length === 0) { useSnapshot('오피넷에서 검색 결과를 받지 못했어요.'); return; }
    fetched = data.items; lastCenter = center; lastTime = data.queried_at; lastFuel = requestedFuel; lastRadius = radius; dataSource = 'live';
    originMarker.setLatLng(center);
    statusEl.textContent = `오피넷 조회: ${new Date(lastTime).toLocaleString('ko-KR')} · 최대 ${radius/1000}km · 직선거리 · 조회 시각 기준${data.failed_queries ? ` · 일부 검색 실패(${data.failed_queries}/${data.queries}): 결과가 누락될 수 있어요` : ''}`;
    draw();
  } catch(error) {
    if(request !== pending) return;
    useSnapshot(error instanceof TypeError ? '시연 서버에 연결하지 못했어요.' : (error.message || '오피넷 검색에 실패했어요.'));
  }
}

function useSnapshot(reason = '') {
  const snap=window.PETROMATE_SNAPSHOT, details=window.PETROMATE_DASHBOARD_DATA?.details || {};
  const selectedFuel=fuel.value;
  dataSource='snapshot'; lastFuel=selectedFuel; lastRadius=Number(snap?.radius_m)||5000;
  const base=Array.isArray(snap?.items) ? snap.items : [];
  if (selectedFuel === 'B027') {
    fetched=base;
    lastTime='2026-11-02T11:14:00+09:00';
  } else {
    fetched=base.flatMap(station=>{
      const detail=details[station.id];
      const price=detail?.prices?.find(p=>p.fuel===selectedFuel && Number.isFinite(Number(p.price)) && Number(p.price)>0);
      return price ? [{...station,price:Number(price.price),address:detail.address || station.address,phone:detail.phone || station.phone,priceDate:price.date,priceTime:price.time}] : [];
    });
    lastTime=window.PETROMATE_DASHBOARD_DATA?.verified_at || '';
  }
  if (Array.isArray(window.PETROMATE_ADMIN_DATA)) {
    const ids = new Set(window.PETROMATE_ADMIN_DATA.filter(p=>p.opinetId).map(p=>p.opinetId));
    fetched = fetched.map(s=>({...s,matched:ids.has(s.id)}));
  }
  const fuelName={B027:'보통휘발유',D047:'경유',B034:'고급휘발유'}[selectedFuel] || selectedFuel;
  statusEl.textContent = reason + (selectedFuel==='B027' ? ` 저장된 예시 표시: 2026.11.02 조회 · 서울역 ${lastRadius/1000}km 이내 ${fuelName} · 현재 유가 아님.` : ` 저장된 예시 표시: 오피넷 주유소 상세정보 2026.11.19 조회 · ${fuelName} · 좌표는 2026.11.02 자료와 ID로 연결 · 일부 주유소만 표시 · 현재 유가 아님.`);
  draw();
}
document.getElementById('search').addEventListener('click', () => { if (map) { map.setView(SEOUL_STATION,13); search(SEOUL_STATION); } });
fuel.addEventListener('change', () => { if (map) search(lastCenter); else useSnapshot(); });
distanceRange.addEventListener('input', () => { updateDistanceLabel(); if(lastRadius) draw(); });
distanceRange.addEventListener('change', () => { updateDistanceLabel(); if (!map || dataSource==='snapshot') { draw(); if(map && selectedDistance().max>lastRadius)search(SEOUL_STATION); return; } const radius=selectedDistance().max; if(lastFuel===fuel.value && lastRadius>=radius) { pending++; draw(); } else search(SEOUL_STATION); });
distanceMode.addEventListener('change', () => { updateDistanceLabel(); draw(); });
filter.addEventListener('change', draw);

// 비교·공공 편의시설 시연을 별도 모듈로 확장한다.
const extensionScript = document.createElement('script');
extensionScript.src = 'journey-map.js?v=3';
document.body.appendChild(extensionScript);

