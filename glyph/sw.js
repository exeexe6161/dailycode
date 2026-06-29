/* ============================================================
   dailycode  Fuenftes Spiel  Service Worker (Scope /glyph/)
   Cache first fuer die App Shell. Versionierter Cache, es werden
   NUR Caches des eigenen Praefix (dailycode-glyph-) aufgeraeumt,
   damit Portal und die anderen Spiel Worker nicht beruehrt werden.
   Die Wortlisten (words-de.txt, words-en.txt) sind GROSS und werden
   NICHT vorab gecacht, sondern landen beim ersten Laden ueber den
   Runtime-Cache-Pfad im Cache (nur die tatsaechlich gespielte
   Sprache, damit der Cache schlank bleibt). Nur statische Dateien,
   keine personenbezogene Datenuebertragung.
   ============================================================ */
'use strict';

var CACHE = 'dailycode-glyph-v4';
var PREFIX = 'dailycode-glyph-';

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
        // Nur eigenen Namespace aufraeumen: Praefix dailycode-glyph-, aber
        // nicht die aktuelle Version. Fremde Caches bleiben unberuehrt.
        if (key.indexOf(PREFIX) === 0 && key !== CACHE) { return caches.delete(key); }
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
        // Das schliesst die beim Spielstart geladene Wortliste ein, daher
        // laeuft das Spiel nach dem ersten Laden je Sprache auch offline.
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
