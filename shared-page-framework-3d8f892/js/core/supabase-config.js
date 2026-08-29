window.SUPABASE_CONFIG = Object.freeze({
  url: 'https://preview.invalid',
  anonKey: 'preview-ui-only-public-placeholder',
  lineChannelId: '',
  requireLogin: false,
  runtimeMode: 'minimum-guest'
});
window.EMAIL_OTP_SECURITY_CONFIG = Object.freeze({ mode: 'off', turnstileSiteKey: '' });
window.isMinimumGuestOnly = function () { return false; };
window.getSupabaseClient = function () { return window.__PREVIEW_SUPABASE_CLIENT__; };
window.getAnonymousSupabaseClient = window.getSupabaseClient;
