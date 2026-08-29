(function (window, document) {
  'use strict';

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
  window.supabase = {};
  window.SUPABASE_CONFIG = {};
  window.READING_AUTH = {};
  window.SITE_AUTH = {
    ready: true,
    authResolved: true,
    authError: null,
    user: { id: 'preview-login-free', email: 'preview-only@example.invalid', user_metadata: { display_name: 'Preview' } },
    onChange: function (callback) { window.setTimeout(function () { callback(window.SITE_AUTH.user); }, 0); },
    onAuthChange: function (callback) { window.setTimeout(function () { callback(window.SITE_AUTH.user); }, 0); }
  };
  window.__GAME_SEARCH_PROTECTED_PREVIEW__ = true;
  document.documentElement.setAttribute('data-preview-network-guard', 'active');

  function blockedResponse() {
    return Promise.resolve(new Response('{"error":"PREVIEW_UI_ONLY_NETWORK_BLOCKED"}', {
      status: 451,
      headers: { 'Content-Type': 'application/json; charset=utf-8', 'X-Preview-Guard': 'blocked' }
    }));
  }
  window.fetch = function () { return blockedResponse(); };
  if (window.navigator && typeof window.navigator.sendBeacon === 'function') {
    try { Object.defineProperty(window.navigator, 'sendBeacon', { configurable: true, value: function () { return false; } }); }
    catch (_error) { window.navigator.sendBeacon = function () { return false; }; }
  }
  function BlockedSocket() { throw new Error('PREVIEW_UI_ONLY_NETWORK_BLOCKED'); }
  window.WebSocket = BlockedSocket;
  window.EventSource = BlockedSocket;

  function toast(message) {
    var node = document.getElementById('game-search-preview-toast');
    if (!node) {
      node = document.createElement('div');
      node.id = 'game-search-preview-toast';
      node.setAttribute('role', 'status');
      node.style.cssText = 'position:fixed;left:50%;bottom:76px;z-index:2147483647;transform:translateX(-50%);max-width:min(88vw,520px);padding:10px 15px;border-radius:999px;background:#392708;color:#fff8e8;font:700 13px/1.45 sans-serif;box-shadow:0 8px 26px rgba(0,0,0,.24);text-align:center;';
      document.body.appendChild(node);
    }
    node.textContent = message;
    node.hidden = false;
    window.clearTimeout(node.__previewTimer);
    node.__previewTimer = window.setTimeout(function () { node.hidden = true; }, 2600);
  }

  document.addEventListener('click', function (event) {
    var search = event.target && event.target.closest ? event.target.closest('#gameSearchBtn') : null;
    var login = event.target && event.target.closest ? event.target.closest('[data-auth-provider],[data-login-provider],#rg-g,#rg-fb,#rg-line,#rg-send,#rg-verify,#rg-resend') : null;
    var link = event.target && event.target.closest ? event.target.closest('a[href]') : null;
    if (!search && !login && !link) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    toast(search ? '預覽專用：不執行搜尋、不使用額度' : '預覽專用：不登入、不開啟外部頁面');
  }, true);
  document.addEventListener('submit', function (event) {
    event.preventDefault();
    event.stopImmediatePropagation();
    toast('預覽專用：不送出任何資料');
  }, true);

  document.addEventListener('DOMContentLoaded', function () {
    var host = document.querySelector('.gh-wrap');
    if (!host) return;
    var label = document.createElement('div');
    label.id = 'game-search-preview-label';
    label.setAttribute('role', 'note');
    label.textContent = '預覽專用 · 模擬 Login Free · 不連接帳號、資料庫或搜尋額度';
    label.style.cssText = 'margin:0 0 12px;padding:8px 11px;border:1px solid #C8973A;border-radius:12px;background:#FFF8E8;color:#765113;text-align:center;font:800 11px/1.4 sans-serif;';
    host.insertBefore(label, host.firstChild);
  });
})(window, document);
