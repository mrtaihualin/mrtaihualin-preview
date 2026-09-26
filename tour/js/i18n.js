import { TOUR_CONFIG } from './config.js';

export const UI = Object.freeze({
  'zh-TW': {
    'app.name': '旅途同行',
    'common.back': '返回',
    'common.error': '發生問題，請再試一次',
    'common.expired': '這個旅程已過期',
    'status.ready': '準備就緒',
    'status.connecting': '連線中',
    'status.online': '已連線',
    'status.offline': '連線中斷',
    'status.ended': '旅程已結束',
    'start.eyebrow': '不需登入・不需下載',
    'start.title': '掃描、確認、開始聯絡',
    'start.subtitle': '為旅客與泰國司機建立臨時且私密的旅程空間。',
    'start.scan': '掃描對方的 QR Code',
    'create.customerEyebrow': '旅客建立旅程',
    'create.customerTitle': '這趟旅程叫什麼？',
    'create.customerLabel': '旅程名稱或團體名稱',
    'create.customerHint': '不需要真實姓名，例如：Chen Family、Group A。',
    'create.customerButton': '建立並顯示 QR Code',
    'create.driverEyebrow': 'คนขับสร้างทริป',
    'create.driverTitle': 'กรอกทะเบียนรถ',
    'create.driverLabel': 'ทะเบียนรถ',
    'create.driverHint': 'ผู้โดยสารจะเห็นทะเบียนนี้ก่อนกดยืนยัน',
    'create.driverButton': 'สร้างและแสดง QR Code',
    'pairing.waiting': '等待對方加入',
    'pairing.showQr': '請讓對方掃描',
    'pairing.shareLink': '分享連結',
    'pairing.autoOpen': '對方確認後，這裡會自動進入旅程。',
    'pairing.confirmEyebrow': '請確認這是正確的旅程',
    'pairing.confirm': '確認並加入',
    'pairing.notMine': '這不是我的旅程',
    'pairing.driverPlate': '司機車牌：{label}',
    'pairing.customerTrip': '旅客旅程：{label}',
    'pairing.paired': '配對完成',
    'pairing.linkCopied': '邀請連結已複製',
    'scan.title': '掃描 QR Code',
    'scan.help': '將 QR Code 放入框內。若相機無法使用，可貼上邀請連結。',
    'scan.manualLabel': '邀請連結或代碼',
    'scan.open': '開啟',
    'scan.cameraUnavailable': '相機無法啟動，請貼上邀請連結。',
    'trip.customerRole': '旅客旅程',
    'trip.driverRole': 'คนขับ・ทริปปัจจุบัน',
    'trip.copyInvite': '複製旅程連結',
    'trip.end': '結束旅程',
    'trip.endConfirm': '確定要結束這個旅程嗎？雙方將無法繼續使用。',
    'trip.ended': '旅程已結束',
    'chat.title': '聊天',
    'chat.subtitle': '像平常一樣輸入訊息',
    'chat.inputLabel': '輸入訊息',
    'chat.placeholder': '輸入訊息…',
    'chat.empty': '從一句話開始吧',
    'chat.original': '原文',
    'chat.sent': '已送出',
    'chat.translationUnavailable': '此訊息目前顯示原文',
    'voice.read': '朗讀泰文',
    'voice.drivingMode': 'โหมดขับรถ',
    'appointment.title': '集合時間',
    'appointment.none': '尚未建立',
    'appointment.new': '新增集合時間',
    'appointment.place': '地點',
    'appointment.date': '日期',
    'appointment.time': '時間',
    'appointment.note': '備註（選填）',
    'appointment.send': '送出等待確認',
    'appointment.pending': '等待確認',
    'appointment.confirmed': '已確認',
    'appointment.confirm': '確認集合時間',
    'appointment.waitOther': '等待對方確認',
    'appointment.created': '集合時間已送出',
    'map.title': '即時位置',
    'map.closed': '尚未分享',
    'map.shareState': '位置分享狀態',
    'map.requestHelp': '任何一方都可以提出分享要求。',
    'map.request': '要求分享位置',
    'map.requestedByMe': '等待對方同意',
    'map.requestedByOther': '對方希望分享位置',
    'map.accept': '同意分享 20 分鐘',
    'map.active': '正在分享位置',
    'map.activeSummary': '正在分享・剩餘 {minutes} 分鐘',
    'map.route': '導航到對方位置',
    'map.met': '已經見面',
    'map.stop': '停止分享',
    'map.privacy': '只保存雙方最新位置；分享結束後立即移除。',
    'map.permissionDenied': '請允許瀏覽器使用位置，才能在地圖上顯示自己。',
    'map.waitingLocation': '等待取得位置…',
    'map.requestSent': '已送出位置分享要求',
    'map.shareAccepted': '已開始分享 20 分鐘',
    'map.shareStopped': '位置分享已停止',
    'map.expired': '位置分享已到期，若要繼續請重新提出要求。'
  },
  th: {
    'app.name': 'เพื่อนร่วมทริป',
    'common.back': 'กลับ',
    'common.error': 'เกิดข้อผิดพลาด กรุณาลองอีกครั้ง',
    'common.expired': 'ทริปนี้หมดอายุแล้ว',
    'status.ready': 'พร้อมใช้งาน',
    'status.connecting': 'กำลังเชื่อมต่อ',
    'status.online': 'เชื่อมต่อแล้ว',
    'status.offline': 'ขาดการเชื่อมต่อ',
    'status.ended': 'จบทริปแล้ว',
    'start.eyebrow': 'ไม่ต้องล็อกอิน・ไม่ต้องดาวน์โหลด',
    'start.title': 'สแกน ยืนยัน แล้วคุยกัน',
    'start.subtitle': 'พื้นที่ชั่วคราวและเป็นส่วนตัวสำหรับนักท่องเที่ยวกับคนขับไทย',
    'start.scan': 'สแกน QR Code ของอีกฝ่าย',
    'create.customerEyebrow': '旅客建立旅程',
    'create.customerTitle': '這趟旅程叫什麼？',
    'create.customerLabel': '旅程名稱或團體名稱',
    'create.customerHint': '不需要真實姓名，例如：Chen Family、Group A。',
    'create.customerButton': '建立並顯示 QR Code',
    'create.driverEyebrow': 'คนขับสร้างทริป',
    'create.driverTitle': 'กรอกทะเบียนรถ',
    'create.driverLabel': 'ทะเบียนรถ',
    'create.driverHint': 'ผู้โดยสารจะเห็นทะเบียนนี้ก่อนกดยืนยัน',
    'create.driverButton': 'สร้างและแสดง QR Code',
    'pairing.waiting': 'รออีกฝ่ายเข้าร่วม',
    'pairing.showQr': 'ให้อีกฝ่ายสแกน',
    'pairing.shareLink': 'แชร์ลิงก์',
    'pairing.autoOpen': 'เมื่ออีกฝ่ายยืนยัน หน้านี้จะเข้าสู่ทริปโดยอัตโนมัติ',
    'pairing.confirmEyebrow': 'ตรวจสอบว่าเป็นทริปที่ถูกต้อง',
    'pairing.confirm': 'ยืนยันและเข้าร่วม',
    'pairing.notMine': 'นี่ไม่ใช่ทริปของฉัน',
    'pairing.driverPlate': 'รถทะเบียน: {label}',
    'pairing.customerTrip': 'ชื่อทริปของผู้โดยสาร: {label}',
    'pairing.paired': 'จับคู่สำเร็จ',
    'pairing.linkCopied': 'คัดลอกลิงก์แล้ว',
    'scan.title': 'สแกน QR Code',
    'scan.help': 'วาง QR Code ไว้ในกรอบ หากใช้กล้องไม่ได้ ให้วางลิงก์เชิญ',
    'scan.manualLabel': 'ลิงก์เชิญหรือรหัส',
    'scan.open': 'เปิด',
    'scan.cameraUnavailable': 'เปิดกล้องไม่ได้ กรุณาวางลิงก์เชิญ',
    'trip.customerRole': '旅客旅程',
    'trip.driverRole': 'คนขับ・ทริปปัจจุบัน',
    'trip.copyInvite': 'คัดลอกลิงก์ทริป',
    'trip.end': 'จบทริป',
    'trip.endConfirm': 'ต้องการจบทริปนี้ใช่ไหม ทั้งสองฝ่ายจะใช้งานต่อไม่ได้',
    'trip.ended': 'จบทริปแล้ว',
    'chat.title': 'แชต',
    'chat.subtitle': 'พิมพ์คุยกันได้ตามปกติ',
    'chat.inputLabel': 'พิมพ์ข้อความ',
    'chat.placeholder': 'พิมพ์ข้อความ…',
    'chat.empty': 'เริ่มด้วยข้อความสั้น ๆ',
    'chat.original': 'ข้อความต้นฉบับ',
    'chat.sent': 'ส่งแล้ว',
    'chat.translationUnavailable': 'ข้อความนี้แสดงเป็นภาษาต้นฉบับ',
    'voice.read': 'ฟังเสียงภาษาไทย',
    'voice.drivingMode': 'โหมดขับรถ',
    'appointment.title': 'เวลานัดหมาย',
    'appointment.none': 'ยังไม่มีนัดหมาย',
    'appointment.new': 'สร้างนัดหมาย',
    'appointment.place': 'สถานที่',
    'appointment.date': 'วันที่',
    'appointment.time': 'เวลา',
    'appointment.note': 'หมายเหตุ (ไม่บังคับ)',
    'appointment.send': 'ส่งเพื่อรอยืนยัน',
    'appointment.pending': 'รอยืนยัน',
    'appointment.confirmed': 'ยืนยันแล้ว',
    'appointment.confirm': 'ยืนยันนัดหมาย',
    'appointment.waitOther': 'รออีกฝ่ายยืนยัน',
    'appointment.created': 'ส่งนัดหมายแล้ว',
    'map.title': 'ตำแหน่งเรียลไทม์',
    'map.closed': 'ยังไม่แชร์',
    'map.shareState': 'สถานะการแชร์ตำแหน่ง',
    'map.requestHelp': 'ทั้งสองฝ่ายขอแชร์ตำแหน่งได้',
    'map.request': 'ขอแชร์ตำแหน่ง',
    'map.requestedByMe': 'รออีกฝ่ายยอมรับ',
    'map.requestedByOther': 'อีกฝ่ายต้องการแชร์ตำแหน่ง',
    'map.accept': 'ยอมรับและแชร์ 20 นาที',
    'map.active': 'กำลังแชร์ตำแหน่ง',
    'map.activeSummary': 'กำลังแชร์・เหลือ {minutes} นาที',
    'map.route': 'นำทางไปหาอีกฝ่าย',
    'map.met': 'พบกันแล้ว',
    'map.stop': 'หยุดแชร์',
    'map.privacy': 'เก็บเฉพาะตำแหน่งล่าสุด และลบทันทีเมื่อหยุดแชร์',
    'map.permissionDenied': 'กรุณาอนุญาตให้เบราว์เซอร์ใช้ตำแหน่ง',
    'map.waitingLocation': 'กำลังหาตำแหน่ง…',
    'map.requestSent': 'ส่งคำขอแชร์ตำแหน่งแล้ว',
    'map.shareAccepted': 'เริ่มแชร์ตำแหน่ง 20 นาทีแล้ว',
    'map.shareStopped': 'หยุดแชร์ตำแหน่งแล้ว',
    'map.expired': 'การแชร์หมดเวลา หากต้องการต่อ กรุณาส่งคำขอใหม่'
  }
});

