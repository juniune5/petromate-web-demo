'use strict';
const list = document.getElementById('staff-list');
const escapeStaff = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function stamp(value) { const d = new Date(value); return Number.isNaN(d.getTime()) ? '시각 미확인' : d.toLocaleString('ko-KR'); }
function renderStaff() {
  const rows = PetroRequests.read().slice().reverse();
  document.getElementById('waiting').textContent = rows.filter(r => r.status === '응답 대기').length;
  document.getElementById('answered').textContent = rows.filter(r => r.status === '도움 가능' || r.status === '지금 확인 어려움').length;
  list.innerHTML = rows.length ? rows.map(r => `<article class="staff-card"><div class="staff-card-head"><div><span class="state ${r.status==='응답 대기'?'warn':'gray'}">${escapeStaff(r.status)}</span><h2>${escapeStaff(r.stationName)}</h2></div><span class="muted">${escapeStaff(stamp(r.createdAt))} 요청</span></div><div class="summary"><div><span>필요한 도움</span><strong>${escapeStaff(r.help)}</strong></div><div><span>방문 예정 · 이용자 직접 선택</span><strong>${escapeStaff(r.eta)}</strong></div></div>${r.status==='응답 대기'?`<div class="form-actions"><button class="primary" data-id="${escapeStaff(r.id)}" data-action="도움 가능">도움 가능으로 응답</button><button class="secondary" data-id="${escapeStaff(r.id)}" data-action="지금 확인 어려움">지금 확인 어려움</button></div>`:`<p class="note">응답: ${escapeStaff(r.status)} · ${escapeStaff(stamp(r.updatedAt))}</p>`}</article>`).join('') : '<div class="panel"><h2>아직 요청이 없어요</h2><p class="muted">이용자 화면에서 협력 주유소를 선택하고 도움을 요청해 보세요.</p><a href="map.html">이용자 지도로 이동 →</a></div>';
  list.querySelectorAll('[data-action]').forEach(button => button.addEventListener('click', () => { const ok = PetroRequests.update(button.dataset.id,button.dataset.action); document.getElementById('staff-feedback').textContent = ok ? '응답을 저장했어요. 이용자 화면에서 확인할 수 있어요.' : '응답을 저장하지 못했어요. 요청 상태를 확인해 주세요.'; renderStaff(); }));
}
document.getElementById('clear').addEventListener('click', () => { if (!confirm('이 브라우저에 저장된 시연 요청을 모두 지울까요?')) return; const ok = PetroRequests.clear(); document.getElementById('staff-feedback').textContent = ok ? '시연 요청을 지웠어요.' : '시연 요청을 지우지 못했어요.'; renderStaff(); });
window.addEventListener('storage', renderStaff);
renderStaff();
