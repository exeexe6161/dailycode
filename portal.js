/* ============================================================
   dailycode  Portal
   Startseite mit Kachelraster. Vanilla JS, keine Frameworks,
   keine Libraries, keine externen Ressourcen. Teilt Theme und
   Sprache mit dem Spiel ueber dieselben localStorage Keys
   (dailycode:theme, dailycode:lang). Kein Inline Style, dynamische
   Werte ausschliesslich ueber CSSOM (hier nicht noetig). Strikte
   CSP konform (self).
   ============================================================ */
(function () {
  'use strict';

  var LANG_KEY = 'dailycode:lang';
  var THEME_KEY = 'dailycode:theme';
  var THEMES = ['auto', 'light', 'dark'];

  var LANGS = [
    { code: 'de', label: 'DE', name: 'Deutsch' },
    { code: 'en', label: 'EN', name: 'English' },
    { code: 'tr', label: 'TR', name: 'Türkçe' }
  ];

  /* ---------- Sprachen: alle sichtbaren Strings und aria-labels ---------- */
  var I18N = {
    de: {
      subtitle: 'Eine kleine Sammlung täglicher Rätsel.',
      aria_tiles: 'Spielesammlung',
      tile_game_name: 'Code des Tages',
      tile_game_desc: 'Knacke den geheimen Code des Tages.',
      tile_game_aria: 'Öffnen: Code des Tages',
      tile_soon_name: 'Neues Rätsel',
      tile_soon_desc: 'In Vorbereitung.',
      tile_soon_aria: 'Neues Rätsel, bald verfügbar',
      badge_soon: 'Bald',
      aria_lang_group: 'Sprache',
      theme_group: 'Darstellung',
      theme_auto: 'Auto',
      theme_light: 'Hell',
      theme_dark: 'Dunkel',
      nav_privacy: 'Datenschutz',
      nav_imprint: 'Impressum'
    },
    en: {
      subtitle: 'A small collection of daily puzzles.',
      aria_tiles: 'Puzzle collection',
      tile_game_name: 'Daily code',
      tile_game_desc: 'Crack the secret code of the day.',
      tile_game_aria: 'Open: Daily code',
      tile_soon_name: 'New puzzle',
      tile_soon_desc: 'In preparation.',
      tile_soon_aria: 'New puzzle, available soon',
      badge_soon: 'Soon',
      aria_lang_group: 'Language',
      theme_group: 'Appearance',
      theme_auto: 'Auto',
      theme_light: 'Light',
      theme_dark: 'Dark',
      nav_privacy: 'Privacy',
      nav_imprint: 'Imprint'
    },
    tr: {
      subtitle: 'Küçük bir günlük bulmaca koleksiyonu.',
      aria_tiles: 'Bulmaca koleksiyonu',
      tile_game_name: 'Günün kodu',
      tile_game_desc: 'Günün gizli kodunu çöz.',
      tile_game_aria: 'Aç: Günün kodu',
      tile_soon_name: 'Yeni bulmaca',
      tile_soon_desc: 'Hazırlanıyor.',
      tile_soon_aria: 'Yeni bulmaca, yakında kullanılabilir',
      badge_soon: 'Yakında',
      aria_lang_group: 'Dil',
      theme_group: 'Görünüm',
      theme_auto: 'Otomatik',
      theme_light: 'Açık',
      theme_dark: 'Koyu',
      nav_privacy: 'Gizlilik',
      nav_imprint: 'Künye'
    }
  };

  function t(key) {
    var table = I18N[lang] || I18N.en;
    var entry = table[key];
    if (entry === undefined) entry = I18N.en[key]; // Fallback en
    if (entry === undefined) return key;
    return entry;
  }

  /* ---------- DOM ---------- */
  var langbarEl    = document.getElementById('langbar');
  var themebarEl   = document.getElementById('themebar');
  var themeColorEl = document.getElementById('themeColor');
  var linkPrivacyEl = document.getElementById('linkPrivacy');
  var linkImprintEl = document.getElementById('linkImprint');

  /* ---------- Zustand ---------- */
  var hasStorage = storageOK();
  var lang = loadLang();
  var theme = loadTheme();
  var systemDarkMQ = window.matchMedia('(prefers-color-scheme: dark)');
  var langButtons = [];
  var themeButtons = [];

  function storageOK() {
    try {
      var k = '__dc_test__';
      window.localStorage.setItem(k, '1');
      window.localStorage.removeItem(k);
      return true;
    } catch (e) {
      return false;
    }
  }

  /* ---------- Sprache: Wahl laden, speichern, setzen ---------- */
  function loadLang() {
    var stored = null;
    if (hasStorage) {
      try { stored = window.localStorage.getItem(LANG_KEY); } catch (e) { stored = null; }
    }
    if (stored && I18N[stored]) return stored;
    var navs = [];
    if (navigator.languages && navigator.languages.length) navs = navigator.languages;
    else if (navigator.language) navs = [navigator.language];
    for (var i = 0; i < navs.length; i++) {
      var two = String(navs[i]).slice(0, 2).toLowerCase();
      if (two === 'de' || two === 'en' || two === 'tr') return two;
    }
    return 'en';
  }

  function saveLang(l) {
    if (!hasStorage) return;
    try { window.localStorage.setItem(LANG_KEY, l); } catch (e) { /* nur Sitzung */ }
  }

  function setLang(l) {
    if (!I18N[l]) return;
    lang = l;
    saveLang(l);
    relocalize();
  }

  /* ---------- Theme: auto, hell, dunkel ---------- */
  function loadTheme() {
    if (hasStorage) {
      try {
        var v = window.localStorage.getItem(THEME_KEY);
        if (v === 'auto' || v === 'light' || v === 'dark') return v;
      } catch (e) { /* kein Storage */ }
    }
    return 'auto';
  }

  function saveTheme(v) {
    if (!hasStorage) return;
    try { window.localStorage.setItem(THEME_KEY, v); } catch (e) { /* nur Sitzung */ }
  }

  function effectiveDark() {
    return theme === 'dark' || (theme === 'auto' && systemDarkMQ.matches);
  }

  function updateThemeColor() {
    if (themeColorEl) themeColorEl.setAttribute('content', effectiveDark() ? '#0a0c11' : '#f4f5f7');
  }

  function applyTheme() {
    document.documentElement.setAttribute('data-theme', theme);
    updateThemeColor();
    refreshThemeBar();
  }

  function setTheme(v) {
    if (THEMES.indexOf(v) === -1) return;
    theme = v;
    saveTheme(v);
    applyTheme();
  }

  function onSystemSchemeChange() {
    if (theme === 'auto') applyTheme();
  }

  function buildThemeBar() {
    if (!themebarEl) return;
    themebarEl.innerHTML = '';
    themeButtons = [];
    for (var i = 0; i < THEMES.length; i++) {
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'theme-btn';
      b.dataset.theme = THEMES[i];
      b.textContent = t('theme_' + THEMES[i]);
      b.addEventListener('click', function () { setTheme(this.dataset.theme); });
      themebarEl.appendChild(b);
      themeButtons.push(b);
    }
  }

  function refreshThemeBar() {
    if (themebarEl) themebarEl.setAttribute('aria-label', t('theme_group'));
    for (var i = 0; i < themeButtons.length; i++) {
      themeButtons[i].textContent = t('theme_' + themeButtons[i].dataset.theme);
      themeButtons[i].setAttribute('aria-pressed', themeButtons[i].dataset.theme === theme ? 'true' : 'false');
    }
  }

  /* ---------- Sprachumschalter ---------- */
  function buildLangBar() {
    if (!langbarEl) return;
    langbarEl.innerHTML = '';
    langButtons = [];
    for (var i = 0; i < LANGS.length; i++) {
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'lang-btn';
      b.dataset.lang = LANGS[i].code;
      b.textContent = LANGS[i].label;
      b.setAttribute('aria-label', LANGS[i].name);
      b.addEventListener('click', function () { setLang(this.dataset.lang); });
      langbarEl.appendChild(b);
      langButtons.push(b);
    }
  }

  function refreshLangBar() {
    if (langbarEl) langbarEl.setAttribute('aria-label', t('aria_lang_group'));
    for (var i = 0; i < langButtons.length; i++) {
      langButtons[i].setAttribute('aria-pressed', langButtons[i].dataset.lang === lang ? 'true' : 'false');
    }
  }

  /* ---------- Statische Texte ---------- */
  function applyStaticI18n() {
    var nodes = document.querySelectorAll('[data-i18n]');
    for (var i = 0; i < nodes.length; i++) {
      nodes[i].textContent = t(nodes[i].getAttribute('data-i18n'));
    }
    var aNodes = document.querySelectorAll('[data-i18n-aria]');
    for (var j = 0; j < aNodes.length; j++) {
      aNodes[j].setAttribute('aria-label', t(aNodes[j].getAttribute('data-i18n-aria')));
    }
  }

  /* ---------- Fusszeile: Rechtslinks sprachrichtig ----------
     Rechtstexte liegen auf Portal Ebene (gleiches Verzeichnis). */
  function setFooterLinks() {
    if (linkPrivacyEl) linkPrivacyEl.setAttribute('href', 'datenschutz-' + lang + '.html');
    if (linkImprintEl) linkImprintEl.setAttribute('href', 'impressum-' + lang + '.html');
  }

  /* ---------- Neu Lokalisieren bei Sprachwechsel ---------- */
  function relocalize() {
    document.documentElement.lang = lang;
    applyStaticI18n();
    refreshLangBar();
    refreshThemeBar();
    setFooterLinks();
  }

  /* ---------- Service Worker: nur https oder localhost, nie ueber file:// ---------- */
  function registerServiceWorker() {
    try {
      if (!('serviceWorker' in navigator)) return;
      var proto = location.protocol;
      var host = location.hostname;
      var secure = (proto === 'https:') ||
                   (proto === 'http:' && (host === 'localhost' || host === '127.0.0.1' || host === '[::1]'));
      if (!secure) return; // ueber file:// leise nichts tun, Portal bleibt voll nutzbar
      window.addEventListener('load', function () {
        try {
          navigator.serviceWorker.register('sw.js').catch(function () { /* still ignorieren */ });
        } catch (e) { /* nie crashen */ }
      });
    } catch (e) { /* nie crashen */ }
  }

  /* ---------- Start ---------- */
  function init() {
    buildLangBar();
    buildThemeBar();

    document.documentElement.lang = lang;
    applyStaticI18n();
    refreshLangBar();
    setFooterLinks();
    applyTheme();

    if (systemDarkMQ.addEventListener) {
      systemDarkMQ.addEventListener('change', onSystemSchemeChange);
    } else if (systemDarkMQ.addListener) {
      systemDarkMQ.addListener(onSystemSchemeChange);
    }
    registerServiceWorker();
  }

  init();
})();