export const INTENTS = Object.freeze({
  on_my_way: { 'zh-TW': '我正在路上', th: 'กำลังเดินทางไป' },
  arrived: { 'zh-TW': '我到了', th: 'มาถึงแล้ว' },
  where_are_you: { 'zh-TW': '你在哪裡？', th: 'ตอนนี้อยู่ที่ไหน' },
  please_wait: { 'zh-TW': '請稍等一下', th: 'กรุณารอสักครู่' },
  traffic: { 'zh-TW': '路上塞車，會晚一點', th: 'รถติด จะถึงช้ากว่าเล็กน้อย' },
  thank_you: { 'zh-TW': '謝謝你', th: 'ขอบคุณครับ' },
  need_help: { 'zh-TW': '我需要幫忙', th: 'ฉันต้องการความช่วยเหลือ' },
  call_me: { 'zh-TW': '請到這裡找我', th: 'กรุณามาหาฉันที่นี่' }
});

let activeLocale = 'zh-TW';

export function localeForRole(role) {
  return role === 'driver' ? 'th' : 'zh-TW';
}

export function setLocale(locale) {
  activeLocale = TOUR_CONFIG.exposedLocales.includes(locale) ? locale : 'zh-TW';
  document.documentElement.lang = activeLocale === 'zh-TW' ? 'zh-Hant' : activeLocale;
  document.querySelectorAll('[data-i18n]').forEach((element) => {
    element.textContent = t(element.dataset.i18n);
  });
  document.querySelectorAll('[data-i18n-placeholder]').forEach((element) => {
    element.placeholder = t(element.dataset.i18nPlaceholder);
  });
  document.title = t('app.name');
}

