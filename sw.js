/* ============================================================
   dailycode  Service Worker (Portal, Scope /)
   Cache first fuer die Portal Shell und die Rechtstexte. Es werden
   NUR Caches des eigenen Praefix (dailycode-portal-) aufgeraeumt,
   dazu der Legacy Cache der alten Wurzel Installation. Der Spiel
   Worker (dailycode-game-) bleibt unberuehrt. Cache Storage ist
   origin weit, daher ist diese Praefix Trennung noetig, um eine
   gegenseitige Loeschung der beiden Worker zu verhindern.
   Pfade unter /code/ werden bewusst nicht behandelt, damit der
   Spiel Worker seinen Scope allein bedient. Nur statische Dateien,
   keine personenbezogene Datenuebertragung.
   ============================================================ */
'use strict';

var CACHE = 'dailycode-portal-v3';
var PREFIX = 'dailycode-portal-';
var LEGACY = ['dailycode-cache-v2'];

var ASSETS = [
  './',
  './index.html',
  './style.css',
  './portal.js',
  './theme-init.js',
  './manifest.json',
  './portal-icon-192.png',
  './portal-icon-512.png',
  './portal-icon-maskable-512.png',
  './fonts/Inter-Regular.woff2',
  './fonts/Inter-Bold.woff2',
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
        // Nur eigenen Namespace (Praefix dailycode-portal-, nicht aktuelle Version)
        // plus den Legacy Cache der alten Wurzel Installation aufraeumen.
        // Der Spiel Cache (dailycode-game-) bleibt ausdruecklich erhalten.
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

  // Spiel Scopes nicht anfassen: /code/, /drift/, /cluster/, /echo/ und
  // /glyph/ und /grid9/ bedienen die jeweiligen Spiel Worker allein, damit der Portal
  // Cache keine fremden Spielassets aufnimmt (Cache Storage ist origin weit).
  var path;
  try { path = new URL(req.url).pathname; } catch (e) { path = ''; }
  if (path === '/code' || path.indexOf('/code/') === 0) { return; }
  if (path === '/drift' || path.indexOf('/drift/') === 0) { return; }
  if (path === '/cluster' || path.indexOf('/cluster/') === 0) { return; }
  if (path === '/echo' || path.indexOf('/echo/') === 0) { return; }
  if (path === '/glyph' || path.indexOf('/glyph/') === 0) { return; }
  if (path === '/grid9' || path.indexOf('/grid9/') === 0) { return; }

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
        // Offline und nicht im Cache: bei Navigationen die Portal Shell liefern.
        if (req.mode === 'navigate') { return caches.match('./index.html'); }
        return undefined;
      });
    })
  );
});
