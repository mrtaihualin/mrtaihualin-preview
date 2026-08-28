(function (window) {
  'use strict';

  function result(data, error) { return Promise.resolve({ data: data, error: error || null, count: 0 }); }
  function previewError() { return new Error('PREVIEW_UI_ONLY_PROVIDER_BLOCKED'); }
  function query() {
    var api = {};
    ['select', 'eq', 'neq', 'gt', 'gte', 'lt', 'lte', 'in', 'is', 'order', 'limit', 'range', 'match', 'filter', 'insert', 'upsert', 'update', 'delete'].forEach(function (name) {
      api[name] = function () { return api; };
    });
    api.single = function () { return result(null); };
    api.maybeSingle = function () { return result(null); };
    api.then = function (resolve, reject) { return result([]).then(resolve, reject); };
    api.catch = function (reject) { return result([]).catch(reject); };
    return api;
  }

  function createClient() {
    var subscription = { unsubscribe: function () {} };
    return {
      auth: {
        getSession: function () { return result({ session: null }); },
        getUser: function () { return result({ user: null }); },
        refreshSession: function () { return result({ session: null }); },
        onAuthStateChange: function (callback) {
          window.setTimeout(function () { callback('INITIAL_SESSION', null); }, 0);
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
      from: function () { return query(); },
      rpc: function () { return result(null, previewError()); },
      storage: { from: function () { return query(); } }
    };
  }

  window.supabase = Object.freeze({ createClient: createClient });
  window.__PREVIEW_SUPABASE_CLIENT__ = createClient();
  document.documentElement.setAttribute('data-preview-provider-stub', 'active');
})(window);
