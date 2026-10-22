'use strict';
let CACHE_NAME = 'kk-kukanche-v26';
const PRECACHE = [
  "./","../index.html",
  "./css/main.css","./css/variables.css","./css/base.css",
  "./css/layout.css","./css/components.css","./css/modules.css","./css/responsive.css",
  "./app.js", "./modules/parking.js",
  "./storageService.js","./backupService.js","./syncService.js","./updateService.js",
  "./manifest.json","./version.json"
];

self.addEventListener('message', function (event) {
  if (event.data && event.data.type === 'SKIP_WAITING') self.skipWaiting();
  if (event.data && event.data.type === 'UPDATE_CACHE_NAME') {
    CACHE_NAME = event.data.cacheName || CACHE_NAME;
  }
});

self.addEventListener('install', function (e) {
  self.skipWaiting();
  e.waitUntil(caches.open(CACHE_NAME).then(function (c) { return c.addAll(PRECACHE); }));
});

self.addEventListener('activate', function (e) {
  e.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(keys.map(function (k) { if (k !== CACHE_NAME) return caches.delete(k); }));
    }).then(function () { return self.clients.claim(); })
  );
});

self.addEventListener('fetch', function (event) {
  if (event.request.method !== 'GET') return;
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;
  if (/\/version\.json(?:\?|$)/.test(url.pathname + url.search) || /\/service-worker\.js(?:\?|$)/.test(url.pathname + url.search)) {
    event.respondWith(fetch(event.request));
    return;
  }
  event.respondWith(
    fetch(event.request).then(function (response) {
      if (!response || !response.ok) return response;
      const responseClone = response.clone();
      caches.open(CACHE_NAME).then(function (cache) { cache.put(event.request, responseClone); });
      return response;
    }).catch(function () {
      return caches.match(event.request).then(function (cached) {
        if (cached) return cached;
        if (event.request.mode === 'navigate') return caches.match('./index.html');
        return Promise.reject(new Error('No cache match for ' + event.request.url));
      });
    })
  );
});