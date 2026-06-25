/* ============================================================
   dailycode  Service Worker
   Cache first fuer die App Shell. Versionierter Cache, alte
   Caches werden beim Aktivieren entfernt. Der Tagescode wird
   rein clientseitig aus dem Datum berechnet, daher ist cache
   first unkritisch: das Raetsel wechselt ueber das Datum, nicht
   ueber das Netz. Es werden nur statische Dateien gecacht, keine
   personenbezogene Datenuebertragung.
   ============================================================ */
'use strict';

var CACHE = 'dailycode-cache-v1';

var ASSETS = [
  './',
  './index.html',
  './style.css',
  './game.js',
  './manifest.json',
  './icon-192.png',
  './icon-512.png',
  './icon-maskable-512.png',
  './datenschutz-de.html',
  './datenschutz-en.html',
  './datenschutz-tr.html',
  './impressum-de.html',
  './impressum-en.html',
  './impressum-tr.html'
];

self.addEventListener('install', function (event) {
  event.waitUntil(
    caches.open(CACHE).then(function (cache) {
      // Einzeln hinzufuegen, damit ein fehlendes Asset die Installation nicht komplett scheitern laesst.
      return Promise.all(ASSETS.map(function (url) {
        return cache.add(url).catch(function () { return null; });
      }));
    }).then(function () {
      return self.skipWaiting();
    })
  );
});

self.addEventListener('activate', function (event) {
  event.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(keys.map(function (key) {
        if (key !== CACHE) { return caches.delete(key); }
        return null;
      }));
    }).then(function () {
      return self.clients.claim();
    })
  );
});

self.addEventListener('fetch', function (event) {
  var req = event.request;
  if (req.method !== 'GET') { return; }

  event.respondWith(
    caches.match(req).then(function (cached) {
      if (cached) { return cached; }
      return fetch(req).then(function (res) {
        // Nur erfolgreiche, gleiche Herkunft Antworten nachtraeglich ablegen.
        if (res && res.ok && res.type === 'basic') {
          var copy = res.clone();
          caches.open(CACHE).then(function (cache) { cache.put(req, copy); });
        }
        return res;
      }).catch(function () {
        // Offline und nicht im Cache: bei Navigationen die App Shell liefern.
        if (req.mode === 'navigate') { return caches.match('./index.html'); }
        return undefined;
      });
    })
  );
});
