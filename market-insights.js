(() => {
  const names={B027:'보통휘발유',D047:'경유',B034:'고급휘발유'};
  async function load(path){const r=await fetch(path);if(!r.ok)throw Error('unavailable');return r.json();}
  const format=n=>Number(n).toLocaleString('ko-KR',{maximumFractionDigits:2});
  const requests=new WeakMap();
  async function averages(target,fuel){
    const token={};requests.set(target,token);
    target.innerHTML='<strong>평균 유가</strong> · 불러오는 중';
    try{const d=await load('/api/averages');if(!target.isConnected||requests.get(target)!==token)return;
      const n=d.nation.rows.find(r=>r.PRODCD===fuel),s=d.seoul.rows.find(r=>r.PRODCD===fuel);
      if(!n && !s){target.innerHTML='<strong>평균 유가</strong> · 오피넷에서 현재 결과를 받지 못했어요.';return;}
      const date=n?.TRADE_DT?String(n.TRADE_DT):'기준일 미제공';
      target.innerHTML=`<strong>${names[fuel]} 평균 유가</strong><div class="market-values"><span>전국 <b>${n?format(n.PRICE)+'원/L':'정보 없음'}</b><small>기준일 ${date}</small></span><span>서울 <b>${s?format(s.PRICE)+'원/L':'정보 없음'}</b><small>조회 ${new Date(d.seoul.queried_at).toLocaleString('ko-KR')}</small></span></div><small>출처: 오피넷 평균가격 API · 서울은 조회 시각 표시</small>`;
    }catch{if(target.isConnected&&requests.get(target)===token)target.innerHTML='<strong>평균 유가</strong> · 현재 조회할 수 없어요.';}
  }
  async function nearby(target,id,fuel,price){
    target.textContent='주변 주유소 가격 비교 중';
    try{const d=await load('/api/nearby-comparison?id='+encodeURIComponent(id)+'&fuel='+encodeURIComponent(fuel));if(!target.isConnected)return;
      if(!d.count||d.average===null){target.textContent='주변 비교에 사용할 가격 정보가 없어요.';return;}
      const difference=price-d.average;
      target.innerHTML=`<strong>${names[fuel]} 주변 가격 비교</strong><p>반경 2km 내 다른 주유소 ${d.count}곳 평균 <b>${format(d.average)}원/L</b> · 최저 ${format(d.minimum)}원/L</p><p>이 주유소는 주변 평균보다 <b>${format(Math.abs(difference))}원/L ${difference>0?'높아요':difference<0?'낮아요':'같아요'}</b></p><small>직선거리 기준 · ${new Date(d.queried_at).toLocaleString('ko-KR')} 조회 · 현장 가격 변동 가능</small>`;
    }catch{if(target.isConnected)target.textContent='주변 가격 비교를 현재 불러올 수 없어요.';}
  }
  window.PetroMarket={averages,nearby};
})();
