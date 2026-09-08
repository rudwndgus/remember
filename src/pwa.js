import { registerSW } from 'virtual:pwa-register';

const UPDATE_INTERVAL = 60 * 60 * 1000;

/** Register the offline app and offer updates without interrupting the cinematic. */
export function setupPWA() {
  let registration;
  let workerUrl;
  let deferredInstall;
  let updateReady = false;
  let introActive = false;
  let dismissed = false;
  let checking = false;
  let interval;
  let updateSW;
  const listeners = [];
  const installButton = document.getElementById('install-app');

  const notice = getNotice('update-notice', 'A new memory is ready. Reload to update?', [
    { label: 'Reload', action: async () => {
      if (introActive || !updateSW) return;
      const button = notice.querySelector('button');
      button.disabled = true;
      try {
        await updateSW(true);
      } catch (error) {
        button.disabled = false;
        notice.querySelector('p').textContent = 'The update could not load. Please try again.';
        console.warn('PWA update failed:', error);
      }
    } },
    { label: 'Later', action: () => { dismissed = true; notice.hidden = true; } },
  ]);
  const installHelp = getNotice('install-help', '', [
    { label: 'Close', action: () => { installHelp.hidden = true; } },
  ]);

  function listen(target, event, handler) {
    target.addEventListener(event, handler);
    listeners.push(() => target.removeEventListener(event, handler));
  }

  function syncUpdateNotice() {
    notice.hidden = !updateReady || introActive || dismissed;
  }

  function isStandalone() {
    return window.matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
  }

  // iPadOS may use a desktop user agent, so include its multitouch Mac signature.
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent)
    || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

  function syncInstallButton() {
    if (installButton) installButton.hidden = isStandalone() || (!deferredInstall && !isIOS);
  }

  if (installButton) {
    listen(installButton, 'pointerdown', (event) => event.stopPropagation());
    listen(installButton, 'keydown', (event) => event.stopPropagation());
    listen(installButton, 'click', async (event) => {
      event.stopPropagation();
      if (deferredInstall) {
        const prompt = deferredInstall;
        deferredInstall = undefined;
        syncInstallButton();
        try {
          await prompt.prompt();
          await prompt.userChoice;
        } catch (error) {
          console.warn('PWA install prompt was unavailable:', error);
        }
      } else if (isIOS) {
        installHelp.querySelector('p').textContent = 'In Safari, open Share, choose “Add to Home Screen”, then tap Add.';
        installHelp.hidden = false;
      }
    });
  }

  listen(window, 'beforeinstallprompt', (event) => {
    event.preventDefault();
    deferredInstall = event;
    syncInstallButton();
  });
  listen(window, 'appinstalled', () => {
    deferredInstall = undefined;
    installHelp.hidden = true;
    syncInstallButton();
  });
  syncInstallButton();

  async function checkForUpdates() {
    if (!registration || registration.installing || checking || !navigator.onLine) return;
    checking = true;
    try {
      // Avoid a cached sw.js hiding a new release in a long-lived installed app.
      const response = await fetch(workerUrl, { cache: 'no-store', headers: { 'cache-control': 'no-cache' } });
      if (response.ok) await registration.update();
    } catch {
      // A connection loss is expected; the precached game remains playable.
    } finally {
      checking = false;
    }
  }

  if (import.meta.env.PROD && 'serviceWorker' in navigator) {
    updateSW = registerSW({
      immediate: true,
      onNeedRefresh() {
        updateReady = true;
        dismissed = false;
        syncUpdateNotice();
      },
      onOfflineReady() {
        document.documentElement.dataset.offlineReady = 'true';
      },
      onRegisteredSW(url, swRegistration) {
        if (!swRegistration) return;
        registration = swRegistration;
        workerUrl = url;
        interval = window.setInterval(checkForUpdates, UPDATE_INTERVAL);
      },
      onRegisterError(error) {
        console.warn('Offline installation is currently unavailable:', error);
      },
    });
    listen(document, 'visibilitychange', () => {
      if (document.visibilityState === 'visible') void checkForUpdates();
    });
    listen(window, 'online', checkForUpdates);
  }

  return {
    setIntroActive(active) {
      introActive = Boolean(active);
      if (introActive) installHelp.hidden = true;
      syncUpdateNotice();
    },
    checkForUpdates,
    destroy() {
      window.clearInterval(interval);
      listeners.forEach((remove) => remove());
      notice.remove();
      installHelp.remove();
    },
  };
}

function getNotice(id, message, actions) {
  const notice = document.getElementById(id) || document.createElement('aside');
  notice.id = id;
  notice.classList.add('pwa-notice');
  notice.setAttribute('role', 'status');
  notice.setAttribute('aria-live', 'polite');
  notice.hidden = true;
  notice.replaceChildren();
  const text = document.createElement('p');
  text.textContent = message;
  notice.append(text);
  for (const { label, action } of actions) {
    const button = document.createElement('button');
    button.type = 'button';
    button.textContent = label;
    button.addEventListener('click', action);
    notice.append(button);
  }
  // Do not let an install/update button also trigger the title's tap-to-start.
  notice.addEventListener('pointerdown', (event) => event.stopPropagation());
  notice.addEventListener('keydown', (event) => event.stopPropagation());
  notice.addEventListener('click', (event) => event.stopPropagation());
  if (!notice.isConnected) document.body.append(notice);
  return notice;
}
