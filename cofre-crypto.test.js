globalThis.crypto = require('crypto').webcrypto;
const C = require('/opt/cardbase/frontend/js/cofre-crypto.js');
let pass=0, fail=0;
function check(ok,msg){ if(ok){pass++;console.log('  \u2713',msg);} else {fail++;console.log('  \u2717',msg);} }
(async()=>{
  try{
    check(typeof crypto.subtle==='object','crypto.subtle disponível (Node webcrypto)');
    const salt=C.gerarSaltB64();
    const keyA=await C.deriveKey('senha-correta-FAKE',salt,600000);
    const keyB=await C.deriveKey('senha-ERRADA-FAKE',salt,600000);
    const e1=await C.encrypt(keyA,'segredo123');
    check((await C.decrypt(keyA,e1.iv,e1.ct))==='segredo123','round-trip cifra/decifra com a chave certa');
    let falhou=false; try{ await C.decrypt(keyB,e1.iv,e1.ct);}catch(_){falhou=true;}
    check(falhou,'senha-mestre ERRADA não decifra (falha de autenticação do GCM)');
    const v=await C.criarVerifier(keyA);
    check((await C.checarVerifier(keyA,v.iv,v.ct))===true,'verifier valida a senha correta');
    check((await C.checarVerifier(keyB,v.iv,v.ct))===false,'verifier REJEITA a senha errada');
    const e2=await C.encrypt(keyA,'igual'), e3=await C.encrypt(keyA,'igual');
    check(e2.iv!==e3.iv,'IVs distintos por operação');
    check(keyA.extractable===false,'chave AES é NÃO-exportável');
    let exportou=false; try{ await crypto.subtle.exportKey('raw',keyA); exportou=true; }catch(_){}
    check(!exportou,'exportKey da chave FALHA (não-extraível, não dá pra persistir)');
  }catch(e){ check(false,'ERRO inesperado: '+e.message); }
  console.log('\n'+(fail===0?('TODOS PASSARAM ('+pass+')'):('FALHAS: '+fail+' / OK: '+pass)));
  process.exit(fail===0?0:1);
})();
