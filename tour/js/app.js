import { TOUR_CONFIG } from './config.js';
import {
  INTENTS,
  detectIntent,
  formatDateTime,
  getLocale,
  localeForRole,
  roleCopy,
  setLocale,
  t,
  translateIntent
} from './i18n.js';
import {
  TourApi,
  TourApiError,
  clearSession,
  extractJoinToken,
  inviteUrl,
  loadSession,
  saveSession
} from './api.js';

const views = [...document.querySelectorAll('.view')];
const connectionStatus = document.querySelector('#connectionStatus');
const toast = document.querySelector('#toast');

let session = loadSession();
let selectedRole = null;
let pendingJoin = null;
let currentState = null;
let pollTimer = null;
let qrScanner = null;
let lastSeenMessageId = null;
let initialMessagesRendered = false;

function showView(id) {
  views.forEach((view) => view.classList.toggle('hidden', view.id !== id));
  window.scrollTo({ top: 0, behavior: 'instant' });
}

function setConnection(kind, key) {
  connectionStatus.className = `status-pill ${kind}`;
  connectionStatus.lastElementChild.textContent = t(key);
}

function notify(message) {
  toast.textContent = message;
  toast.hidden = false;
  window.clearTimeout(notify.timer);
  notify.timer = window.setTimeout(() => { toast.hidden = true; }, 2800);
}

function setBusy(button, busy) {
  if (!button) return;
  button.disabled = busy;
  button.setAttribute('aria-busy', String(busy));
}

function humanError(error) {
  const code = error instanceof TourApiError ? error.code : '';
  if (['TOUR_SESSION_EXPIRED', 'TOUR_JOIN_EXPIRED'].includes(code)) return t('common.expired');
  if (code === 'TOUR_SESSION_ENDED') return t('trip.ended');
  if (code === 'TOUR_ALREADY_PAIRED') return t('pairing.paired');
  return t('common.error');
}

function stopPolling() {
  window.clearTimeout(pollTimer);
  pollTimer = null;
}

async function pollState({ touch = false, quiet = false } = {}) {
  if (!session) return null;
  try {
    const state = await TourApi.getState(session.sessionId, session.accessToken, touch);
    currentState = state;
    setConnection('online', 'status.online');
    if (state.session.status === 'paired') {
      if (session.joinToken) session = saveSession({ ...session, joinToken: null });
      renderTrip(state);
    }
    if (state.session.status === 'ended') handleEndedSession();
    return state;
  } catch (error) {
    setConnection('offline', 'status.offline');
    if (['TOUR_SESSION_EXPIRED', 'TOUR_SESSION_ENDED', 'TOUR_ACCESS_DENIED'].includes(error.code)) {
      clearSession();
      session = null;
      stopPolling();
      showView('startView');
      notify(humanError(error));
    } else if (!quiet) {
      notify(humanError(error));
    }
    return null;
  } finally {
    if (session) {
      stopPolling();
      pollTimer = window.setTimeout(() => pollState({ quiet: true }), TOUR_CONFIG.pollIntervalMs);
    }
  }
}

function formatMessageText(message) {
  if (message.senderRole === session.role) return { text: message.body, original: null };
  const translated = message.intentKey ? translateIntent(message.intentKey, getLocale()) : null;
  return translated
    ? { text: translated, original: message.body }
    : { text: message.body, original: null, untranslated: true };
}

function createMessageElement(message) {
  const mine = message.senderRole === session.role;
  const localized = formatMessageText(message);
  const row = document.createElement('article');
  row.className = `message${mine ? ' mine' : ''}`;
  row.dataset.messageId = String(message.id);

  const bubble = document.createElement('div');
  bubble.className = 'bubble';
  bubble.textContent = localized.text;
  row.append(bubble);

  if (localized.original && localized.original !== localized.text) {
    const original = document.createElement('div');
    original.className = 'message-translation';
    original.textContent = `${t('chat.original')}: ${localized.original}`;
    bubble.append(original);
  } else if (localized.untranslated && !mine) {
    const note = document.createElement('div');
    note.className = 'message-translation';
    note.textContent = t('chat.translationUnavailable');
    bubble.append(note);
  }

  if (session.role === 'driver' && !mine) {
    const thaiText = message.intentKey ? translateIntent(message.intentKey, 'th') : null;
    if (thaiText) {
      const speak = document.createElement('button');
      speak.type = 'button';
      speak.className = 'speak-button';
      speak.textContent = `🔊 ${t('voice.read')}`;
      speak.addEventListener('click', () => speakThai(thaiText));
      row.append(speak);
    }
  }

  const meta = document.createElement('div');
  meta.className = 'message-meta';
  meta.textContent = new Intl.DateTimeFormat(getLocale(), { hour: '2-digit', minute: '2-digit' })
    .format(new Date(message.createdAt));
  row.append(meta);
  return row;
}

