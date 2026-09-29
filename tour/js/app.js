import { TOUR_CONFIG } from './config.js?v=18';
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
} from './i18n.js?v=18';
import {
  TourApi,
  TourApiError,
  clearSession,
  extractJoinToken,
  inviteUrl,
  loadSession,
  saveSession
} from './api.js?v=18';
import { initInstallExperience, registerTourServiceWorker } from './pwa.js?v=18';
import { isPendingHistoryEntry, restoreStoredSessionView } from './session-flow.js?v=18';

const views = [...document.querySelectorAll('.view')];
const connectionStatus = document.querySelector('#connectionStatus');
const toast = document.querySelector('#toast');

let session = loadSession();
let preferredLocale = loadPreferredLocale();
let selectedRole = session?.role || null;
let selectedLocale = localeForRole(selectedRole, session?.locale || preferredLocale);
let pendingJoin = null;
let currentState = null;
let pollTimer = null;
let qrScanner = null;
let lastSeenMessageId = null;
let initialMessagesRendered = false;
let pendingBackGuard = false;
let suppressNextPopstate = false;

function loadPreferredLocale() {
  const locale = localStorage.getItem(TOUR_CONFIG.localeStorageKey);
  return TOUR_CONFIG.userLocales.includes(locale) ? locale : null;
}

function savePreferredLocale(locale) {
  if (!TOUR_CONFIG.userLocales.includes(locale)) return null;
  localStorage.setItem(TOUR_CONFIG.localeStorageKey, locale);
  preferredLocale = locale;
  return locale;
}

function clearLegacyRolePreference() {
  localStorage.removeItem(TOUR_CONFIG.roleStorageKey);
}

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
  if (['TOUR_JOIN_INVALID', 'TOUR_ALREADY_PAIRED'].includes(code)) return t('pairing.invalidInvite');
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
      disarmPendingBackGuard();
    }
    if (state.session.status === 'ended') handleEndedSession();
    return state;
  } catch (error) {
    setConnection('offline', 'status.offline');
    if (['TOUR_SESSION_EXPIRED', 'TOUR_SESSION_ENDED', 'TOUR_ACCESS_DENIED'].includes(error.code)) {
      clearSession();
      session = null;
      stopPolling();
      disarmPendingBackGuard();
      showRoleHome();
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
  document.querySelector('#tripCustomerName').textContent = state.session.tripDisplayName || '—';
  document.querySelector('#tripVehiclePlate').textContent = state.session.vehiclePlate || '—';
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
  disarmPendingBackGuard();
  setConnection('warning', 'status.ended');
  showRoleHome();
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
      locale: selectedLocale,
      joinToken: created.joinToken
    });
    setLocale(selectedLocale);
    await showPendingTrip(label, created.joinToken);
    await pollState({ touch: true, quiet: true });
  } catch (error) {
    notify(humanError(error));
  } finally {
    setBusy(button, false);
  }
}

async function showPendingTrip(label, joinToken) {
  const url = inviteUrl(joinToken);
  const frame = document.querySelector('#qrFrame');
  const fallback = document.querySelector('#qrUnavailableMessage');
  document.querySelector('#qrSessionLabel').textContent = label;
  document.querySelector('#inviteLinkValue').value = url;
  frame.hidden = false;
  fallback.hidden = true;
  showView('qrView');
  armPendingBackGuard();
  try {
    await renderQr(url);
  } catch {
    frame.hidden = true;
    fallback.hidden = false;
    notify(t('pairing.qrUnavailable'));
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
    notify(t('pairing.invalidInvite'));
    return false;
  }
  qrScanner?.stop();
  try {
    setConnection('warning', 'status.connecting');
    const preview = await TourApi.previewSession(joinToken);
    pendingJoin = { joinToken, preview };
    selectedRole = preview.creatorRole === 'driver' ? 'customer' : 'driver';
    setConnection('online', 'status.online');
    if (!preferredLocale) {
      showLanguagePicker({ preserveJoinRole: true });
      return true;
    }
    selectedLocale = localeForRole(selectedRole, preferredLocale);
    showPairingConfirmation();
    return true;
  } catch (error) {
    setConnection('offline', 'status.offline');
    notify(humanError(error));
    return false;
  }
}

