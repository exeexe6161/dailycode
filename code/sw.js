/* ============================================================
   dailycode  Service Worker (Spiel, Scope /code/)
   Cache first fuer die App Shell. Versionierter Cache, es werden
   NUR Caches des eigenen Praefix (dailycode-ciphera-) aufgeraeumt,
   damit der Portal Worker (dailycode-portal-) nicht beruehrt wird.
   Cache Storage ist origin weit, daher ist diese Praefix Trennung
   noetig, um eine gegenseitige Loeschung der beiden Worker zu
   verhindern. Der Tagescode wird rein clientseitig aus dem Datum
   berechnet, daher ist cache first unkritisch. Nur statische
   Dateien, keine personenbezogene Datenuebertragung.
   ============================================================ */
'use strict';

var CACHE = 'dailycode-ciphera-v17';
var LEGACY = ['dailycode-game-v5'];
var PREFIX = 'dailycode-ciphera-';

var ASSETS = [
  './',
  './index.html',
  './style.css',
  './game.js',
  './theme-init.js',
  './manifest.json',
  './icon-192.png',
  './icon-512.png',
  './icon-maskable-512.png',
  '../shared/score.js',
  '../shared/rewards.css',
  '../shared/rewards.js'
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
        // Nur eigenen Namespace aufraeumen: Praefix dailycode-ciphera-, aber
        // nicht die aktuelle Version. Fremde Caches (Portal, Legacy) bleiben unberuehrt.
        if ((key.indexOf(PREFIX) === 0 && key !== CACHE) || LEGACY.indexOf(key) !== -1) { return caches.delete(key); }
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
    caches.open(CACHE).then(function (cache) { return cache.match(req); }).then(function (cached) {
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
        if (req.mode === 'navigate') { return caches.open(CACHE).then(function (cache) { return cache.match('./index.html'); }); }
        return undefined;
      });
    })
  );
});
