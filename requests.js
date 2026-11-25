(function (root) {
  'use strict';
  const KEY = 'petromate-demo-requests-v1';
  const HELP = ['차 안에서 직원의 주유 도움', '주유구 주변 조작 도움', '주유기 조작 도움', '주유 중 직원 도움', '결제 방법 확인', '아직 잘 모르겠어요'];
  const ETA = ['약 10분 후', '약 20분 후', '약 30분 후', '미정'];
  function parse(value) { try { const result = JSON.parse(value || '[]'); return Array.isArray(result) ? result : []; } catch { return []; } }
  function read() { try { return parse(root.localStorage.getItem(KEY)); } catch { return []; } }
  function write(rows) { try { root.localStorage.setItem(KEY, JSON.stringify(rows)); return true; } catch { return false; } }
  function add(station, help, eta) {
    if (!station || !station.matched || !station.id || (root.PetroReview && root.PetroReview.excluded(station.id)) || typeof help !== 'string' || !help.trim() || help.length > 200 || !ETA.includes(eta)) return null;
    const row = {id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`, stationId: String(station.id), stationName: String(station.name), help, eta, status: '응답 대기', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString()};
    return write([...read(), row]) ? row : null;
  }
  function update(id, action) {
    const rows = read(); const row = rows.find(r => r.id === id);
    const transitions = {'응답 대기': ['도움 가능', '지금 확인 어려움', '취소됨'], '도움 가능': ['취소됨'], '지금 확인 어려움': ['취소됨']};
    if (!row || !(transitions[row.status] || []).includes(action)) return false;
    row.status = action; row.updatedAt = new Date().toISOString(); return write(rows);
  }
  function clear() { try { root.localStorage.removeItem(KEY); return true; } catch { return false; } }
  root.PetroRequests = {read, add, update, clear, HELP, ETA};
})(globalThis);
