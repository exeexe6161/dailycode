/* ============================================================
   dailycode  Achtes Spiel  Service Worker (Scope /flow8/)
   Cache first fuer die App Shell. Versionierter Cache, es werden
   NUR Caches des eigenen Praefix (dailycode-fluxa-) aufgeraeumt,
   damit der Portal Worker (dailycode-portal-) und die anderen Spiel
   Worker nicht beruehrt werden. Cache Storage ist origin weit, daher
   ist diese Praefix Trennung noetig, um eine gegenseitige Loeschung
   der Worker zu verhindern. Nur statische Dateien, keine
   personenbezogene Datenuebertragung.
   ============================================================ */
'use strict';

var CACHE = 'dailycode-fluxa-v3';
var LEGACY = ['dailycode-flow8-v1'];
var PREFIX = 'dailycode-fluxa-';

var ASSETS = [
  './',
  './index.html',
  './style.css',
  './game.js',
  './theme-init.js',
  './manifest.json',
  './icon.svg'
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
        // Nur eigenen Namespace aufraeumen: Praefix dailycode-fluxa-, aber
        // nicht die aktuelle Version. Fremde Caches bleiben unberuehrt.
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
