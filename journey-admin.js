(() => {
  const stationModule=document.createElement('script');stationModule.src='admin-stations.js?v=2';document.head.appendChild(stationModule);
  const style = document.createElement('link'); style.rel='stylesheet'; style.href='journey.css?v=1'; document.head.appendChild(style);
  const oldLanding = landing;
  landing = function() {
    oldLanding();
    const start = document.getElementById('start');
    if (start) start.onclick = () => { location.href = 'map.html'; };
  };
  audit = function() {
    let selection = null, rows = [];
    try { selection=JSON.parse(localStorage.getItem('petromate-demo-selection-v1') || 'null'); rows=JSON.parse(localStorage.getItem('petromate-demo-requests-v1') || '[]'); } catch { rows=[]; }
    if (!Array.isArray(rows)) rows=[];
    const body = document.querySelector('#admin-body');
    if (!selection || typeof selection !== 'object' || !selection.stationId) {
      body.innerHTML = `<div class="panel"><div class="eyebrow">DEMO REVIEW</div><h2>비교·요청 시연 점검</h2><p>아직 선택한 주유소가 없어요. 지도에서 주유소를 선택하면 이곳에서 계산과 요청 상태를 확인할 수 있어요.</p><a href="map.html">주유소 지도에서 시연 시작 →</a></div>`;
      return;
    }
    const esc = escapeHtml;
    const matching = rows.filter(r=>r.stationId===selection.stationId && r.createdAt >= selection.selectedAt).slice(-1)[0];
    const valid = Number.isFinite(selection.price) && Number.isFinite(selection.liters) && selection.price>0 && selection.liters>0;
    const calculationOk = valid && selection.total === Math.round(selection.price * selection.liters);
    const amount = v=>Number(v).toLocaleString('ko-KR');
    body.innerHTML = `<div class="panel"><div class="eyebrow">DEMO REVIEW</div><h2>비교·요청 시연 점검</h2><p class="note">최근 선택한 주유소와 도움 요청의 진행 상황입니다.</p><div class="split"><div class="info"><h4>전달된 자료</h4><div class="data-line"><span>주유소</span><strong>${esc(selection.stationName)}</strong></div><div class="data-line"><span>이용 조건</span><strong>${esc(selection.fuel)} · ${esc(selection.liters)}L</strong></div><div class="data-line"><span>표시 가격</span><strong>${valid?amount(selection.price)+'원/L':'미확인'}</strong></div><div class="data-line"><span>예상 주유비</span><strong>${valid?amount(selection.total)+'원':'계산 불가'}</strong></div><div class="data-line"><span>도움 요청</span><strong>${matching?esc(matching.status):'아직 요청 없음'}</strong></div></div><div class="ai-box"><b>이용자에게 표시한 안내</b><p>${esc(selection.reason)}</p><p class="note">데이터 기반 비교 안내</p></div></div><p class="note">${esc(selection.source)} · 협력 명단 ${selection.matched?'기재':'미확인'} · 체험 요청 상태는 실제 현장 지원과 구분됩니다.</p><h3>점검 결과</h3><div class="list-row"><span>표시 가격 × 입력 주유량 = 예상 주유비</span>${badge(!valid?'계산 불가':calculationOk?'계산 일치':'확인 필요',calculationOk?'':'warn')}</div><div class="list-row"><span>미확인 정보와 실제 시연 상태 구분</span>${badge('사람이 확인','gray')}</div><div class="list-row"><span>이용자가 내용을 이해하기 쉬운가?</span>${badge('사람이 확인','gray')}</div><p class="note">자동 점검: 주유비 산술 계산 · 담당자 검토: 안내 내용과 정보 최신성</p><a href="staff.html">직원 화면 보기 →</a></div>`;
  };
  const oldAdmin = admin;
  admin = function() {
    oldAdmin();
    const section = document.createElement('section');
    section.className = 'journey-panel appendix';
    section.innerHTML = `<div class="eyebrow">PROJECT APPENDIX</div><h2>서비스 안내 · 계산 기준과 데이터</h2><p>주유비 계산 기준과 정보 출처, 서비스 확장 계획을 확인하세요.</p>
    <details><summary>01 주유소 비교와 주유비 계산</summary><p>지도에서 선택한 유종·거리·협력 필터를 적용한 결과 중 협력 명단과 대조된 후보를 우선합니다. 후보가 없을 때는 협력 여부 미확인 후보를 표시합니다. 사용자가 고른 가격순 또는 직선거리순으로 최대 3곳을 보여 줍니다. 가격이 없는 후보는 가격순에서 뒤로 보냅니다.</p><ul><li>예상 주유비(원) = 표시 가격(원/L) × 입력 주유량(L), 원 단위 반올림</li><li>비교 차액(원) = [후보 가격 − 화면 조건의 전체 조회 결과 중 확인된 최저 가격](원/L) × 주유량(L), 원 단위 반올림</li><li>계산 예: 1,750원/L와 1,730원/L, 30L라면 52,500원과 51,900원, 차액 600원</li></ul><p>최저가는 선택한 조건에서 조회된 주유소 기준입니다. 예상 주유비에는 이동비와 할인이 포함되지 않으며, 거리는 직선거리로 표시합니다. 결제 전 현장 가격을 확인해 주세요. 현재 비교 안내는 데이터 기반 규칙으로 제공됩니다.</p></details>
    <details><summary>02 공공데이터 출처와 연결 상태</summary><ul><li><a href="https://www.opinet.co.kr/user/custapi/openApiInfoDtl.do?apiId=3" target="_blank" rel="noopener">한국석유공사 오피넷 반경 내 주유소 API</a>: 주유소 ID·좌표·선택 유종 가격. 서버에서 조회하거나 2026.11.02 저장 예시를 사용합니다. API의 원 검색 반경은 최대 5km입니다.</li><li><a href="https://map.seoul.go.kr/smgis2/short/6PPUq" target="_blank" rel="noopener">서울시 이동약자 주유 서비스 협력 명단</a>: 2026.07.16 기준 제공 명단과 오피넷 ID를 일부 대조. 직원 도움은 요청 후 응답으로 확인합니다.</li><li><a href="https://www.vworld.kr/v4po_main.do" target="_blank" rel="noopener">브이월드</a>: 서울역 주변 배경지도와 위치 표시.</li><li><a href="https://www.data.go.kr/data/15044453/fileData.do" target="_blank" rel="noopener">서울교통공사 역사공중화장실정보</a>: 서울역 1호선 시설 정보 · 2026.02.12 기준.</li><li><a href="https://www.data.go.kr/data/15034533/standard.do" target="_blank" rel="noopener">전국전동휠체어급속충전기표준데이터</a>: 서울역 시설 정보 · 2026.09.21 기준.</li></ul><p>주변 편의시설은 주유소와 별도 위치에 표시합니다. 시설 정보는 각 제공기관의 자료 기준일을 따릅니다.</p></details>
    <details><summary>03 NVIDIA 페르소나 기반 이용 시나리오</summary><p><a href="https://huggingface.co/datasets/nvidia/Nemotron-Personas-Korea" target="_blank" rel="noopener">NVIDIA Nemotron-Personas-Korea</a> (버전 1.0, CC BY 4.0)를 활용해 다양한 생활 배경의 합성 페르소나를 구성했습니다. 30개 후보에서 대표 10개를 선정하고, 도움 선택·가격 비교·직원 응답 등 50개 검토 과제를 설계했습니다.</p><p>주유 상황은 서비스 검토를 위해 구성한 가상 시나리오입니다. 서울역을 공통 출발점으로 두고 필요한 도움과 이용 흐름을 살펴봅니다. 개인별 안내에는 이용자가 직접 선택한 요구사항을 사용합니다.</p><p>향후 당사자 사용성 평가를 통해 선택지와 안내 방식을 개선할 계획입니다.</p></details>
    <details><summary>04 도움 선택지 조사 근거</summary><p>서울시 보도자료에 따르면 2026년 6월 기준 서울 주유소 390곳 중 275곳(70.5%)이 셀프주유소입니다. 국가인권위원회는 주유기·결제 단말기 조작, 주유건·호스 사용, 주유구 개폐와 지원 요청 수단 등에서 장애인이 겪는 어려움을 설명했습니다. 이를 참고해 도움 선택지를 구성했습니다.</p><p>이 수치는 주유소 유형의 비율이며, 도움 항목별 이용 횟수나 PetroMate 이용 빈도는 아닙니다. 항목별 실제 이용 빈도는 당사자 조사 또는 동의를 받은 이용 기록으로 별도 확인해야 합니다.</p><p><a href="https://www.seoul.go.kr/news/news_report.do?bbsNo=158&amp;nttNo=461715" target="_blank" rel="noopener">서울시 보도자료 · 2026.07.15</a> · <a href="https://www.humanrights.go.kr/base/board/read?boardManagementNo=24&amp;boardNo=7612315&amp;menuNo=9" target="_blank" rel="noopener">국가인권위원회 보도자료 · 2026.09</a></p></details>
    <details><summary>05 향후 확장</summary><p>PetroMate는 주유소 비교부터 도움 요청, 직원의 사전 준비까지 연결하는 서비스로 발전합니다.</p><ul><li><b>이동 범위 확대</b> · 서울역 시연에서 지역별 협력 주유소와 전국 서비스로 확대</li><li><b>경로 중심 안내</b> · GPS와 길찾기를 연결해 이동 경로 안에서 편리한 주유소 탐색</li><li><b>개인화 안내</b> · 이용자가 선택한 도움 유형과 주유 조건에 맞춘 AI 설명</li><li><b>현장 연계</b> · 직원용 알림과 응답 기능을 연계해 도착 전 도움 준비</li><li><b>생활 편의시설</b> · 화장실·휠체어 충전기 등 주변 편의시설 정보 확대</li></ul></details>`;
    document.querySelector('#admin-body').appendChild(section);
  };
  if (view === 'admin') admin();
  else if (view === 'landing') landing();
})();
