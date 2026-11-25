(() => {
  const marketReady=new Promise(resolve=>{const s=document.createElement('script');s.src='market-insights.js?v=1';s.onload=()=>resolve(window.PetroMarket);s.onerror=()=>resolve(null);document.head.appendChild(s);});
  const css=document.createElement('link');css.rel='stylesheet';css.href='operations.css?v=3';document.head.appendChild(css);
  const dataReady=new Promise(resolve=>{if(window.PETROMATE_DASHBOARD_DATA)return resolve();const s=document.createElement('script');s.src='dashboard-data.js?v=1';s.onload=resolve;s.onerror=resolve;document.head.appendChild(s);});
  const esc=escapeHtml;
  const num=n=>Number(n).toLocaleString('ko-KR');
  const districtOf=p=>p.address?.match(/[가-힣]+구/)?.[0]||'기타';
  const fuelNames={B027:'보통휘발유',D047:'경유',B034:'고급휘발유'};
  let sourceMode='snapshot',directory=null;
  dashboard=function() {
    const host=document.getElementById('admin-body');
    host.innerHTML=`<section class="ops-hero"><div><span class="ops-overline">PETROMATE OPERATIONS</span><h2>운영 대시보드</h2><p>협력 주유소와 유가, 도움 요청을 함께 살펴보세요.</p></div><button class="ops-refresh" id="ops-refresh">가격 새로고침</button></section><section class="ops-filters"><label>지역<select id="ops-district"><option value="">서울 전체</option></select></label><label>유종<select id="ops-fuel"><option value="B027">보통휘발유</option><option value="D047">경유</option><option value="B034">고급휘발유</option></select></label><label>주유량 · L<input id="ops-liters" type="number" min="1" max="200" step="1" inputmode="numeric" value="30"></label><p id="ops-source" role="status">운영 정보를 준비하고 있습니다.</p></section><div id="ops-metrics" class="ops-metrics"></div><div class="ops-chart-grid"><section class="ops-card"><div class="ops-card-title"><h3>협력 네트워크</h3><span>명단 · 2026.07.16</span></div><div id="ops-network"></div></section><section class="ops-card"><div class="ops-card-title"><h3>주유비 비교</h3><span id="ops-price-caption">조회 표본 평균</span></div><div id="ops-price-chart"></div></section><section class="ops-card"><div class="ops-card-title"><h3>도움 요청</h3><a href="staff.html">직원 화면</a></div><div id="ops-requests"></div></section></div><section class="ops-card ops-stations"><div class="ops-card-title"><div><h3>주유소 통합 현황</h3><p>주유소를 최대 3곳 선택해 주유비를 비교하세요.</p></div><label class="ops-search"><span class="sr-only">통합 주유소 검색</span><input id="ops-search" placeholder="주유소명·주소 검색"></label></div><div class="ops-table-toolbar"><div class="ops-tabs"><button class="active" data-group="all">전체</button><button data-group="partner">협력 주유소</button><button data-group="linked">오피넷 연결</button></div><span id="ops-table-count"></span></div><div id="ops-comparison" aria-live="polite"></div><div class="table-wrap"><table><thead><tr><th>비교</th><th>주유소</th><th>지역</th><th>협력 정보</th><th>판매가격 · 원/L</th><th>품질인증</th><th>상세정보</th></tr></thead><tbody id="ops-table"></tbody></table></div><div class="ops-pagination"><button id="ops-prev">이전</button><span id="ops-page"></span><button id="ops-next">다음</button></div></section>`;
    let selectedFuel='B027',group='all',page=0,requestToken=0,selected=new Set();
    const $=id=>host.querySelector('#'+id);
    const current=()=>host.isConnected&&Boolean($('ops-table'));
    const partners=window.PETROMATE_ADMIN_DATA||[];
    const market=document.createElement('section');market.className='ops-card market-box';host.querySelector('.ops-filters').after(market);
    marketReady.then(m=>m?.averages(market,selectedFuel));
    const allIds=new Set(partners.filter(p=>p.opinetId).map(p=>p.opinetId));
    function rows() {
      const known=window.PETROMATE_DASHBOARD_DATA?.details||{};
      const merged=new Map();
      if(directory?.fuel===selectedFuel)directory.items.forEach(s=>merged.set(s.id,{...s,partner:allIds.has(s.id),address:known[s.id]?.address||'',priceSource:'directory'}));
      partners.forEach(p=>{
        const id=p.opinetId||'partner-'+p.no,detail=known[id],price=detail?.prices.find(x=>x.fuel===selectedFuel);
        const old=merged.get(id);
        merged.set(id,{...(old||{}),id,name:old?.name||p.opinetName||p.name,district:old?.district||districtOf(p),address:detail?.address||p.address,partner:true,linked:Boolean(p.opinetId),price:old?.price??price?.price??null,detail,priceSource:old?'directory':'saved-detail'});
      });
      return [...merged.values()].map(s=>({...s,linked:s.linked??true,detail:s.detail||known[s.id]}));
    }
    function filterRegion(list){const district=$('ops-district').value;return list.filter(s=>!district||s.district===district);}
    function render() {
      if(!current())return;
      const all=filterRegion(rows()),ps=all.filter(s=>s.partner),linked=ps.filter(s=>s.linked),liters=Number($('ops-liters').value),amountOk=liters>=1&&liters<=200&&Number.isInteger(liters);
      let requests=[];try{requests=JSON.parse(localStorage.getItem('petromate-demo-requests-v1')||'[]');}catch{}if(!Array.isArray(requests))requests=[];
      const regionIds=new Set(ps.map(s=>s.id));if($('ops-district').value)requests=requests.filter(r=>regionIds.has(r.stationId));
      const waiting=requests.filter(r=>r.status==='응답 대기').length,ready=requests.filter(r=>r.status==='도움 가능').length;
      $('ops-metrics').innerHTML=[['협력 명단',ps.length,'지역 내 등록 주유소'],['오피넷 연결',linked.length,`${ps.length?Math.round(linked.length/ps.length*100):0}% 정보 연결`],['가격 표시',all.filter(s=>s.price>0).length,'선택 유종 · 조회·저장 자료'],['응답 대기',waiting,'체험 요청 · 현재 브라우저']].map(([label,value,caption])=>`<article><span>${label}</span><strong>${num(value)}<small>${label==='응답 대기'?'건':'곳'}</small></strong><p>${caption}</p></article>`).join('');
      const pct=ps.length?linked.length/ps.length*100:0;
      $('ops-network').innerHTML=`<div class="ops-donut" role="img" aria-label="협력 명단 ${ps.length}곳 중 오피넷 ID 연결 ${linked.length}곳" style="--portion:${pct}%"><div><strong>${num(linked.length)}</strong><span>오피넷 연결</span></div></div><div class="ops-legend"><span>원본 협력 명단 <b>${ps.length}</b></span><span>오피넷 ID 연결 <b>${linked.length}</b></span><span>오피넷 ID 확인 필요 <b>${ps.length-linked.length}</b></span></div><p class="note">원본 명단 전체 중 주소·전화번호가 일치한 주유소만 연결했습니다.</p>`;
      const sample=directory?.fuel===selectedFuel?filterRegion(directory.items):[];
      const peer=sample.filter(s=>!allIds.has(s.id)&&s.price>0),co=sample.filter(s=>allIds.has(s.id)&&s.price>0);
      const mean=list=>list.length?list.reduce((sum,s)=>sum+s.price,0)/list.length:null;
      const values=[mean(co),mean(peer)],max=Math.max(...values.filter(v=>v!==null),1);
      $('ops-price-caption').textContent=fuelNames[selectedFuel]+' · 동일 조회 표본';
      $('ops-price-chart').innerHTML=values.map((value,i)=>`<div class="ops-bar-row"><div><span>${i===0?'협력 주유소':'그 외 조회 주유소'} <small>${i===0?co.length:peer.length}곳</small></span><strong>${value===null?'자료 없음':value.toLocaleString('ko-KR',{minimumFractionDigits:2,maximumFractionDigits:2})+'원/L'}</strong></div><div class="ops-bar-track"><span style="width:${value===null?0:value/max*100}%;background:${i===0?'#fc0019':'#4b82df'}"></span></div></div>`).join('')+`<p class="note">${values.every(v=>v!==null)&&amountOk?`${liters}L 기준 표본 평균 주유비 차이 ${num(Math.round(Math.abs(values[0]-values[1])*liters))}원 · `:''}조회 표본의 단순 평균이며 차액은 반올림 전 평균으로 계산합니다. 이동비 제외.</p>`;
      $('ops-requests').innerHTML=`<div class="ops-request-total"><strong>${requests.length}</strong><span>전체 체험 요청</span></div><div class="ops-legend"><span>응답 대기 <b>${waiting}</b></span><span>도움 가능 응답 <b>${ready}</b></span></div><p class="note">응답 완료·취소를 포함한 현재 브라우저의 요청입니다.</p>`;
      const q=$('ops-search').value.trim().toLowerCase();
      const visible=all.filter(s=>(group==='all'||(group==='partner'?s.partner:s.partner&&s.linked))&&(s.name+' '+s.address).toLowerCase().includes(q)).sort((a,b)=>Number(b.partner)-Number(a.partner)||a.district.localeCompare(b.district,'ko')||a.name.localeCompare(b.name,'ko'));
      page=Math.max(0,Math.min(page,Math.ceil(visible.length/12)-1));
      $('ops-table-count').textContent=visible.length+'곳';
      $('ops-table').innerHTML=visible.slice(page*12,page*12+12).map(s=>`<tr><td><input type="checkbox" aria-label="${esc(s.name)} 비교 선택" data-compare="${esc(s.id)}" ${selected.has(s.id)?'checked':''}></td><td><b>${esc(s.name)}</b><small>${esc(s.address||s.id)}</small></td><td>${esc(s.district)}</td><td><span class="ops-badge ${s.partner?'green':''}">${s.partner?'명단 기재':'일반 주유소'}</span></td><td><strong>${s.price>0?num(s.price):'—'}</strong>${s.priceSource==='saved-detail'&&s.price>0?'<small>저장된 상세가격</small>':''}</td><td>${s.detail?s.detail.qualityCertified===true?'인증 협약':s.detail.qualityCertified===false?'비협약':'정보 없음':s.linked?'상세 조회':'정보 없음'}</td><td><button class="link" data-open="${esc(s.id)}" ${!s.linked?'disabled':''}>가격·시설</button></td></tr>`).join('')||'<tr><td colspan="7">조건에 맞는 주유소가 없습니다.</td></tr>';
      $('ops-page').textContent=`${visible.length?page+1:0} / ${Math.ceil(visible.length/12)}`;$('ops-prev').disabled=page===0;$('ops-next').disabled=(page+1)*12>=visible.length;
      $('ops-table').querySelectorAll('[data-open]').forEach(b=>b.onclick=()=>window.PetroStationInfo?.show(b.dataset.open));
      $('ops-table').querySelectorAll('[data-compare]').forEach(b=>b.onchange=()=>{if(b.checked&&selected.size>=3){b.checked=false;return;}if(b.checked)selected.add(b.dataset.compare);else selected.delete(b.dataset.compare);render();});
      const chosen=rows().filter(s=>selected.has(s.id));
      $('ops-comparison').innerHTML=chosen.length?`<div class="ops-chosen">${chosen.map(s=>`<article><b>${esc(s.name)}</b><span>${amountOk&&s.price>0?num(Math.round(s.price*liters))+'원':'주유량·가격 확인'}</span><small>${s.price>0?num(s.price)+'원/L':'가격 정보 없음'} × ${esc(liters)}L · 이동비 제외</small></article>`).join('')}</div>`:'';
      const time=directory?.queried_at||window.PETROMATE_DASHBOARD_DATA?.verified_at;
      $('ops-source').textContent=`${sourceMode==='live'?'오피넷 조회':'저장된 조회 자료'} · ${time?new Date(time).toLocaleString('ko-KR'):''} · 구별 최대 20곳${directory?.fuel!==selectedFuel?' · 이 유종은 연결 주유소의 저장된 상세가격만 표시':''}`;
    }
    async function refresh() {
      const token=++requestToken,button=$('ops-refresh');button.disabled=true;$('ops-source').textContent='서울 25개 구의 가격을 조회하고 있습니다.';
      try {const response=await fetch('/api/seoul-stations?fuel='+encodeURIComponent(selectedFuel));if(!response.ok)throw new Error();const data=await response.json();if(token!==requestToken||!current())return;directory=data;sourceMode='live';render();}
      catch{if(current()&&token===requestToken){render();$('ops-source').textContent+=' · 새 조회 연결이 지연되어 저장 자료를 표시합니다.';}}
      finally{if(current()&&token===requestToken)button.disabled=false;}
    }
    $('ops-refresh').onclick=refresh;
    $('ops-district').onchange=()=>{page=0;render();};$('ops-fuel').onchange=()=>{requestToken++;$('ops-refresh').disabled=false;selectedFuel=$('ops-fuel').value;selected.clear();page=0;render();marketReady.then(m=>m?.averages(market,selectedFuel));};$('ops-liters').oninput=render;$('ops-search').oninput=()=>{page=0;render();};
    host.querySelectorAll('[data-group]').forEach(b=>b.onclick=()=>{group=b.dataset.group;page=0;host.querySelectorAll('[data-group]').forEach(x=>x.classList.toggle('active',x===b));render();});
    $('ops-prev').onclick=()=>{page--;render();};$('ops-next').onclick=()=>{page++;render();};
    dataReady.then(()=>{if(!current())return;directory=directory||window.PETROMATE_DASHBOARD_DATA?.directory;const districts=[...new Set([...partners.map(districtOf),...(directory?.items||[]).map(s=>s.district)])].sort((a,b)=>a.localeCompare(b,'ko'));$('ops-district').innerHTML='<option value="">서울 전체</option>'+districts.map(d=>`<option>${esc(d)}</option>`).join('');render();});
  };
  if(view==='admin'&&adminPage==='운영 현황')admin();
})();
