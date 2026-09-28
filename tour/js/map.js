import { TOUR_CONFIG } from './config.js?v=10';
import { TOUR_RUNTIME_CONFIG } from './runtime-config.js?v=10';
import { localeForRole, setLocale, t } from './i18n.js?v=10';
import { TourApi, clearSession, loadSession } from './api.js?v=10';
import { registerTourServiceWorker } from './pwa.js?v=10';

registerTourServiceWorker();

const session = loadSession();
if (!session) window.location.replace('./');

setLocale(localeForRole(session?.role, session?.locale));

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
const recenterButton = document.querySelector('#recenterMapButton');
const customerName = document.querySelector('#mapCustomerName');
const vehiclePlate = document.querySelector('#mapVehiclePlate');

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
let map = null;
let mapProvider = 'leaflet';

const DEFAULT_CENTER = { latitude: 13.7563, longitude: 100.5018 };

function loadGoogleMaps(apiKey) {
  if (window.google?.maps?.importLibrary) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const callbackName = '__tourGoogleMapsReady';
    window[callbackName] = () => {
      delete window[callbackName];
      resolve();
    };
    const script = document.createElement('script');
    script.async = true;
    script.defer = true;
    script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(apiKey)}&v=weekly&loading=async&libraries=marker&callback=${callbackName}`;
    script.onerror = () => {
      delete window[callbackName];
      reject(new Error('GOOGLE_MAPS_LOAD_FAILED'));
    };
    document.head.append(script);
  });
}

function initializeLeafletMap() {
  if (!window.L) throw new Error('LEAFLET_UNAVAILABLE');
  mapProvider = 'leaflet';
  map = window.L.map('map', { zoomControl: false }).setView([DEFAULT_CENTER.latitude, DEFAULT_CENTER.longitude], 12);
  window.L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; OpenStreetMap contributors',
    maxZoom: 19
  }).addTo(map);
}

async function initializeMap() {
  const apiKey = TOUR_RUNTIME_CONFIG.googleMapsApiKey?.trim();
  if (apiKey) {
    try {
      await loadGoogleMaps(apiKey);
      const { Map } = await window.google.maps.importLibrary('maps');
      await window.google.maps.importLibrary('marker');
      mapProvider = 'google';
      map = new Map(document.querySelector('#map'), {
        center: { lat: DEFAULT_CENTER.latitude, lng: DEFAULT_CENTER.longitude },
        zoom: 12,
        mapId: TOUR_RUNTIME_CONFIG.googleMapsMapId || 'DEMO_MAP_ID',
        disableDefaultUI: true,
        gestureHandling: 'greedy'
      });
    } catch (error) {
      console.warn('Google Maps unavailable; using OpenStreetMap fallback.', error);
      initializeLeafletMap();
    }
  } else {
    initializeLeafletMap();
  }
  document.documentElement.dataset.mapProvider = mapProvider;
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

function setVisible(element, visible) {
  element.classList.toggle('hidden', !visible);
}

function markerElement(kind) {
  const marker = document.createElement('div');
  marker.className = `tour-marker ${kind}`;
  return marker;
}

function markerForPosition(existing, position, kind, label) {
  if (mapProvider === 'google') {
    const nextPosition = { lat: position.latitude, lng: position.longitude };
    if (existing) {
      existing.position = nextPosition;
      existing.title = label;
      return existing;
    }
    return new window.google.maps.marker.AdvancedMarkerElement({
      map,
      position: nextPosition,
      content: markerElement(kind),
      title: label
    });
  }

  const latLng = [position.latitude, position.longitude];
  if (existing) {
    existing.setLatLng(latLng);
    return existing;
  }
  const icon = window.L.divIcon({
    className: '',
    html: `<div class="tour-marker ${kind}"></div>`,
    iconSize: [28, 28],
    iconAnchor: [14, 14]
  });
  return window.L.marker(latLng, { icon }).addTo(map).bindTooltip(label, { direction: 'top' });
}

function removeMarker(marker) {
  if (!marker) return;
  if (mapProvider === 'google') marker.map = null;
  else map.removeLayer(marker);
}

function centerMap(position, zoom = 15) {
  if (!position || !map) return;
  if (mapProvider === 'google') {
    map.setCenter({ lat: position.latitude, lng: position.longitude });
    map.setZoom(zoom);
  } else {
    map.setView([position.latitude, position.longitude], zoom);
  }
}

function fitParticipantPositions(positions) {
  if (mapProvider === 'google') {
    const bounds = new window.google.maps.LatLngBounds();
    positions.forEach((position) => bounds.extend({ lat: position.latitude, lng: position.longitude }));
    map.fitBounds(bounds, { top: 120, right: 48, bottom: 300, left: 48 });
    window.google.maps.event.addListenerOnce(map, 'idle', () => {
      if (map.getZoom() > 16) map.setZoom(16);
    });
  } else {
    map.fitBounds(
      positions.map((position) => [position.latitude, position.longitude]),
      { padding: [48, 48], maxZoom: 16 }
    );
  }
}

function updateMarkers(nextState) {
  if (selfPosition) selfMarker = markerForPosition(selfMarker, selfPosition, 'self', t('map.selfMarker'));

  const other = nextState.locations?.find((location) => location.role !== session.role);
  if (nextState.locationShare?.status === 'active' && other) {
    otherMarker = markerForPosition(
      otherMarker,
      other,
      'other',
      session.role === 'driver' ? t('map.customerMarker') : t('map.driverMarker')
    );
    routeButton.href = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(other.latitude)},${encodeURIComponent(other.longitude)}`;
    setVisible(routeButton, true);
  } else {
    removeMarker(otherMarker);
    otherMarker = null;
    setVisible(routeButton, false);
  }

  if (!fittedOnce) {
    const positions = [selfPosition, nextState.locationShare?.status === 'active' ? other : null].filter(Boolean);
    if (positions.length === 2) {
      fitParticipantPositions(positions);
      fittedOnce = true;
    } else if (selfPosition) {
      centerMap(selfPosition, 15);
    }
  }
}

function renderShare(nextState) {
  customerName.textContent = nextState.session.tripDisplayName || '—';
  vehiclePlate.textContent = nextState.session.vehiclePlate || '—';
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
  selfMarker = markerForPosition(selfMarker, selfPosition, 'self', t('map.selfMarker'));
  if (!fittedOnce && !otherMarker) centerMap(selfPosition, 15);
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

function recenterMap() {
  if (selfPosition) {
    if (mapProvider === 'google') {
      map.panTo({ lat: selfPosition.latitude, lng: selfPosition.longitude });
      map.setZoom(Math.max(map.getZoom() || 0, 15));
    } else {
      map.flyTo([selfPosition.latitude, selfPosition.longitude], Math.max(map.getZoom(), 15), { duration: .45 });
    }
    return;
  }
  if (!navigator.geolocation) return;
  navigator.geolocation.getCurrentPosition((position) => {
    handlePosition(position);
    if (mapProvider === 'google') map.panTo({ lat: selfPosition.latitude, lng: selfPosition.longitude });
    else map.flyTo([selfPosition.latitude, selfPosition.longitude], 15, { duration: .45 });
  }, () => notify(t('map.permissionDenied')), {
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

recenterButton.addEventListener('click', recenterMap);

window.addEventListener('beforeunload', stopLocationWatch);
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible') poll({ quiet: true });
});

async function bootstrap() {
  await initializeMap();
  locateSelfWithoutSharing();
  poll({ quiet: false });
}

bootstrap().catch(() => notify(t('common.error')));
