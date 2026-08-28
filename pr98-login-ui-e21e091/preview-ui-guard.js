(function (window, document) {
  'use strict';

  var nativeFetch = window.fetch ? window.fetch.bind(window) : null;
  var nativeOpen = window.open ? window.open.bind(window) : null;
  var guardScript = document.currentScript;
  var previewBase = guardScript && guardScript.src
    ? new URL('.', guardScript.src).pathname
    : window.location.pathname.replace(/[^/]*$/, '');

  function memoryStorage() {
    var values = Object.create(null);
    var store = {
      key: function (index) {
        var keys = Object.keys(values);
        return index >= 0 && index < keys.length ? keys[index] : null;
      },
      getItem: function (key) {
        key = String(key);
        return Object.prototype.hasOwnProperty.call(values, key) ? values[key] : null;
      },
      setItem: function (key, value) { values[String(key)] = String(value); },
      removeItem: function (key) { delete values[String(key)]; },
      clear: function () { values = Object.create(null); }
    };
    Object.defineProperty(store, 'length', {
      enumerable: true,
      get: function () { return Object.keys(values).length; }
    });
    return store;
  }

  try {
    Object.defineProperty(window, 'localStorage', { configurable: true, value: memoryStorage() });
    Object.defineProperty(window, 'sessionStorage', { configurable: true, value: memoryStorage() });
    document.documentElement.setAttribute('data-preview-storage-guard', 'isolated-memory');
  } catch (_storageError) {
    document.documentElement.setAttribute('data-preview-storage-guard', 'failed-closed');
    throw new Error('PREVIEW_UI_ONLY_STORAGE_ISOLATION_FAILED');
  }
  var fixture = Object.freeze({
    tier: 'preview-ui-only',
    words: [
      { word: 'กิน', en: 'gin', zh: '吃', level: '初', category: 'กริยา', syls: [{ cons: 'ก', vowel: 'อิ', final: 'น', tone_name: 'สามัญ', th: 'กิน' }] },
      { word: 'ไป', en: 'bpai', zh: '去', level: '初', category: 'กริยา', syls: [{ cons: 'ป', vowel: 'ไอ', tone_name: 'สามัญ', th: 'ไป' }] },
      { word: 'มา', en: 'maa', zh: '來', level: '初', category: 'กริยา', syls: [{ cons: 'ม', vowel: 'อา', tone_name: 'สามัญ', th: 'มา' }] },
      { word: 'ผม', en: 'phǒm', zh: '頭髮', level: '初', category: 'นามร่างกาย', syls: [{ cons: 'ผ', vowel: 'โอะ', final: 'ม', tone_name: 'จัตวา', th: 'ผม' }] },
      { word: 'ข้าว', en: 'khâao', zh: '飯', level: '初', category: 'นามอาหาร', syls: [{ cons: 'ข', vowel: 'อา', tone: '้', final: 'ว', tone_name: 'โท', th: 'ข้าว' }] },
      { word: 'บ้าน', en: 'bâan', zh: '家', level: '初', category: 'นามของใช้', syls: [{ cons: 'บ', vowel: 'อา', tone: '้', final: 'น', tone_name: 'โท', th: 'บ้าน' }] }
    ],
    sentences: [{
      th: 'ผมกินข้าวอยู่ที่บ้าน', zh: '我在家吃飯', readingTH: 'ผม-กิน-ข้าว-อยู่-ที่-บ้าน', wc: 6, politeF: null,
      words: [
        { th: 'ผม', zh: '我', syls: [{ cons: 'ผ', vowel: 'โอะ', final: 'ม', tone_name: 'จัตวา', th: 'ผม', en: 'phǎm' }] },
        { th: 'กิน', zh: '吃', syls: [{ cons: 'ก', vowel: 'อิ', final: 'น', tone_name: 'สามัญ', th: 'กิน', en: 'gin' }] },
        { th: 'ข้าว', zh: '飯', syls: [{ cons: 'ข', vowel: 'อา', tone: '้', final: 'ว', tone_name: 'โท', th: 'ข้าว', en: 'khâao' }] },
        { th: 'อยู่', zh: '在（進行）', syls: [{ cons: 'ย', lead: 'อ', vowel: 'อู', tone: '่', tone_name: 'เอก', th: 'อยู่', en: 'yùu' }] },
        { th: 'ที่', zh: '在（地點）', syls: [{ cons: 'ท', vowel: 'อี', tone: '่', tone_name: 'โท', th: 'ที่', en: 'thîi' }] },
        { th: 'บ้าน', zh: '家', syls: [{ cons: 'บ', vowel: 'อา', tone: '้', final: 'น', tone_name: 'โท', th: 'บ้าน', en: 'bâan' }] }
      ]
    }],
    audioAvailable: [],
    capped: { preview: true }
  });

  window.__PR98_UI_PREVIEW_NO_NETWORK__ = true;
  window.__PR98_UI_PREVIEW_FIXTURE__ = fixture;
  document.documentElement.setAttribute('data-preview-network-guard', 'active');
  window.dataLayer = [];
  window.gtag = function () {};

  function requestUrl(input) {
    try { return new URL(typeof input === 'string' ? input : input.url, window.location.href); }
    catch (_error) { return null; }
  }

  function response(body, status) {
    return Promise.resolve(new Response(JSON.stringify(body), {
      status: status,
      headers: { 'Content-Type': 'application/json; charset=utf-8', 'X-Preview-Guard': 'blocked' }
    }));
  }

  window.fetch = function (input, options) {
    var url = requestUrl(input);
    var method = String((options && options.method) || (input && input.method) || 'GET').toUpperCase();
    if (url && /\/functions\/v1\/game-content(?:$|[?#])/.test(url.href)) return response(fixture, 200);
    if (url && url.origin === window.location.origin && method === 'GET' && nativeFetch) return nativeFetch(input, options);
    return response({ error: 'PREVIEW_UI_ONLY_NETWORK_BLOCKED' }, 451);
  };

  if (window.navigator && typeof window.navigator.sendBeacon === 'function') {
    try { Object.defineProperty(window.navigator, 'sendBeacon', { configurable: true, value: function () { return false; } }); }
    catch (_error) { window.navigator.sendBeacon = function () { return false; }; }
  }

  function BlockedSocket() { throw new Error('PREVIEW_UI_ONLY_NETWORK_BLOCKED'); }
  window.WebSocket = BlockedSocket;
  window.EventSource = BlockedSocket;

  if (window.XMLHttpRequest) {
    var NativeXHR = window.XMLHttpRequest;
    window.XMLHttpRequest = function PreviewXHR() {
      var xhr = new NativeXHR();
      var nativeOpenXhr = xhr.open;
      var nativeSendXhr = xhr.send;
      var allowed = false;
      xhr.open = function (method, url) {
        var parsed = requestUrl(url);
        allowed = !!(parsed && parsed.origin === window.location.origin && String(method).toUpperCase() === 'GET');
        return nativeOpenXhr.apply(xhr, arguments);
      };
      xhr.send = function () {
        if (allowed) return nativeSendXhr.apply(xhr, arguments);
        window.setTimeout(function () { if (typeof xhr.onerror === 'function') xhr.onerror(new Event('error')); }, 0);
      };
      return xhr;
    };
  }

  function toast(message) {
    var node = document.getElementById('preview-ui-toast');
    if (!node) {
      node = document.createElement('div');
      node.id = 'preview-ui-toast';
      node.setAttribute('role', 'status');
      node.style.cssText = 'position:fixed;left:50%;bottom:22px;z-index:2147483647;transform:translateX(-50%);max-width:min(88vw,520px);padding:11px 16px;border-radius:999px;background:#392708;color:#fff8e8;font:700 13px/1.45 sans-serif;box-shadow:0 8px 26px rgba(0,0,0,.24);text-align:center;';
      document.body.appendChild(node);
    }
    node.textContent = message;
    node.hidden = false;
    window.clearTimeout(node.__previewTimer);
    node.__previewTimer = window.setTimeout(function () { node.hidden = true; }, 2600);
  }

  var blockedControls = '#rg-g,#rg-fb,#rg-line,#rg-send,#rg-verify,#rg-resend,#rg-ask-send,[data-auth-provider],[data-login-provider]';
  document.addEventListener('click', function (event) {
    var control = event.target && event.target.closest ? event.target.closest(blockedControls) : null;
    if (control) {
      event.preventDefault();
      event.stopImmediatePropagation();
      toast('UI Preview เท่านั้น — ปิดการเข้าสู่ระบบและการส่งข้อมูลจริง');
      return;
    }
    var anchor = event.target && event.target.closest ? event.target.closest('a[href]') : null;
    if (!anchor) return;
    var url = requestUrl(anchor.href);
    if (url && (url.origin !== window.location.origin || url.pathname.indexOf(previewBase) !== 0)) {
      event.preventDefault();
      event.stopImmediatePropagation();
      toast('UI Preview เท่านั้น — ปิดลิงก์ภายนอก');
    }
  }, true);

  document.addEventListener('submit', function (event) {
    event.preventDefault();
    event.stopImmediatePropagation();
    toast('UI Preview เท่านั้น — ไม่มีการส่งข้อมูล');
  }, true);

  window.open = function (url) {
    var parsed = requestUrl(url);
    if (!parsed || parsed.origin !== window.location.origin || parsed.pathname.indexOf(previewBase) !== 0) {
      toast('UI Preview เท่านั้น — ปิดหน้าต่างภายนอก');
      return null;
    }
    return nativeOpen ? nativeOpen.apply(window, arguments) : null;
  };
})(window, document);
