(function (root) {
  'use strict';
  const KEY = 'petromate-demo-review-v1';
  function read() { try { const v=JSON.parse(root.localStorage.getItem(KEY)||'{}'); return v && typeof v==='object' && !Array.isArray(v) ? v : {}; } catch { return {}; } }
  function excluded(id) { return Boolean(id && read()[id] === '추가 검토'); }
  function set(id, state) { if(!id || !['대조 확인','추가 검토'].includes(state)) return false; try { const v=read(); if(state==='추가 검토')v[id]=state; else delete v[id]; root.localStorage.setItem(KEY,JSON.stringify(v)); return true; } catch { return false; } }
  function clear() { try { root.localStorage.removeItem(KEY); return true; } catch { return false; } }
  root.PetroReview={excluded,set,clear};
})(globalThis);
