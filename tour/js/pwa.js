let installPromptEvent = null;
let serviceWorkerRegistrationStarted = false;

function isStandalone() {
  return window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
}

function isAppleMobile() {
  return /iphone|ipad|ipod/i.test(window.navigator.userAgent);
}

export function registerTourServiceWorker() {
  if (serviceWorkerRegistrationStarted || !('serviceWorker' in navigator)) return;
  serviceWorkerRegistrationStarted = true;
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js', { scope: './' }).catch(() => {});
  }, { once: true });
}

export function initInstallExperience({ button, notify, t }) {
  if (!button || isStandalone()) return;

  const showButton = () => button.classList.remove('hidden');
  const hideButton = () => button.classList.add('hidden');

  if (isAppleMobile()) showButton();

  window.addEventListener('beforeinstallprompt', (event) => {
    event.preventDefault();
    installPromptEvent = event;
    showButton();
  });

  window.addEventListener('appinstalled', () => {
    installPromptEvent = null;
    hideButton();
    notify(t('pwa.installed'));
  });

  button.addEventListener('click', async () => {
    if (isAppleMobile()) {
      notify(t('pwa.iosHelp'));
      return;
    }

    if (!installPromptEvent) {
      notify(t('pwa.browserHelp'));
      return;
    }

    await installPromptEvent.prompt();
    const choice = await installPromptEvent.userChoice;
    installPromptEvent = null;
    if (choice.outcome === 'accepted') hideButton();
  });
}
