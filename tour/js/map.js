import { TOUR_CONFIG } from './config.js';
import { localeForRole, setLocale, t } from './i18n.js';
import { TourApi, clearSession, loadSession } from './api.js';

const session = loadSession();
if (!session) window.location.replace('./');

setLocale(localeForRole(session?.role));

const connectionStatus = document.querySelector('#connectionStatus');
const stateTitle = document.querySelector('#shareStateTitle');
const stateDetail = document.querySelector('#shareStateDetail');
const timer = document.querySelector('#shareTimer');
const toast = document.querySelector('#toast');
const requestButton = document.querySelector('#requestLocationButton');
const acceptButton = document.querySelector('#acceptLocationButton');
const routeButton = document.querySelector('#routeButton');
const metButton = document.querySelector('#metButton');
const stopButton = document.querySelector('#stopLocationButton');

let state = null;
let pollTimer = null;
let countdownTimer = null;
let watchId = null;
let lastUploaded = null;
let selfPosition = null;
let selfMarker = null;
let otherMarker = null;
let fittedOnce = false;
let priorShareStatus = null;

const map = window.L.map('map', { zoomControl: false }).setView([13.7563, 100.5018], 12);
window.L.control.zoom({ position: 'topright' }).addTo(map);
window.L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  attribution: '&copy; OpenStreetMap contributors',
  maxZoom: 19
}).addTo(map);

const icons = {
  self: window.L.divIcon({ className: '', html: '<div class="tour-marker self"></div>', iconSize: [26, 26], iconAnchor: [13, 13] }),
  other: window.L.divIcon({ className: '', html: '<div class="tour-marker other"></div>', iconSize: [26, 26], iconAnchor: [13, 13] })
};

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

function setVisible(element, visible) {
  element.classList.toggle('hidden', !visible);
}

function markerForPosition(existing, position, icon, label) {
  const latLng = [position.latitude, position.longitude];
  if (existing) {
    existing.setLatLng(latLng);
    return existing;
  }
  return window.L.marker(latLng, { icon }).addTo(map).bindTooltip(label, { direction: 'top' });
}