function speakThai(text) {
  if (!('speechSynthesis' in window)) return;
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = 'th-TH';
  utterance.rate = .92;
  window.speechSynthesis.speak(utterance);
}

function renderMessages(messages) {
  const list = document.querySelector('#messageList');
  const priorLastId = lastSeenMessageId;
  list.replaceChildren();
  if (!messages.length) {
    const empty = document.createElement('p');
    empty.className = 'empty-chat';
    empty.textContent = t('chat.empty');
    list.append(empty);
  } else {
    messages.forEach((message) => list.append(createMessageElement(message)));
    list.scrollTop = list.scrollHeight;
    lastSeenMessageId = messages.at(-1).id;
  }

  if (
    initialMessagesRendered &&
    session.role === 'driver' &&
    document.querySelector('#drivingMode').checked &&
    priorLastId !== null
  ) {
    messages
      .filter((message) => Number(message.id) > Number(priorLastId) && message.senderRole === 'customer')
      .forEach((message) => {
        const thaiText = message.intentKey ? translateIntent(message.intentKey, 'th') : null;
        if (thaiText) speakThai(thaiText);
      });
  }
  initialMessagesRendered = true;
}

function renderIntentChips() {
  const row = document.querySelector('#intentRow');
  row.replaceChildren();
  Object.entries(INTENTS).slice(0, 6).forEach(([key, translations]) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'intent-chip';
    button.textContent = translations[getLocale()];
    button.addEventListener('click', () => {
      const input = document.querySelector('#chatInput');
      input.value = translations[getLocale()];
      input.dataset.intentKey = key;
      input.focus();
    });
    row.append(button);
  });
}

function latestAppointment(state) {
  return state.appointments?.[0] || null;
}

function renderAppointment(state) {
  const appointment = latestAppointment(state);
  const summary = document.querySelector('#appointmentSummaryText');
  if (!appointment) {
    summary.textContent = t('appointment.none');
    return;
  }
  const status = appointment.status === 'confirmed' ? t('appointment.confirmed') : t('appointment.pending');
  summary.textContent = `${formatDateTime(appointment.date, appointment.time)} · ${appointment.place} · ${status}`;
}

function renderLocation(state) {
  const summary = document.querySelector('#locationSummaryText');
  const share = state.locationShare;
  if (!share || share.status === 'ended') {
    summary.textContent = t('map.closed');
  } else if (share.status === 'requested') {
    summary.textContent = share.requesterRole === session.role ? t('map.requestedByMe') : t('map.requestedByOther');
  } else if (share.status === 'active') {
    const minutes = Math.max(0, Math.ceil((new Date(share.expiresAt).getTime() - Date.now()) / 60000));
    summary.textContent = t('map.activeSummary', { minutes });
  }
}

function renderTrip(state) {
  if (document.querySelector('#tripView').classList.contains('hidden')) showView('tripView');
  const label = state.session.tripDisplayName || state.session.vehiclePlate;
  document.querySelector('#activeTripLabel').textContent = label;
  document.querySelector('#tripRoleEyebrow').textContent = session.role === 'driver' ? t('trip.driverRole') : t('trip.customerRole');
  document.querySelector('#drivingModeWrap').classList.toggle('hidden', session.role !== 'driver');
  document.querySelector('#copyInviteButton').classList.toggle('hidden', !session.joinToken);
  renderMessages(state.messages || []);
  renderIntentChips();
  renderAppointment(state);
  renderLocation(state);
}

function renderAppointmentDetail(appointment) {
  const detail = document.querySelector('#pendingAppointmentDetail');
  detail.replaceChildren();
  const place = document.createElement('strong');
  place.textContent = appointment.place;
  const when = document.createElement('div');
  when.textContent = formatDateTime(appointment.date, appointment.time);
  detail.append(place, when);
  if (appointment.note) {
    const note = document.createElement('div');
    note.textContent = appointment.note;
    detail.append(note);
  }
  const confirmButton = document.querySelector('#confirmAppointmentButton');
  confirmButton.classList.toggle('hidden', appointment.creatorRole === session.role || appointment.status !== 'pending');
  confirmButton.dataset.appointmentId = appointment.id;
}

function showAppointmentDialog() {
  const appointment = latestAppointment(currentState || {});
  if (appointment?.status === 'pending') {
    renderAppointmentDetail(appointment);
    document.querySelector('#pendingAppointmentDialog').showModal();
  } else {
    const date = new Date();
    document.querySelector('#appointmentDate').min = date.toISOString().slice(0, 10);
    document.querySelector('#appointmentDialog').showModal();
  }
}

function handleEndedSession() {
  clearSession();
  session = null;
  stopPolling();
  setConnection('warning', 'status.ended');
  showView('startView');
  notify(t('trip.ended'));
}