export function getLocale() {
  return activeLocale;
}

export function t(key, values = {}) {
  const template = UI[activeLocale]?.[key] ?? UI['zh-TW'][key] ?? key;
  return Object.entries(values).reduce(
    (text, [name, value]) => text.replaceAll(`{${name}}`, String(value)),
    template
  );
}

export function detectIntent(text, sourceLocale = activeLocale) {
  const normalized = String(text).trim().replace(/[。.!！?？]+$/u, '').toLocaleLowerCase();
  for (const [key, translations] of Object.entries(INTENTS)) {
    const candidate = translations[sourceLocale];
    if (candidate && normalized === candidate.replace(/[。.!！?？]+$/u, '').toLocaleLowerCase()) return key;
  }
  return null;
}

export function translateIntent(intentKey, targetLocale) {
  return INTENTS[intentKey]?.[targetLocale] ?? null;
}

export function roleCopy(creatorRole, label) {
  return creatorRole === 'driver'
    ? t('pairing.driverPlate', { label })
    : t('pairing.customerTrip', { label });
}

export function formatDateTime(date, time) {
  if (!date || !time) return '';
  try {
    return new Intl.DateTimeFormat(activeLocale, {
      dateStyle: 'medium',
      timeStyle: 'short'
    }).format(new Date(`${date}T${time}`));
  } catch {
    return `${date} ${time}`;
  }
}
