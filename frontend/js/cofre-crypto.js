/* cofre-crypto.js — cripto zero-knowledge do cofre. Tudo no cliente.
   Derivação isolada em deriveKey() (trocar p/ Argon2id aqui no futuro). */
(function(global){
  var subtle = global.crypto.subtle;
  var KDF_ITERS_DEFAULT = 600000;
  var VERIFIER_TOKEN = "SGC-COFRE-V1";
  var enc = new TextEncoder(), dec = new TextDecoder();
  function _b64(buf){ var b=new Uint8Array(buf), s=''; for(var i=0;i<b.length;i++) s+=String.fromCharCode(b[i]); return global.btoa(s); }
  function _unb64(str){ var s=global.atob(str), b=new Uint8Array(s.length); for(var i=0;i<s.length;i++) b[i]=s.charCodeAt(i); return b; }
  function gerarSaltB64(){ var s=new Uint8Array(16); global.crypto.getRandomValues(s); return _b64(s); }
  async function deriveKey(masterPassword, saltB64, iters){
    iters = iters || KDF_ITERS_DEFAULT;
    var baseKey = await subtle.importKey('raw', enc.encode(masterPassword), {name:'PBKDF2'}, false, ['deriveKey']);
    return await subtle.deriveKey(
      {name:'PBKDF2', salt:_unb64(saltB64), iterations:iters, hash:'SHA-256'},
      baseKey, {name:'AES-GCM', length:256}, false, ['encrypt','decrypt']);
  }
  async function encrypt(key, plaintext){
    var iv=new Uint8Array(12); global.crypto.getRandomValues(iv);
    var ct=await subtle.encrypt({name:'AES-GCM', iv:iv}, key, enc.encode(plaintext));
    return { iv:_b64(iv), ct:_b64(ct) };
  }
  async function decrypt(key, ivB64, ctB64){
    var pt=await subtle.decrypt({name:'AES-GCM', iv:_unb64(ivB64)}, key, _unb64(ctB64));
    return dec.decode(pt);
  }
  async function criarVerifier(key){ return await encrypt(key, VERIFIER_TOKEN); }
  async function checarVerifier(key, ivB64, ctB64){ try{ return (await decrypt(key, ivB64, ctB64))===VERIFIER_TOKEN; }catch(e){ return false; } }
  var api={ KDF_ITERS_DEFAULT:KDF_ITERS_DEFAULT, gerarSaltB64:gerarSaltB64, deriveKey:deriveKey, encrypt:encrypt, decrypt:decrypt, criarVerifier:criarVerifier, checarVerifier:checarVerifier };
  global.CofreCrypto = api;
  if(typeof module!=='undefined' && module.exports) module.exports = api;
})(typeof window!=='undefined'?window:globalThis);