async function createTrip(event) {
  event.preventDefault();
  const button = document.querySelector('#createButton');
  const label = document.querySelector('#tripLabel').value.trim();
  if (!label || !selectedRole) return;
  setBusy(button, true);
  try {
    const created = await TourApi.createSession(selectedRole, label);
    session = saveSession({
      sessionId: created.sessionId,
      accessToken: created.accessToken,
      role: selectedRole,
      joinToken: created.joinToken
    });
    setLocale(localeForRole(selectedRole));
    document.querySelector('#qrSessionLabel').textContent = label;
    await renderQr(inviteUrl(created.joinToken));
    showView('qrView');
    await pollState({ touch: true, quiet: true });
  } catch (error) {
    notify(humanError(error));
  } finally {
    setBusy(button, false);
  }
}

async function renderQr(value) {
  const module = await import('https://cdn.jsdelivr.net/npm/qrcode@1.5.4/+esm');
  const QRCode = module.default || module;
  await QRCode.toCanvas(document.querySelector('#qrCanvas'), value, {
    width: 260,
    margin: 1,
    color: { dark: '#15312f', light: '#ffffff' },
    errorCorrectionLevel: 'M'
  });
}

async function startScanner() {
  showView('scanView');
  try {
    const module = await import('https://cdn.jsdelivr.net/npm/qr-scanner@1.4.2/qr-scanner.min.js');
    const QrScanner = module.default;
    qrScanner?.destroy();
    qrScanner = new QrScanner(
      document.querySelector('#scannerVideo'),
      (result) => openJoinValue(result.data),
      { preferredCamera: 'environment', highlightScanRegion: false, returnDetailedScanResult: true }
    );
    await qrScanner.start();
  } catch {
    document.querySelector('#scannerHelp').textContent = t('scan.cameraUnavailable');
  }
}

async function openJoinValue(value) {
  const joinToken = extractJoinToken(value);
  if (!joinToken) {
    notify(t('common.error'));
    return;
  }
  qrScanner?.stop();
  try {
    setConnection('warning', 'status.connecting');
    const preview = await TourApi.previewSession(joinToken);
    pendingJoin = { joinToken, preview };
    selectedRole = preview.creatorRole === 'driver' ? 'customer' : 'driver';
    setLocale(localeForRole(selectedRole));
    document.querySelector('#confirmLabel').textContent = preview.vehiclePlate || preview.tripDisplayName;
    document.querySelector('#confirmRoleCopy').textContent = roleCopy(
      preview.creatorRole,
      preview.vehiclePlate || preview.tripDisplayName
    );
    setConnection('online', 'status.online');
    showView('confirmView');
  } catch (error) {
    setConnection('offline', 'status.offline');
    notify(humanError(error));
  }
}

async function confirmPairing() {
  if (!pendingJoin) return;
  const button = document.querySelector('#confirmPairButton');
  setBusy(button, true);
  try {
    const confirmed = await TourApi.confirmSession(pendingJoin.joinToken, selectedRole);
    session = saveSession({
      sessionId: confirmed.sessionId,
      accessToken: confirmed.accessToken,
      role: selectedRole,
      joinToken: null
    });
    history.replaceState({}, '', new URL('./', window.location.href).pathname);
    pendingJoin = null;
    notify(t('pairing.paired'));
    await pollState({ touch: true });
  } catch (error) {
    notify(humanError(error));
  } finally {
    setBusy(button, false);
  }
}

async function sendMessage(event) {
  event.preventDefault();
  const input = document.querySelector('#chatInput');
  const body = input.value.trim();
  if (!body || !session) return;
  const intentKey = input.dataset.intentKey || detectIntent(body, getLocale());
  input.value = '';
  delete input.dataset.intentKey;
  try {
    await TourApi.sendMessage(session.sessionId, session.accessToken, body, intentKey);
    await pollState({ quiet: true });
  } catch (error) {
    input.value = body;
    notify(humanError(error));
  }
}

async function saveAppointment(event) {
  event.preventDefault();
  const button = document.querySelector('#saveAppointmentButton');
  setBusy(button, true);
  try {
    await TourApi.createAppointment(session.sessionId, session.accessToken, {
      place: document.querySelector('#appointmentPlace').value.trim(),
      date: document.querySelector('#appointmentDate').value,
      time: document.querySelector('#appointmentTime').value,
      note: document.querySelector('#appointmentNote').value.trim()
    });
    document.querySelector('#appointmentDialog').close();
    document.querySelector('#appointmentForm').reset();
    notify(t('appointment.created'));
    await pollState({ quiet: true });
  } catch (error) {
    notify(humanError(error));
  } finally {
    setBusy(button, false);
  }
}

