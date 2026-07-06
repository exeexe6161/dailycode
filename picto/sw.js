/* ============================================================
   dailycode  Picto  Service Worker (Scope /picto/)
   Cache first fuer die App Shell. Versionierter Cache, es werden
   NUR Caches des eigenen Praefix (dailycode-pixela-) aufgeraeumt,
   damit der Portal Worker (dailycode-portal-) und die anderen Spiel
   Worker nicht beruehrt werden. Cache Storage ist origin weit, daher
   ist diese Praefix Trennung noetig, um eine gegenseitige Loeschung
   der Worker zu verhindern. Nur statische Dateien, keine
   personenbezogene Datenuebertragung.
   ============================================================ */
'use strict';

var CACHE = 'dailycode-pixela-v11';
var LEGACY = ['dailycode-picto-v1'];
var PREFIX = 'dailycode-pixela-';

var ASSETS = [
  './',
  './index.html',
  './style.css',
  './game.js',
  './theme-init.js',
  './manifest.json',
  './icon.svg',
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
        if ((key.indexOf(PREFIX) === 0 && key !== CACHE) || LEGACY.indexOf(key) !== -1) {
          return caches.delete(key);
        }
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
        if (res && res.ok && res.type === 'basic') {
          var copy = res.clone();
          caches.open(CACHE).then(function (cache) { cache.put(req, copy); });
        }
        return res;
      }).catch(function () {
        if (req.mode === 'navigate') { return caches.match('./index.html'); }
        return undefined;
      });
    })
  );
});
