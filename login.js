/* ==========================================================================
   Project hub: sign in
   The hub (its layout, site list and code) is published only as hub.enc,
   encrypted with a key made from your username and password. Signing in
   rebuilds that key in the browser and decrypts the hub; a wrong password
   simply fails to decrypt. The password itself is stored nowhere.

   "Keep me signed in" saves the derived key (never the password) on this
   device. Re-encrypting the hub (new password or new content) changes the
   salt, which signs every device out.
   ========================================================================== */

(function () {
  'use strict';

  const STORE_KEY = 'hub.session';
  const $ = (sel) => document.querySelector(sel);
  const form = $('[data-login]');
  const userEl = $('#login-user');
  const passEl = $('#login-pass');
  const keepEl = $('#login-keep');
  const errEl = $('[data-login-error]');
  const btn = $('[data-login-submit]');
  const screen = $('[data-login-screen]');

  const fromB64 = (s) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));
  const toB64 = (buf) => btoa(String.fromCharCode(...new Uint8Array(buf)));

  let encPromise = null;
  const loadEnc = () =>
    (encPromise ||= fetch('hub.enc', { cache: 'no-cache' }).then((r) => {
      if (!r.ok) throw new Error('missing');
      return r.json();
    }));

  function storage(kind) {
    try {
      const s = kind === 'local' ? window.localStorage : window.sessionStorage;
      s.getItem('x');
      return s;
    } catch {
      return null;
    }
  }

  function readSession() {
    for (const kind of ['session', 'local']) {
      const s = storage(kind);
      try {
        const v = s && JSON.parse(s.getItem(STORE_KEY) || 'null');
        if (v && v.key && v.salt) return v;
      } catch {
        /* ignore */
      }
    }
    return null;
  }

  function clearSession() {
    for (const kind of ['session', 'local']) {
      try {
        storage(kind)?.removeItem(STORE_KEY);
      } catch {
        /* ignore */
      }
    }
  }

  async function deriveKey(enc, user, pass) {
    const secret = new TextEncoder().encode(`${user.trim().toLowerCase()}:${pass}`);
    const base = await crypto.subtle.importKey('raw', secret, 'PBKDF2', false, ['deriveKey']);
    return crypto.subtle.deriveKey(
      { name: 'PBKDF2', hash: enc.kdf.hash, salt: fromB64(enc.kdf.salt), iterations: enc.kdf.iterations },
      base,
      { name: 'AES-GCM', length: 256 },
      true,
      ['decrypt'],
    );
  }

  async function decrypt(enc, key) {
    const plain = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: fromB64(enc.iv) }, key, fromB64(enc.data));
    return JSON.parse(new TextDecoder().decode(plain));
  }

  // Put the hub on the page and run its scripts, in order.
  function mount(hub) {
    // Private images arrive inside the hub; give the page short-lived local addresses for them.
    window.HUB_ASSETS = {};
    for (const [name, dataUrl] of Object.entries(hub.assets || {})) {
      const [head, body] = dataUrl.split(',');
      const type = head.slice(5, head.indexOf(';'));
      window.HUB_ASSETS[name] = URL.createObjectURL(new Blob([fromB64(body)], { type }));
    }
    screen.remove();
    document.body.classList.remove('is-locked');
    document.body.insertAdjacentHTML('afterbegin', hub.html);
    for (const code of hub.scripts) {
      const s = document.createElement('script');
      s.textContent = code;
      document.body.append(s);
    }
    document.querySelector('[data-signout]')?.addEventListener('click', () => {
      clearSession();
      location.replace(location.pathname);
    });
  }

  async function resume() {
    const saved = readSession();
    if (!saved) return false;
    try {
      const enc = await loadEnc();
      if (saved.salt !== enc.kdf.salt) throw new Error('stale');
      const key = await crypto.subtle.importKey('raw', fromB64(saved.key), 'AES-GCM', false, ['decrypt']);
      mount(await decrypt(enc, key));
      return true;
    } catch {
      clearSession();
      return false;
    }
  }

  let fails = 0;
  let waitUntil = 0;

  function showError(text) {
    errEl.textContent = text;
    errEl.hidden = !text;
    form.classList.toggle('has-error', !!text);
  }

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (Date.now() < waitUntil) return;
    const user = userEl.value;
    const pass = passEl.value;
    if (!user.trim() || !pass) {
      showError('Enter your username and password.');
      (user.trim() ? passEl : userEl).focus();
      return;
    }
    showError('');
    btn.disabled = true;
    form.classList.add('is-busy');
    try {
      const enc = await loadEnc();
      const key = await deriveKey(enc, user, pass);
      let hub;
      try {
        hub = await decrypt(enc, key);
      } catch {
        fails += 1;
        // Short, growing pause after repeated wrong attempts.
        const pause = fails >= 3 ? Math.min(30, 2 ** (fails - 2)) : 0;
        waitUntil = Date.now() + pause * 1000;
        showError(pause ? `Username or password is incorrect. Try again in ${pause} s.` : 'Username or password is incorrect.');
        passEl.select();
        if (pause) setTimeout(() => { btn.disabled = false; }, pause * 1000);
        return;
      }
      const raw = toB64(await crypto.subtle.exportKey('raw', key));
      const s = storage(keepEl.checked ? 'local' : 'session');
      clearSession();
      try {
        s?.setItem(STORE_KEY, JSON.stringify({ key: raw, salt: enc.kdf.salt }));
      } catch {
        /* signed in for this page only */
      }
      mount(hub);
    } catch (err) {
      showError(
        !window.crypto?.subtle
          ? 'This browser can’t sign in here. Open the hub over https in an up-to-date browser.'
          : 'The hub couldn’t be loaded. Check your connection and try again.',
      );
    } finally {
      form.classList.remove('is-busy');
      if (Date.now() >= waitUntil) btn.disabled = false;
    }
  });

  // Signed in on this device already? Skip the form.
  resume().then((ok) => {
    if (!ok) {
      screen.hidden = false;
      document.body.classList.remove('is-checking');
      userEl.focus({ preventScroll: true });
    }
  });
})();
