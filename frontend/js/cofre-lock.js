/* cofre-lock.js — chave só em memória + auto-lock (inatividade + visibilitychange + fechar) */
(function(global){
  var _key=null, _timer=null, AUTO_LOCK_MS=180*1000;
  function resetTimer(){ if(_timer) clearTimeout(_timer); if(_key) _timer=setTimeout(travar, AUTO_LOCK_MS); }
  function setKey(k){ _key=k; resetTimer(); }
  function getKey(){ return _key; }
  function estaDestravado(){ return _key!==null; }
  function travar(){ _key=null; if(_timer){ clearTimeout(_timer); _timer=null; } if(typeof global.onCofreTravado==='function') global.onCofreTravado(); }
  ['click','keydown','mousemove','touchstart'].forEach(function(ev){ global.addEventListener(ev, function(){ if(_key) resetTimer(); }, {passive:true}); });
  if(global.document) global.document.addEventListener('visibilitychange', function(){ if(global.document.hidden) travar(); });
  global.addEventListener('beforeunload', travar);
  global.addEventListener('pagehide', travar);
  global.CofreLock={ setKey:setKey, getKey:getKey, estaDestravado:estaDestravado, travar:travar, resetTimer:resetTimer, AUTO_LOCK_MS:AUTO_LOCK_MS };
})(window);