async function confirmAppointment() {
  const button = document.querySelector('#confirmAppointmentButton');
  setBusy(button, true);
  try {
    await TourApi.confirmAppointment(session.sessionId, session.accessToken, button.dataset.appointmentId);
    document.querySelector('#pendingAppointmentDialog').close();
    await pollState({ quiet: true });
  } catch (error) {
    notify(humanError(error));
  } finally {
    setBusy(button, false);
  }
}

async function endSession() {
  if (!window.confirm(t('trip.endConfirm'))) return;
  const button = document.querySelector('#endSessionButton');
  setBusy(button, true);
  try {
    await TourApi.endSession(session.sessionId, session.accessToken);
    handleEndedSession();
  } catch (error) {
    notify(humanError(error));
  } finally {
    setBusy(button, false);
  }
}

async function shareInvite() {
  if (!session?.joinToken) return;
  const url = inviteUrl(session.joinToken);
  if (navigator.share) {
    await navigator.share({ title: t('app.name'), url }).catch(() => {});
  } else {
    await navigator.clipboard.writeText(url);
    notify(t('pairing.linkCopied'));
  }
}

function selectRole(role) {
  selectedRole = role;
  setLocale(localeForRole(role));
  document.querySelector('#createEyebrow').textContent = t(`create.${role}Eyebrow`);
  document.querySelector('#createTitle').textContent = t(`create.${role}Title`);
  document.querySelector('#tripLabelText').textContent = t(`create.${role}Label`);
  document.querySelector('#tripLabelHint').textContent = t(`create.${role}Hint`);
  document.querySelector('#createButton').textContent = t(`create.${role}Button`);
  document.querySelector('#tripLabel').maxLength = role === 'driver' ? 24 : 80;
  document.querySelector('#tripLabel').value = '';
  showView('createView');
  document.querySelector('#tripLabel').focus();
}

function wireEvents() {
  document.querySelectorAll('[data-role-choice]').forEach((button) => {
    button.addEventListener('click', () => selectRole(button.dataset.roleChoice));
  });
  document.querySelectorAll('[data-action="back"]').forEach((button) => {
    button.addEventListener('click', () => {
      qrScanner?.stop();
      setLocale('zh-TW');
      showView('startView');
    });
  });
  document.querySelector('#createForm').addEventListener('submit', createTrip);
  document.querySelector('#openScannerButton').addEventListener('click', startScanner);
  document.querySelector('#manualJoinForm').addEventListener('submit', (event) => {
    event.preventDefault();
    openJoinValue(document.querySelector('#manualJoinInput').value);
  });
  document.querySelector('#confirmPairButton').addEventListener('click', confirmPairing);
  document.querySelector('#rejectPairButton').addEventListener('click', () => {
    pendingJoin = null;
    history.replaceState({}, '', new URL('./', window.location.href).pathname);
    setLocale('zh-TW');
    showView('startView');
  });
  document.querySelector('#shareLinkButton').addEventListener('click', shareInvite);
  document.querySelector('#copyInviteButton').addEventListener('click', shareInvite);
  document.querySelector('#chatForm').addEventListener('submit', sendMessage);
  document.querySelector('#chatInput').addEventListener('input', (event) => {
    delete event.currentTarget.dataset.intentKey;
    event.currentTarget.style.height = 'auto';
    event.currentTarget.style.height = `${Math.min(event.currentTarget.scrollHeight, 130)}px`;
  });
  document.querySelector('#appointmentSummary').addEventListener('click', showAppointmentDialog);
  document.querySelector('#appointmentForm').addEventListener('submit', saveAppointment);
  document.querySelector('#confirmAppointmentButton').addEventListener('click', confirmAppointment);
  document.querySelectorAll('[data-close-dialog]').forEach((button) => {
    button.addEventListener('click', () => document.querySelector(`#${button.dataset.closeDialog}`).close());
  });
  document.querySelector('#tripMenuButton').addEventListener('click', () => {
    const menu = document.querySelector('#tripMenu');
    menu.hidden = !menu.hidden;
  });
  document.querySelector('#endSessionButton').addEventListener('click', endSession);
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible' && session) pollState({ touch: true, quiet: true });
  });
}

async function initialize() {
  wireEvents();
  setLocale(session ? localeForRole(session.role) : 'zh-TW');
  const joinToken = new URL(window.location.href).searchParams.get('join');

  if (session) {
    setConnection('warning', 'status.connecting');
    const state = await pollState({ touch: true });
    if (state?.session.status === 'pending' && session.joinToken) {
      document.querySelector('#qrSessionLabel').textContent = state.session.tripDisplayName || state.session.vehiclePlate;
      await renderQr(inviteUrl(session.joinToken));
      showView('qrView');
    }
    return;
  }

  if (joinToken) {
    await openJoinValue(joinToken);
    return;
  }

  showView('startView');
  setConnection('online', 'status.ready');
}

initialize();
