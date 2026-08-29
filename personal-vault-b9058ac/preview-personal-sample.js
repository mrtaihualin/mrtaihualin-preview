(function (window) {
  'use strict';

  var client = window.__PREVIEW_SUPABASE_CLIENT__;
  var user = window.__PREVIEW_USER__;
  if (!client || !user) throw new Error('TASK3_PREVIEW_SAMPLE_GUARD_MISSING');

  if (window.WordVault && typeof window.WordVault.sync === 'function') {
    window.WordVault.sync(client, user.id);
  }
  if (window.SentenceVault && typeof window.SentenceVault.sync === 'function') {
    window.SentenceVault.sync(client, user.id);
  }

  window.PracticeEvents = window.PracticeEvents || {};
  window.PracticeEvents.status = function (items) {
    var result = {};
    (items || []).forEach(function (item) {
      var key = String(item.kind || '') + ':' + String(item.key || '');
      result[key] = {
        played: true,
        last_played_at: item.kind === 'sentence'
          ? '2026-08-29T09:30:00.000Z'
          : '2026-08-29T09:20:00.000Z'
      };
    });
    return Promise.resolve(result);
  };

  document.documentElement.setAttribute('data-preview-personal-sample', 'active');
})(window);