function updateMarkers(nextState) {
  if (selfPosition) selfMarker = markerForPosition(selfMarker, selfPosition, icons.self, session.role === 'driver' ? 'ฉัน' : '我');

  const other = nextState.locations?.find((location) => location.role !== session.role);
  if (nextState.locationShare?.status === 'active' && other) {
    otherMarker = markerForPosition(otherMarker, other, icons.other, session.role === 'driver' ? 'ผู้โดยสาร' : '司機');
    routeButton.href = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(other.latitude)},${encodeURIComponent(other.longitude)}`;
    setVisible(routeButton, true);
  } else {
    if (otherMarker) map.removeLayer(otherMarker);
    otherMarker = null;
    setVisible(routeButton, false);
  }

  if (!fittedOnce) {
    const markers = [selfMarker, otherMarker].filter(Boolean);
    if (markers.length === 2) {
      map.fitBounds(window.L.featureGroup(markers).getBounds().pad(.35), { maxZoom: 16 });
      fittedOnce = true;
    } else if (selfMarker) {
      map.setView(selfMarker.getLatLng(), 15);
    }
  }
}

function renderShare(nextState) {
  const share = nextState.locationShare;
  const status = share?.status || 'none';
  setVisible(requestButton, status === 'none' || status === 'ended');
  setVisible(acceptButton, status === 'requested' && share.requesterRole !== session.role);
  setVisible(stopButton, status === 'requested' || status === 'active');
  setVisible(metButton, status === 'active');
  timer.hidden = status !== 'active';

  if (status === 'requested') {
    stateTitle.textContent = share.requesterRole === session.role ? t('map.requestedByMe') : t('map.requestedByOther');
    stateDetail.textContent = share.requesterRole === session.role ? t('map.requestHelp') : t('map.accept');
  } else if (status === 'active') {
    stateTitle.textContent = t('map.active');
    stateDetail.textContent = t('map.privacy');
  } else {
    stateTitle.textContent = t('map.closed');
    stateDetail.textContent = status === 'ended' && share?.endedReason === 'expired' ? t('map.expired') : t('map.requestHelp');
  }

  if (priorShareStatus === 'active' && status === 'ended' && share?.endedReason === 'expired') notify(t('map.expired'));
  priorShareStatus = status;
  updateCountdown();

  if (status === 'active') startLocationWatch();
  else stopLocationWatch();
}

function updateCountdown() {
  window.clearInterval(countdownTimer);
  const expiresAt = state?.locationShare?.expiresAt;
  if (!expiresAt || state.locationShare.status !== 'active') return;
  const tick = () => {
    const remaining = Math.max(0, new Date(expiresAt).getTime() - Date.now());
    const minutes = Math.floor(remaining / 60000);
    const seconds = Math.floor((remaining % 60000) / 1000);
    timer.textContent = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  };
  tick();
  countdownTimer = window.setInterval(tick, 1000);
}

function distanceMeters(a, b) {
  if (!a || !b) return Infinity;
  const toRad = (value) => value * Math.PI / 180;
  const earth = 6371000;
  const dLat = toRad(b.latitude - a.latitude);
  const dLon = toRad(b.longitude - a.longitude);
  const lat1 = toRad(a.latitude);
  const lat2 = toRad(b.latitude);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return 2 * earth * Math.asin(Math.sqrt(h));
}

async function uploadLocation(position) {
  if (state?.locationShare?.status !== 'active') return;
  const point = {
    latitude: position.coords.latitude,
    longitude: position.coords.longitude,
    accuracy: position.coords.accuracy,
    uploadedAt: Date.now()
  };
  const enoughTime = !lastUploaded || point.uploadedAt - lastUploaded.uploadedAt >= TOUR_CONFIG.locationUpdateMinMs;
  const enoughDistance = distanceMeters(lastUploaded, point) >= TOUR_CONFIG.locationUpdateMinMeters;
  if (!enoughTime && !enoughDistance) return;
  try {
    await TourApi.updateLocation(
      session.sessionId,
      session.accessToken,
      point.latitude,
      point.longitude,
      point.accuracy
    );
    lastUploaded = point;
  } catch {
    setConnection('offline', 'status.offline');
  }
}

function handlePosition(position) {
  selfPosition = {
    latitude: position.coords.latitude,
    longitude: position.coords.longitude,
    accuracy: position.coords.accuracy
  };
  selfMarker = markerForPosition(selfMarker, selfPosition, icons.self, session.role === 'driver' ? 'ฉัน' : '我');
  if (!fittedOnce && !otherMarker) map.setView(selfMarker.getLatLng(), 15);
  uploadLocation(position);
}

function startLocationWatch() {
  if (watchId !== null || !navigator.geolocation) return;
  watchId = navigator.geolocation.watchPosition(handlePosition, () => {
    notify(t('map.permissionDenied'));
  }, { enableHighAccuracy: true, maximumAge: 5000, timeout: 15000 });
}

function stopLocationWatch() {
  if (watchId !== null) navigator.geolocation.clearWatch(watchId);
  watchId = null;
  lastUploaded = null;
}

function locateSelfWithoutSharing() {
  if (!navigator.geolocation) return;
  navigator.geolocation.getCurrentPosition(handlePosition, () => {}, {
    enableHighAccuracy: true,
    maximumAge: 15000,
    timeout: 12000
  });
}

async function poll({ quiet = true } = {}) {
  try {
    state = await TourApi.getState(session.sessionId, session.accessToken, false);
    if (state.session.status === 'ended') {
      clearSession();
      window.location.replace('./');
      return;
    }
    setConnection('online', 'status.online');
    renderShare(state);
    updateMarkers(state);
  } catch (error) {
    setConnection('offline', 'status.offline');
    if (['TOUR_SESSION_EXPIRED', 'TOUR_SESSION_ENDED', 'TOUR_ACCESS_DENIED'].includes(error.code)) {
      clearSession();
      window.location.replace('./');
      return;
    }
    if (!quiet) notify(t('common.error'));
  } finally {
    window.clearTimeout(pollTimer);
    pollTimer = window.setTimeout(poll, TOUR_CONFIG.pollIntervalMs);
  }
}

async function mutate(button, operation, successKey) {
  button.disabled = true;
  try {
    await operation();
    if (successKey) notify(t(successKey));
    await poll({ quiet: true });
  } catch {
    notify(t('common.error'));
  } finally {
    button.disabled = false;
  }
}

requestButton.addEventListener('click', () => mutate(
  requestButton,
  () => TourApi.requestLocation(session.sessionId, session.accessToken),
  'map.requestSent'
));

acceptButton.addEventListener('click', () => mutate(
  acceptButton,
  () => TourApi.acceptLocation(session.sessionId, session.accessToken),
  'map.shareAccepted'
));

stopButton.addEventListener('click', () => mutate(
  stopButton,
  () => TourApi.stopLocation(session.sessionId, session.accessToken, 'stopped'),
  'map.shareStopped'
));

metButton.addEventListener('click', () => mutate(
  metButton,
  () => TourApi.stopLocation(session.sessionId, session.accessToken, 'met'),
  'map.shareStopped'
));

window.addEventListener('beforeunload', stopLocationWatch);
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible') poll({ quiet: true });
});

locateSelfWithoutSharing();
poll({ quiet: false });
