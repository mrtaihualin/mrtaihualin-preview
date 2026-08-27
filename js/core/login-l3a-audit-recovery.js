// Temporary Hidden Preview-only LOGIN-L3A recovery control.
// It is inert unless the exact recovery query flag is present and must be
// removed immediately after the single authorized runtime audit succeeds.
(function () {
  'use strict';

  var RECOVERY_FLAG = 'login_l3a_audit_recovery';
  var PANEL_ID = 'login-l3a-audit-recovery-panel';
  var sent = false;

  function isRecoveryRoute() {
    try {
      return location.hostname === 'mrtaihualin.com' &&
        location.pathname === '/mrtaihualin-preview/vault.html' &&
        new URLSearchParams(location.search).get(RECOVERY_FLAG) === '1';
    } catch (e) {
      return false;
    }
  }

  function providerSet(user) {
    return (user && user.identities || []).reduce(function (out, identity) {
      if (identity && identity.provider) out[identity.provider] = true;
      return out;
    }, {});
  }

  function renderPanel(user) {
    if (!isRecoveryRoute() || !user || document.getElementById(PANEL_ID)) return;
    var client = window.getSupabaseClient && window.getSupabaseClient();
    if (!client) return;

    client.auth.getUser().then(function (result) {
      var freshUser = result && result.data && result.data.user;
      var providers = providerSet(freshUser);
      if (result && result.error || !freshUser || freshUser.id !== user.id || !providers.google || !providers.facebook) return;

      var panel = document.createElement('aside');
      panel.id = PANEL_ID;
      panel.setAttribute('aria-label', 'LOGIN-L3A temporary audit recovery');
      panel.style.cssText = 'position:fixed;right:12px;bottom:12px;z-index:100003;max-width:320px;' +
        'padding:12px;border:2px dashed #8B6310;border-radius:12px;background:#fffbe9;' +
        'box-shadow:0 4px 16px rgba(0,0,0,.2);font:13px/1.5 sans-serif;color:#3a2a0a;';
      panel.innerHTML = '<strong>Temporary LOGIN-L3A recovery</strong>' +
        '<p data-status style="margin:6px 0 10px;">Ready for the single authorized Facebook link audit.</p>' +
        '<button type="button" data-run style="padding:8px 12px;border:0;border-radius:8px;background:#8B6310;color:#fff;font-weight:700;cursor:pointer;">Run audit_link once</button>';

      var button = panel.querySelector('[data-run]');
      var status = panel.querySelector('[data-status]');
      button.addEventListener('click', function () {
        if (sent) return;
        sent = true;
        button.disabled = true;
        button.textContent = 'Running…';
        status.textContent = 'Request sent once. Do not retry.';

        client.functions.invoke('account-unlink', {
          body: { action: 'audit_link', provider: 'facebook' }
        }).then(function (result) {
          var data = result && result.data;
          if (!result.error && data && data.ok === true && data.action === 'audit_link' &&
              data.provider === 'facebook' && data.audit_logged === true) {
            button.hidden = true;
            panel.setAttribute('data-result', 'success');
            status.textContent = 'SUCCESS — audit logged. This temporary control must now be removed.';
            return;
          }
          panel.setAttribute('data-result', 'failed');
          button.textContent = 'Stopped — no retry';
          status.textContent = 'FAILED OR UNCERTAIN — stopped without retry.';
        }, function () {
          panel.setAttribute('data-result', 'failed');
          button.textContent = 'Stopped — no retry';
          status.textContent = 'FAILED OR UNCERTAIN — stopped without retry.';
        });
      });

      document.body.appendChild(panel);
    }).catch(function () {});
  }

  if (!isRecoveryRoute()) return;
  function wire() {
    if (!window.SITE_AUTH || typeof window.SITE_AUTH.onChange !== 'function') return false;
    window.SITE_AUTH.onChange(renderPanel);
    return true;
  }
  if (!wire()) {
    var attempts = 0;
    var timer = setInterval(function () {
      attempts += 1;
      if (wire() || attempts >= 40) clearInterval(timer);
    }, 100);
  }
})();
