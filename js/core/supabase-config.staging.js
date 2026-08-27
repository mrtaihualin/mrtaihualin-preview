// ════════════════════════════════════════════════════════════
// STAGING ONLY (P7-02) — ค่า Supabase ของ staging project (xufxvwcelbovzsxywawg)
// ใช้ทดสอบก่อนขึ้นเว็บจริงเท่านั้น ห้าม deploy ไฟล์นี้ขึ้น mrtaihualin.com
// ไฟล์นี้อยู่ใน .gitignore แล้ว (บรรทัด "supabase-config.staging.js") — จะไม่ถูก commit ขึ้น GitHub
// ════════════════════════════════════════════════════════════
window.SUPABASE_CONFIG = {
  url:     'https://xufxvwcelbovzsxywawg.supabase.co',
  anonKey: 'sb_publishable_fRjIbF93IyI0WE9XuBeBfA_p8lUu92P',

  // Channel ID ของ LINE Login channel "mrtaihualin staging" (สร้าง 2026-08-10 แยกจาก production)
  lineChannelId: '2011045490',

  requireLogin: false
};

// ════════════════════════════════════════════════════════════
// [02] SHARED SUPABASE CLIENT (singleton) — ก็อปจาก js/core/supabase-config.js ตรงๆ ไม่ได้แก้ตรรกะ
// ════════════════════════════════════════════════════════════
window.getSupabaseClient = function () {
  if (window.__SB_CLIENT) return window.__SB_CLIENT;
  var c = window.SUPABASE_CONFIG || {};
  var ok = c.url && c.anonKey &&
           String(c.url).indexOf('YOUR_') === -1 &&
           String(c.anonKey).indexOf('YOUR_') === -1 &&
           window.supabase && window.supabase.createClient;
  if (!ok) return null;
  window.__SB_CLIENT = window.supabase.createClient(c.url, c.anonKey);
  return window.__SB_CLIENT;
};
