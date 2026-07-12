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

  /* ---------- Lucide Bedien-Icons (ISC), offizielle Pfade verbatim ----------
     Quelle: https://raw.githubusercontent.com/lucide-icons/lucide/main/icons/<name>.svg
     Zur Buildzeit geholt und unveraendert eingebettet, kein Laufzeitnachladen. */
  function svg(inner) {
    return '<svg viewBox="0 0 24 24" class="lucide" aria-hidden="true" focusable="false">' + inner + '</svg>';
  }
  var ICON = {
    sun: svg('<circle cx="12" cy="12" r="4"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="m4.93 4.93 1.41 1.41"/><path d="m17.66 17.66 1.41 1.41"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="m6.34 17.66-1.41 1.41"/><path d="m19.07 4.93-1.41 1.41"/>'),
    moon: svg('<path d="M20.985 12.486a9 9 0 1 1-9.473-9.472c.405-.022.617.46.402.803a6 6 0 0 0 8.268 8.268c.344-.215.825-.004.803.401"/>'),
    monitor: svg('<rect width="20" height="14" x="2" y="3" rx="2"/><line x1="8" x2="16" y1="21" y2="21"/><line x1="12" x2="12" y1="17" y2="21"/>'),
    globe: svg('<circle cx="12" cy="12" r="10"/><path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20"/><path d="M2 12h20"/>')
  };
  // Theme-Modus -> Icon des AKTUELL aktiven Zustands.
  var THEME_ICON = { auto: 'monitor', light: 'sun', dark: 'moon' };

  /* ---------- Sprachen: alle sichtbaren Strings und aria-labels ---------- */
  var I18N = {
    de: {
      hero_subtitle: 'Tägliche Puzzles für kurze Denkpausen.',
      hero_rankings: 'Rangliste',
      hero_rankings_aria: 'Zur Rangliste',
      hero_hint: 'Deine Werte werden nur auf diesem Gerät gespeichert.',
      aria_tiles: 'Spielesammlung',
      tile_game_name: 'PuzzlePure Code',
      tile_game_aria: 'Öffnen: PuzzlePure Code',
      tile_drift_name: 'PuzzlePure Drift',
      tile_drift_aria: 'Öffnen: PuzzlePure Drift',
      tile_cluster_name: 'PuzzlePure Cluster',
      tile_cluster_aria: 'Öffnen: PuzzlePure Cluster',
      tile_echo_name: 'PuzzlePure Echo',
      tile_echo_aria: 'Öffnen: PuzzlePure Echo',
      tile_glyph_name: 'PuzzlePure Words',
      tile_glyph_aria: 'Öffnen: PuzzlePure Words',
      tile_grid9_name: 'PuzzlePure Grid',
      tile_grid9_aria: 'Öffnen: PuzzlePure Grid',
      tile_react7_name: 'PuzzlePure Reflex',
      tile_react7_aria: 'Öffnen: PuzzlePure Reflex',
      tile_flow8_name: 'PuzzlePure Flow',
      tile_flow8_aria: 'Öffnen: PuzzlePure Flow',
      tile_picto_name: 'PuzzlePure Picto',
      tile_picto_aria: 'Öffnen: PuzzlePure Picto',
      tile_questra_name: 'PuzzlePure Quiz',
      tile_questra_aria: 'Öffnen: PuzzlePure Quiz',
      tile_soon_name: 'Neues Rätsel',
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
      hero_subtitle: 'Daily puzzles for short thinking breaks.',
      hero_rankings: 'Rankings',
      hero_rankings_aria: 'To the rankings',
      hero_hint: 'Your results are stored only on this device.',
      aria_tiles: 'Puzzle collection',
      tile_game_name: 'PuzzlePure Code',
      tile_game_aria: 'Open: PuzzlePure Code',
      tile_drift_name: 'PuzzlePure Drift',
      tile_drift_aria: 'Open: PuzzlePure Drift',
      tile_cluster_name: 'PuzzlePure Cluster',
      tile_cluster_aria: 'Open: PuzzlePure Cluster',
      tile_echo_name: 'PuzzlePure Echo',
      tile_echo_aria: 'Open: PuzzlePure Echo',
      tile_glyph_name: 'PuzzlePure Words',
      tile_glyph_aria: 'Open: PuzzlePure Words',
      tile_grid9_name: 'PuzzlePure Grid',
      tile_grid9_aria: 'Open: PuzzlePure Grid',
      tile_react7_name: 'PuzzlePure Reflex',
      tile_react7_aria: 'Open: PuzzlePure Reflex',
      tile_flow8_name: 'PuzzlePure Flow',
      tile_flow8_aria: 'Open: PuzzlePure Flow',
      tile_picto_name: 'PuzzlePure Picto',
      tile_picto_aria: 'Open: PuzzlePure Picto',
      tile_questra_name: 'PuzzlePure Quiz',
      tile_questra_aria: 'Open: PuzzlePure Quiz',
      tile_soon_name: 'New puzzle',
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
      hero_subtitle: 'Kısa düşünme molaları için günlük bulmacalar.',
      hero_rankings: 'Sıralama',
      hero_rankings_aria: 'Sıralamaya git',
      hero_hint: 'Sonuçların yalnızca bu cihazda saklanır.',
      aria_tiles: 'Bulmaca koleksiyonu',
      tile_game_name: 'PuzzlePure Code',
      tile_game_aria: 'Aç: PuzzlePure Code',
      tile_drift_name: 'PuzzlePure Drift',
      tile_drift_aria: 'Aç: PuzzlePure Drift',
      tile_cluster_name: 'PuzzlePure Cluster',
      tile_cluster_aria: 'Aç: PuzzlePure Cluster',
      tile_echo_name: 'PuzzlePure Echo',
      tile_echo_aria: 'Aç: PuzzlePure Echo',
      tile_glyph_name: 'PuzzlePure Words',
      tile_glyph_aria: 'Aç: PuzzlePure Words',
      tile_grid9_name: 'PuzzlePure Grid',
      tile_grid9_aria: 'Aç: PuzzlePure Grid',
      tile_react7_name: 'PuzzlePure Reflex',
      tile_react7_aria: 'Aç: PuzzlePure Reflex',
      tile_flow8_name: 'PuzzlePure Flow',
      tile_flow8_aria: 'Aç: PuzzlePure Flow',
      tile_picto_name: 'PuzzlePure Picto',
      tile_picto_aria: 'Aç: PuzzlePure Picto',
      tile_questra_name: 'PuzzlePure Quiz',
      tile_questra_aria: 'Aç: PuzzlePure Quiz',
      tile_soon_name: 'Yeni bulmaca',
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
  var themeFeedbackEl = document.getElementById('themeFeedback');
  var linkPrivacyEl = document.getElementById('linkPrivacy');
  var linkImprintEl = document.getElementById('linkImprint');

  /* ---------- Zustand ---------- */
  var hasStorage = storageOK();
  var lang = loadLang();
  var theme = loadTheme();
  var systemDarkMQ = window.matchMedia('(prefers-color-scheme: dark)');
  var themeToggleBtn = null;
  var langToggleBtn = null;
  var fbTimer = 0;

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

  // Ein Icon-Button schaltet zyklisch auto -> light -> dark -> auto.
  // Das Icon zeigt den AKTUELL aktiven Modus, Funktion und Persistenz unveraendert.
  function buildThemeBar() {
    if (!themebarEl) return;
    themebarEl.innerHTML = '';
    themeToggleBtn = document.createElement('button');
    themeToggleBtn.type = 'button';
    themeToggleBtn.className = 'icon-btn theme-toggle';
    themeToggleBtn.addEventListener('click', cycleTheme);
    themebarEl.appendChild(themeToggleBtn);
    refreshThemeBar();
  }

  function cycleTheme() {
    var i = THEMES.indexOf(theme);
    setTheme(THEMES[(i + 1) % THEMES.length]);
    showThemeFeedback();
  }

  // Kurze sichtbare Textrueckmeldung des neuen Modus, blendet per Klasse aus.
  function showThemeFeedback() {
    if (!themeFeedbackEl) return;
    themeFeedbackEl.textContent = t('theme_' + theme);
    themeFeedbackEl.classList.add('show');
    if (fbTimer) window.clearTimeout(fbTimer);
    fbTimer = window.setTimeout(function () {
      themeFeedbackEl.classList.remove('show');
    }, 2200);
  }

  function refreshThemeBar() {
    if (!themeToggleBtn) return;
    themeToggleBtn.innerHTML = ICON[THEME_ICON[theme]];
    themeToggleBtn.setAttribute('aria-label', t('theme_group') + ': ' + t('theme_' + theme));
  }

  /* ---------- Sprachumschalter: Weltkugel plus Kuerzel, zyklisch ---------- */
  function langName(code) {
    for (var i = 0; i < LANGS.length; i++) { if (LANGS[i].code === code) return LANGS[i].name; }
    return code;
  }

  function buildLangBar() {
    if (!langbarEl) return;
    langbarEl.innerHTML = '';
    langToggleBtn = document.createElement('button');
    langToggleBtn.type = 'button';
    langToggleBtn.className = 'icon-btn lang-toggle';
    langToggleBtn.addEventListener('click', cycleLang);
    langbarEl.appendChild(langToggleBtn);
    refreshLangBar();
  }

  function cycleLang() {
    var order = ['de', 'en', 'tr'];
    var i = order.indexOf(lang);
    setLang(order[(i + 1) % order.length]);
  }

  function refreshLangBar() {
    if (!langToggleBtn) return;
    langToggleBtn.innerHTML = ICON.globe + '<span class="lang-code">' + lang.toUpperCase() + '</span>';
    langToggleBtn.setAttribute('aria-label', t('aria_lang_group') + ': ' + langName(lang));
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