function showPairingConfirmation() {
  if (!pendingJoin) return;
  const { preview } = pendingJoin;
  setLocale(selectedLocale);
  document.querySelector('#confirmLabel').textContent = preview.vehiclePlate || preview.tripDisplayName;
  document.querySelector('#confirmRoleCopy').textContent = roleCopy(
    preview.creatorRole,
    preview.vehiclePlate || preview.tripDisplayName
  );
  const ownLabel = document.querySelector('#confirmOwnLabel');
  ownLabel.value = '';
  ownLabel.maxLength = selectedRole === 'driver' ? 24 : 80;
  document.querySelector('#confirmOwnLabelText').textContent = t(`pairing.${selectedRole}OwnLabel`);
  document.querySelector('#confirmOwnLabelHint').textContent = t(`pairing.${selectedRole}OwnHint`);
  showView('confirmView');
}

function chooseLanguage(locale) {
  if (!TOUR_CONFIG.userLocales.includes(locale)) return;
  selectedLocale = locale;
  savePreferredLocale(locale);
  setLocale(locale);
  setConnection('online', 'status.ready');
  if (pendingJoin) {
    showPairingConfirmation();
    return;
  }
  selectedRole = null;
  showView('roleView');
}

async function confirmPairing(event) {
  event.preventDefault();
  if (!pendingJoin) return;
  const button = document.querySelector('#confirmPairButton');
  const label = document.querySelector('#confirmOwnLabel').value.trim();
  if (!label) return;
  setBusy(button, true);
  try {
    const confirmed = await TourApi.confirmSession(pendingJoin.joinToken, selectedRole, label);
    session = saveSession({
      sessionId: confirmed.sessionId,
      accessToken: confirmed.accessToken,
      role: selectedRole,
      locale: selectedLocale,
      joinToken: null
    });
    savePreferredLocale(selectedLocale);
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

async function copyInviteLink() {
  if (!session?.joinToken) return;
  try {
    await navigator.clipboard.writeText(inviteUrl(session.joinToken));
    notify(t('pairing.linkCopied'));
  } catch {
    const input = document.querySelector('#inviteLinkValue');
    input.focus();
    input.select();
    notify(t('pairing.copyManually'));
  }
}

async function cancelPendingJoin() {
  pendingJoin = null;
  qrScanner?.stop();
  history.replaceState({}, '', new URL('./', window.location.href).pathname);
  if (session) {
    savePreferredLocale(session.locale);
    setLocale(localeForRole(session.role, session.locale));
    const state = await pollState({ touch: true });
    await restoreStoredSessionView(state, session, showPendingTrip);
    return;
  }
  showRoleHome();
}

function armPendingBackGuard() {
  if (pendingBackGuard) return;
  if (isPendingHistoryEntry(history.state)) {
    pendingBackGuard = true;
    return;
  }
  history.replaceState({ tourView: 'before-pending' }, '', new URL('./', window.location.href).pathname);
  history.pushState({ tourView: 'pending' }, '', new URL('./', window.location.href).pathname);
  pendingBackGuard = true;
}

function disarmPendingBackGuard() {
  if (!pendingBackGuard) return;
  pendingBackGuard = false;
  if (history.state?.tourView === 'pending') {
    suppressNextPopstate = true;
    history.back();
  }
}

async function cancelCreatedPendingSession() {
  if (!session?.joinToken) return;
  const button = document.querySelector('#backFromQrButton');
  const draftLabel = document.querySelector('#qrSessionLabel').textContent;
  const role = session.role;
  const locale = session.locale;
  setBusy(button, true);
  stopPolling();
  try {
    await TourApi.cancelPendingSession(session.sessionId, session.accessToken);
    clearSession();
    session = null;
    currentState = null;
    selectedRole = role;
    selectedLocale = localeForRole(role, locale);
    setLocale(selectedLocale);
    selectRole(role, { locale: selectedLocale, focus: false, label: draftLabel });
    disarmPendingBackGuard();
  } catch (error) {
    if (error.code === 'TOUR_SESSION_ALREADY_PAIRED') {
      notify(t('pairing.paired'));
      await pollState({ touch: true });
      disarmPendingBackGuard();
    } else {
      notify(humanError(error));
      if (session) pollTimer = window.setTimeout(() => pollState({ quiet: true }), TOUR_CONFIG.pollIntervalMs);
    }
  } finally {
    setBusy(button, false);
  }
}

function selectRole(role, { locale = null, focus = true, label = '' } = {}) {
  if (!['customer', 'driver'].includes(role)) return;
  selectedRole = role;
  selectedLocale = localeForRole(role, locale || preferredLocale);
  savePreferredLocale(selectedLocale);
  setLocale(selectedLocale);
  document.querySelector('#createEyebrow').textContent = t(`create.${role}Eyebrow`);
  document.querySelector('#createTitle').textContent = t(`create.${role}Title`);
  document.querySelector('#tripLabelText').textContent = t(`create.${role}Label`);
  document.querySelector('#tripLabelHint').textContent = t(`create.${role}Hint`);
  document.querySelector('#createButton').textContent = t(`create.${role}Button`);
  document.querySelector('#tripLabel').maxLength = role === 'driver' ? 24 : 80;
  document.querySelector('#tripLabel').value = label;
  showView('createView');
  if (focus) document.querySelector('#tripLabel').focus();
}

function showRoleHome({ focus = false } = {}) {
  if (preferredLocale) {
    selectedRole = null;
    selectedLocale = preferredLocale;
    setLocale(selectedLocale);
    showView('roleView');
    return;
  }
  showLanguagePicker();
}

function showLanguagePicker({ preserveJoinRole = false } = {}) {
  if (!preserveJoinRole) selectedRole = null;
  selectedLocale = null;
  document.documentElement.lang = 'en';
  document.title = 'Tour';
  document.querySelector('#brandName').textContent = 'Tour';
  connectionStatus.className = 'status-pill';
  connectionStatus.lastElementChild.textContent = '🌐';
  showView('startView');
}

function backToRole() {
  selectedRole = null;
  setLocale(preferredLocale);
  showView('roleView');
}

function backToLanguage() {
  showLanguagePicker();
}

function wireEvents() {
  document.querySelectorAll('[data-locale-choice]').forEach((button) => {
    button.addEventListener('click', () => chooseLanguage(button.dataset.localeChoice));
  });
  document.querySelectorAll('[data-role-choice]').forEach((button) => {
    button.addEventListener('click', () => selectRole(button.dataset.roleChoice, { locale: selectedLocale }));
  });
  document.querySelectorAll('[data-action="back"]').forEach((button) => {
    button.addEventListener('click', () => {
      qrScanner?.stop();
      showRoleHome();
    });
  });
  document.querySelector('#backToLanguageButton').addEventListener('click', backToLanguage);
  document.querySelector('#backToRoleButton').addEventListener('click', backToRole);
  document.querySelector('#backFromQrButton').addEventListener('click', cancelCreatedPendingSession);
  document.querySelector('#createForm').addEventListener('submit', createTrip);
  document.querySelector('#openScannerButton').addEventListener('click', startScanner);
  document.querySelector('#manualJoinForm').addEventListener('submit', (event) => {
    event.preventDefault();
    openJoinValue(document.querySelector('#manualJoinInput').value);
  });
  document.querySelector('#confirmForm').addEventListener('submit', confirmPairing);
  document.querySelector('#backFromConfirmButton').addEventListener('click', cancelPendingJoin);
  document.querySelector('#shareLinkButton').addEventListener('click', shareInvite);
  document.querySelector('#copyInviteLinkButton').addEventListener('click', copyInviteLink);
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
  window.addEventListener('popstate', () => {
    if (suppressNextPopstate) {
      suppressNextPopstate = false;
      return;
    }
    if (pendingBackGuard && !document.querySelector('#qrView').classList.contains('hidden')) {
      history.pushState({ tourView: 'pending' }, '', new URL('./', window.location.href).pathname);
      cancelCreatedPendingSession();
    }
  });
}

async function initialize() {
  registerTourServiceWorker();
  clearLegacyRolePreference();
  wireEvents();
  if (session) savePreferredLocale(session.locale);
  if (session) setLocale(localeForRole(session.role, session.locale));
  else if (preferredLocale) setLocale(preferredLocale);
  initInstallExperience({
    button: document.querySelector('#installAppButton'),
    notify,
    t
  });
  const joinToken = extractJoinToken(window.location.href);

  // Scanning an invite is an explicit action. Handle it before restoring any
  // remembered or stale session, but keep that session until pairing confirms.
  if (joinToken) {
    const opened = await openJoinValue(joinToken);
    if (opened) return;
    history.replaceState({}, '', new URL('./', window.location.href).pathname);
  }

  if (session) {
    setConnection('warning', 'status.connecting');
    const state = await pollState({ touch: true });
    await restoreStoredSessionView(state, session, showPendingTrip);
    return;
  }

  showRoleHome();
  if (preferredLocale) setConnection('online', 'status.ready');
}

initialize();
