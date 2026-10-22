'use strict';
(function (global) {
  let localBuild = '';
  let started = false;

  const setLocalBuild = (b) => { localBuild = String(b || ''); };

  const versionUrl = () => `./version.json?t=${Date.now()}`;

  const requestServiceWorkerUpdate = () => {
    if (!('serviceWorker' in navigator)) return Promise.resolve(null);
    return navigator.serviceWorker.getRegistration().then((reg) => {
      if (!reg) return null;
      return Promise.resolve(reg.update()).catch(() => {}).then(() => reg);
    }).catch(() => null);
  };

  const fetchVersion = () => {
    if (typeof window !== 'undefined' && window.location && window.location.protocol === 'file:') {
      return Promise.reject(new Error('file:// protocol - skipping network request'));
    }
    return fetch(versionUrl(), {
      cache: 'no-store',
      headers: { 'cache-control': 'no-cache, no-store, must-revalidate' }
    }).then((r) => {
      if (!r.ok) throw new Error('version.json ' + r.status);
      return r.json();
    });
  };

  const hardReload = () => {
    const url = new URL(window.location.href);
    url.searchParams.set('v', String(Date.now()));
    window.location.replace(url.toString());
  };

  const applyUpdate = () => {
    if (!('serviceWorker' in navigator)) {
      hardReload();
      return;
    }
    let reloaded = false;
    const onCtrl = () => {
      reloaded = true;
      navigator.serviceWorker.removeEventListener('controllerchange', onCtrl);
      hardReload();
    };
    navigator.serviceWorker.addEventListener('controllerchange', onCtrl);
    navigator.serviceWorker.getRegistration().then((reg) => {
      if (!reg) { hardReload(); return; }
      const fallbackReload = () => {
        if (reloaded) return;
        navigator.serviceWorker.removeEventListener('controllerchange', onCtrl);
        hardReload();
      };
      const activateWorker = (worker) => {
        if (!worker) { setTimeout(fallbackReload, 1200); return; }
        worker.postMessage({ type: 'SKIP_WAITING' });
        setTimeout(fallbackReload, 1800);
      };
      if (reg.waiting) { activateWorker(reg.waiting); return; }
      if (reg.installing) {
        reg.installing.addEventListener('statechange', () => {
          if (reg.waiting) activateWorker(reg.waiting);
          else if (reg.installing && reg.installing.state === 'activated') fallbackReload();
        });
        return;
      }
      Promise.resolve(reg.update()).catch(() => {}).then(() => {
        if (reg.waiting) activateWorker(reg.waiting);
        else setTimeout(fallbackReload, 1200);
      });
    });
  };

  const checkAndUpdate = () => {
    return requestServiceWorkerUpdate().then(() => fetchVersion()).then((v) => {
      if (!v || !v.build) return;
      if (localBuild && String(v.build) !== localBuild) applyUpdate();
    }).catch(() => {});
  };

  const startPeriodicCheck = (ms) => {
    if (started) return;
    started = true;
    const interval = ms == null ? 60 * 1000 : ms;
    setInterval(checkAndUpdate, interval);
    setTimeout(checkAndUpdate, 3000);
    window.addEventListener('focus', checkAndUpdate);
    window.addEventListener('online', checkAndUpdate);
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') checkAndUpdate();
    });
  };

  global.UpdateService = {
    setLocalBuild,
    fetchVersion,
    checkAndUpdate,
    startPeriodicCheck
  };
})(typeof window !== 'undefined' ? window : globalThis);
