(function (window, document) {
  'use strict';

  var PREFIX = '/mrtaihualin-preview/tone-phonics-manual-04c76f8/';
  var nativeFetch = window.fetch ? window.fetch.bind(window) : null;

  function memoryStorage() {
    var values = Object.create(null);
    return {
      key: function (index) { return Object.keys(values)[index] || null; },
      getItem: function (key) { return Object.prototype.hasOwnProperty.call(values, String(key)) ? values[String(key)] : null; },
      setItem: function (key, value) { values[String(key)] = String(value); },
      removeItem: function (key) { delete values[String(key)]; },
      clear: function () { values = Object.create(null); },
      get length() { return Object.keys(values).length; }
    };
  }

  Object.defineProperty(window, 'localStorage', { configurable: true, value: memoryStorage() });
  Object.defineProperty(window, 'sessionStorage', { configurable: true, value: memoryStorage() });
  window.localStorage.setItem('cookieConsent', 'denied');
  window.dataLayer = [];
  window.gtag = function () {};
  window.clarity = function () {};
  window.__TONE_PHONICS_PROTECTED_PREVIEW__ = true;
  document.documentElement.setAttribute('data-preview-network-guard', 'active');

  function blockedResponse() {
    return Promise.resolve(new Response('{"error":"PREVIEW_UI_ONLY_NETWORK_BLOCKED"}', {
      status: 451,
      headers: { 'Content-Type': 'application/json; charset=utf-8', 'X-Preview-Guard': 'blocked' }
    }));
  }

  window.fetch = function (input, init) {
    if (!nativeFetch) return blockedResponse();
    try {
      var raw = typeof input === 'string' ? input : input.url;
      var url = new URL(raw, window.location.href);
      if (url.origin === window.location.origin && url.pathname.indexOf(PREFIX) === 0) {
        return nativeFetch(input, init);
      }
    } catch (_error) {}
    return blockedResponse();
  };

  if (window.navigator && typeof window.navigator.sendBeacon === 'function') {
    try { Object.defineProperty(window.navigator, 'sendBeacon', { configurable: true, value: function () { return false; } }); }
    catch (_error) { window.navigator.sendBeacon = function () { return false; }; }
  }
  function BlockedSocket() { throw new Error('PREVIEW_UI_ONLY_NETWORK_BLOCKED'); }
  window.WebSocket = BlockedSocket;
  window.EventSource = BlockedSocket;

  document.addEventListener('click', function (event) {
    var link = event.target && event.target.closest ? event.target.closest('a[href]') : null;
    if (!link) return;
    event.preventDefault();
    event.stopImmediatePropagation();
  }, true);
  document.addEventListener('submit', function (event) {
    event.preventDefault();
    event.stopImmediatePropagation();
  }, true);

  document.addEventListener('DOMContentLoaded', function () {
    var note = document.createElement('div');
    note.id = 'tone-phonics-preview-label';
    note.setAttribute('role', 'note');
    note.textContent = '預覽專用 · 不登入、不寫入資料、不連接 Production';
    note.style.cssText = 'position:fixed;left:50%;bottom:10px;z-index:4090;transform:translateX(-50%);max-width:calc(100vw - 28px);padding:7px 12px;border:1px solid #C8973A;border-radius:999px;background:#FFF8E8;color:#765113;text-align:center;font:800 11px/1.4 sans-serif;box-shadow:0 6px 20px rgba(45,32,12,.14);';
    document.body.appendChild(note);
  });
})(window, document);
