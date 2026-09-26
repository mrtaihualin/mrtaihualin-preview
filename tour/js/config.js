export const TOUR_CONFIG = Object.freeze({
  supabaseUrl: 'https://xufxvwcelbovzsxywawg.supabase.co',
  publishableKey: 'sb_publishable_fRjIbF93IyI0WE9XuBeBfA_p8lUu92P',
  rpcPrefix: 'tour_v1_',
  pollIntervalMs: 2500,
  locationUpdateMinMs: 5000,
  locationUpdateMinMeters: 15,
  sessionInactivityDays: 7,
  locationShareMinutes: 20,
  storageKey: 'tour.v1.session',
  supportedLocales: ['zh-TW', 'zh-CN', 'th', 'en', 'ja'],
  exposedLocales: ['zh-TW', 'th']
});
