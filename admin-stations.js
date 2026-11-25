(() => {
  const operationsScript=document.createElement('script');operationsScript.src='operations-dashboard.js?v=2';document.head.appendChild(operationsScript);
  const apiReady = new Promise((resolve,reject)=>{const script=document.createElement('script');script.src='station-info.js?v=1';script.onload=()=>resolve(window.PetroStationInfo);script.onerror=reject;document.head.appendChild(script);});
  const esc=escapeHtml;
  manage = function() {
    const rows=(window.PETROMATE_ADMIN_DATA || []).slice().sort((a,b)=>Number(Boolean(b.opinetId))-Number(Boolean(a.opinetId)));
    const panel=document.getElementById('admin-body');
    panel.innerHTML=`<div class="panel"><div class="eyebrow">PARTNER STATIONS</div><h2>협력 주유소 관리</h2><p>서울시 협력 주유소 ${rows.length}곳 · 명단 기준 2026.07.16</p><div class="grid2"><label>주유소 검색<input id="partner-query" placeholder="주유소명 또는 주소"></label><label>정보 연결<select id="partner-state"><option value="all">전체</option><option value="connected">오피넷 연결</option><option value="pending">ID 확인 필요</option></select></label></div><p class="note" id="partner-count"></p><div class="table-wrap"><table><thead><tr><th>협력 주유소 / 연락처</th><th>오피넷 주유소</th><th>정보 연결</th><th>상세 정보</th></tr></thead><tbody id="partner-rows"></tbody></table></div><p class="note">정보 연결은 명단과 오피넷 ID의 연결 상태입니다. 현장 도움은 직원의 응답으로 확인하세요.</p></div>`;
    const renderRows=()=>{
      const q=document.getElementById('partner-query').value.trim().toLowerCase(),mode=document.getElementById('partner-state').value;
      const visible=rows.filter(r=>(r.name+' '+r.address).toLowerCase().includes(q)&&(mode==='all'||(mode==='connected'?Boolean(r.opinetId):!r.opinetId)));
      document.getElementById('partner-count').textContent=`표시 ${visible.length}곳 · 원본 명단 ${rows.length}곳 · 오피넷 ID 연결 ${rows.filter(r=>r.opinetId).length}곳 · ID 확인 필요 ${rows.filter(r=>!r.opinetId).length}곳`;
      document.getElementById('partner-rows').innerHTML=visible.map(r=>`<tr><td><b>${esc(r.name)}</b><br>${esc(r.address)}<br>${esc(r.phone)}</td><td>${r.opinetId?esc(r.opinetName)+'<br><small>'+esc(r.opinetId)+'</small>':'—'}</td><td><span class="state ${r.opinetId?'':'gray'}">${r.opinetId?'오피넷 연결':'ID 확인 필요'}</span></td><td><button class="link" data-profile="${esc(r.opinetId || '')}" data-local="${rows.indexOf(r)}">${r.opinetId?'가격·시설 보기':'명단 정보 보기'}</button></td></tr>`).join('');
      panel.querySelectorAll('[data-profile]').forEach(b=>b.onclick=async()=>{
        if(b.dataset.profile){try{(await apiReady).show(b.dataset.profile);}catch{b.textContent='다시 확인';}return;}
        const r=rows[Number(b.dataset.local)],dialog=document.createElement('dialog');dialog.className='request-dialog';
        dialog.innerHTML=`<h2>${esc(r.name)}</h2><p>${esc(r.address)}</p><p>${esc(r.phone)}</p><p class="note">서울시 협력 명단 · 2026.07.16 기준<br>오피넷 상세 연결을 준비하고 있습니다.</p><button class="secondary">닫기</button>`;
        dialog.querySelector('button').onclick=()=>dialog.close();dialog.addEventListener('close',()=>dialog.remove());document.body.appendChild(dialog);dialog.showModal();
      });
    };
    document.getElementById('partner-query').addEventListener('input',renderRows);document.getElementById('partner-state').addEventListener('change',renderRows);renderRows();
  };
  prices = function() {
    const host=document.getElementById('admin-body');
    host.innerHTML=`<div class="panel"><div class="eyebrow">SEOUL · OPINET</div><h2>서울 주유소 · 가격 현황</h2><p>서울 25개 구의 주유소 가격을 조회하고 상세정보를 확인하세요.</p><div class="grid2"><label>유종<select id="seoul-fuel"><option value="B027">보통휘발유</option><option value="D047">경유</option><option value="B034">고급휘발유</option></select></label><label>자치구<select id="seoul-district"><option value="">전체</option></select></label></div><label>주유소 검색<input id="seoul-query" placeholder="주유소명 검색"></label><p id="seoul-status" role="status">서울 주유소 정보를 불러오고 있어요.</p><div class="table-wrap"><table><thead><tr><th>지역</th><th>주유소</th><th>선택 유종 원/L</th><th>가격·시설·인증</th></tr></thead><tbody id="seoul-rows"></tbody></table></div><p class="note">오피넷 지역별 가격순 목록 · 구별 최대 20곳, 유종에 따라 결과가 다릅니다. 서울 전체 주유소의 전수 목록은 아닙니다.</p></div>`;
    let items=[],generation=0;
    const tbody=host.querySelector('#seoul-rows'),status=host.querySelector('#seoul-status'),district=host.querySelector('#seoul-district'),query=host.querySelector('#seoul-query');
    const renderRows=()=>{
      const q=query.value.trim().toLowerCase(),selected=district.value;
      const visible=items.filter(s=>(!selected||s.area===selected)&&s.name.toLowerCase().includes(q));
      tbody.innerHTML=visible.map(s=>`<tr><td>${esc(s.district)}</td><td><b>${esc(s.name)}</b><br><small>${esc(s.id)}</small></td><td>${Number(s.price).toLocaleString('ko-KR')}</td><td><button class="link" data-seoul-id="${esc(s.id)}">상세정보 →</button></td></tr>`).join('');
      tbody.querySelectorAll('[data-seoul-id]').forEach(b=>b.onclick=async()=>{try{(await apiReady).show(b.dataset.seoulId);}catch{status.textContent='상세정보에 연결하지 못했어요.';}});
      if(items.length)status.textContent=status.dataset.summary+` · 현재 ${visible.length}곳 표시`;
    };
    const load=async()=>{
      const token=++generation;items=[];tbody.innerHTML='';status.textContent='서울 25개 구 가격을 조회하고 있어요.';
      try{
        const result=await (await apiReady).json('/api/seoul-stations?fuel='+encodeURIComponent(host.querySelector('#seoul-fuel').value));
        if(token!==generation||!host.isConnected||!tbody.isConnected)return;
        items=result.items;
        const districts=[...new Map(items.map(s=>[s.area,s.district])).entries()].sort((a,b)=>a[1].localeCompare(b[1],'ko'));
        district.innerHTML='<option value="">전체</option>'+districts.map(([code,name])=>`<option value="${esc(code)}">${esc(name)}</option>`).join('');
        status.dataset.summary=`조회 ${new Date(result.queried_at).toLocaleString('ko-KR')} · ${items.length}곳${result.failed_districts?' · 일부 지역 연결 지연':''}`;renderRows();
      }catch{if(tbody.isConnected)status.textContent='서울 주유소 정보를 불러오지 못했어요. 시연 시작 파일로 접속한 뒤 유종을 다시 선택해 주세요.';}
    };
    query.addEventListener('input',renderRows);district.addEventListener('change',renderRows);host.querySelector('#seoul-fuel').addEventListener('change',load);load();
  };
  if(view==='admin' && ['협력 주유소 관리','오피넷 연결·가격 현황'].includes(adminPage)) admin();
})();
