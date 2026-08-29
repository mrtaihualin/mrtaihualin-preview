(function (window) {
  'use strict';

  function result(data, error) { return Promise.resolve({ data: data, error: error || null, count: 0 }); }
  function previewError() { return new Error('PREVIEW_UI_ONLY_PROVIDER_BLOCKED'); }
  var previewUser = Object.freeze({
    id: '00000000-0000-4000-8000-000000000003',
    email: 'preview@example.invalid',
    app_metadata: { provider: 'preview' },
    user_metadata: { nickname: 'Lin（預覽）' },
    identities: []
  });
  var previewSession = Object.freeze({ user: previewUser, access_token: 'preview-memory-only', refresh_token: '' });
  function query(table) {
    var api = {};
    ['select', 'eq', 'neq', 'gt', 'gte', 'lt', 'lte', 'in', 'is', 'order', 'limit', 'range', 'match', 'filter', 'insert', 'upsert', 'update', 'delete'].forEach(function (name) {
      api[name] = function () { return api; };
    });
    api.single = function () { return result(table === 'profiles' ? { nickname: 'Lin（預覽）', avatar: null, badge_id: null } : null); };
    api.maybeSingle = api.single;
    api.then = function (resolve, reject) { return result([]).then(resolve, reject); };
    api.catch = function (reject) { return result([]).catch(reject); };
    return api;
  }

  function createClient() {
    var subscription = { unsubscribe: function () {} };
    return {
      auth: {
        getSession: function () { return result({ session: previewSession }); },
        getUser: function () { return result({ user: previewUser }); },
        refreshSession: function () { return result({ session: previewSession }); },
        onAuthStateChange: function (callback) {
          window.setTimeout(function () { callback('INITIAL_SESSION', previewSession); }, 0);
          return { data: { subscription: subscription } };
        },
        signInWithOAuth: function () { return result(null, previewError()); },
        signInWithOtp: function () { return result(null, previewError()); },
        verifyOtp: function () { return result(null, previewError()); },
        setSession: function () { return result({ session: null }, previewError()); },
        linkIdentity: function () { return result(null, previewError()); },
        signOut: function () { return result(null); }
      },
      functions: { invoke: function () { return result(null, previewError()); } },
      from: function (table) { return query(table); },
      rpc: function () { return result(null, previewError()); },
      storage: { from: function (bucket) { return query(bucket); } }
    };
  }

  window.supabase = Object.freeze({ createClient: createClient });
  window.__PREVIEW_SUPABASE_CLIENT__ = createClient();
  window.__PREVIEW_USER__ = previewUser;
  document.documentElement.setAttribute('data-preview-provider-stub', 'active');
})(window);
