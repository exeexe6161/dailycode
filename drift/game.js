/* ============================================================
   dailycode  Zweites Spiel  (Serpix)
   Eine wachsende Kette aus Segmenten zieht in Schrittrichtung ueber
   ein Raster. Durchlaessige Raender (Wrap-around), Niederlage nur bei
   Selbstkollision. Vanilla JS, keine Libraries, keine externen
   Ressourcen, keine data-URI. Strikte CSP konform: keine Inline-
   Styles im Markup, dynamische Werte nur ueber CSSOM und Canvas.
   Theme und Sprache teilen die bestehenden Keys (dailycode:theme,
   dailycode:lang). Sprache DE/EN/TR ueber I18N Tabelle und t()
   Muster, identisch zu code/game.js (Ciphera).
   ============================================================ */
(function () {
  'use strict';

  /* ---------- Spielkonstanten ----------
     Schrittzeit sinkt mit der Punktzahl stufenweise bis zu einer
     Obergrenze (STEP_MIN), darunter wird nicht weiter beschleunigt. */
  var GRID = 17;                 // Raster 17 x 17
  var STEP_BASE = 150;           // ms pro Schritt bei Punktzahl 0, Mittel (bisheriges Verhalten)
  var STEP_MIN = 70;             // Obergrenze fuer das Tempo (untere ms Grenze), fuer alle Stufen gleich
  var STEP_DEC = 12;             // ms schneller je Stufe, fuer alle Stufen gleich
  var POINTS_PER_LEVEL = 4;      // alle 4 Punkte eine Stufe schneller
  var START_LEN = 3;             // Anfangslaenge der Kette
  var SWIPE_MIN = 24;            // Mindestweg fuer eine Wischgeste in px

  /* Schwierigkeit ueber das Starttempo (STEP_BY_DIFF). Mittel (2) entspricht
     exakt dem bisherigen Verhalten (STEP_BASE oben). STEP_MIN und STEP_DEC
     bleiben fuer alle Stufen gleich, nur der Startwert unterscheidet sich,
     daher bleibt die Beschleunigungskurve gleich, nur verschoben. Kein
     Timer, ein Endlosmodus soll fuer langes Ueberleben nicht bestraft
     werden (siehe Batch 3 Konzept). */
  var STEP_BY_DIFF = { 1: 180, 2: STEP_BASE, 3: 120, 4: 95 };

  /* ---------- Sprachen: alle sichtbaren Strings und aria-labels ----------
     Struktur und Fallback-Muster identisch zu code/game.js (Ciphera). */
  var I18N = {
    de: {
      subtitle: 'Lenke die wachsende Kette über das Feld und weiche dir selbst aus.',
      score: 'Punkte',
      lbl_best: 'Bestwert',
      best_none: 'noch keine',
      pause: 'Pause',
      resume: 'Weiter',
      restart: 'Neu',
      over_title: 'Spiel vorbei',
      won_title: 'Feld voll, stark gespielt',
      over_restart: 'Neu starten',
      theme_group: 'Darstellung',
      theme_auto: 'Auto',
      theme_light: 'Hell',
      theme_dark: 'Dunkel',
      dir_up: 'Hoch',
      dir_down: 'Runter',
      dir_left: 'Links',
      dir_right: 'Rechts',
      aria_field: 'Spielfeld. Kette mit Pfeiltasten oder WASD steuern, P pausiert.',
      aria_pause: 'Pausieren',
      aria_resume: 'Fortsetzen',
      aria_restart: 'Neu starten',
      diff_group: 'Schwierigkeit',
      diff_1: 'Leicht', diff_2: 'Mittel', diff_3: 'Schwer', diff_4: 'Experte',
      aria_diff_1: 'Leicht wählen', aria_diff_2: 'Mittel wählen', aria_diff_3: 'Schwer wählen', aria_diff_4: 'Experte wählen',
      help_summary: 'So funktioniert es',
      help_1: 'Pfeiltasten oder WASD steuern die Kette, Wischen geht auch.',
      help_2: 'Sammle die leuchtenden Punkte. Die Kette wächst und wird schneller.',
      help_3: 'Die Ränder sind offen; nur eine Kollision mit dem eigenen Körper beendet das Spiel.',
      help_4: 'Die Schwierigkeit verändert das Starttempo.',
      nav_privacy: 'Datenschutz',
      nav_imprint: 'Impressum',
      home: 'Startseite',
      home_aria: 'Zur Startseite',
      rankings: 'Rangliste',
      rankings_aria: 'Zur Rangliste',
      aria_lang_group: 'Sprache'
    },
    en: {
      subtitle: 'Steer the growing chain across the field and avoid yourself.',
      score: 'Points',
      lbl_best: 'Best',
      best_none: 'none yet',
      pause: 'Pause',
      resume: 'Resume',
      restart: 'New',
      over_title: 'Game over',
      won_title: 'Field full, well played',
      over_restart: 'Restart',
      theme_group: 'Appearance',
      theme_auto: 'Auto',
      theme_light: 'Light',
      theme_dark: 'Dark',
      dir_up: 'Up',
      dir_down: 'Down',
      dir_left: 'Left',
      dir_right: 'Right',
      aria_field: 'Game field. Steer the chain with arrow keys or WASD, P pauses.',
      aria_pause: 'Pause',
      aria_resume: 'Resume',
      aria_restart: 'Restart',
      diff_group: 'Difficulty',
      diff_1: 'Easy', diff_2: 'Medium', diff_3: 'Hard', diff_4: 'Expert',
      aria_diff_1: 'Select easy', aria_diff_2: 'Select medium', aria_diff_3: 'Select hard', aria_diff_4: 'Select expert',
      help_summary: 'How it works',
      help_1: 'Arrow keys or WASD steer the chain, swiping works too.',
      help_2: 'Collect the glowing points, the chain grows and speeds up.',
      help_3: 'The edges are open, only running into your own body ends the game.',
      help_4: 'The difficulty changes the starting speed.',
      nav_privacy: 'Privacy',
      nav_imprint: 'Imprint',
      home: 'Home',
      home_aria: 'Go to home',
      rankings: 'Rankings',
      rankings_aria: 'To the rankings',
      aria_lang_group: 'Language'
    },
    tr: {
      subtitle: 'Büyüyen zinciri alan boyunca yönlendir ve kendine çarpma.',
      score: 'Puan',
      lbl_best: 'En iyi',
      best_none: 'henüz yok',
      pause: 'Duraklat',
      resume: 'Devam',
      restart: 'Yeni',
      over_title: 'Oyun bitti',
      won_title: 'Alan doldu, harika oynadın',
      over_restart: 'Yeniden başlat',
      theme_group: 'Görünüm',
      theme_auto: 'Otomatik',
      theme_light: 'Açık',
      theme_dark: 'Koyu',
      dir_up: 'Yukarı',
      dir_down: 'Aşağı',
      dir_left: 'Sol',
      dir_right: 'Sağ',
      aria_field: 'Oyun alanı. Zinciri ok tuşları veya WASD ile yönlendir, P duraklatır.',
      aria_pause: 'Duraklat',
      aria_resume: 'Devam et',
      aria_restart: 'Yeniden başlat',
      diff_group: 'Zorluk',
      diff_1: 'Kolay', diff_2: 'Orta', diff_3: 'Zor', diff_4: 'Uzman',
      aria_diff_1: 'Kolay seç', aria_diff_2: 'Orta seç', aria_diff_3: 'Zor seç', aria_diff_4: 'Uzman seç',
      help_summary: 'Nasıl çalışır',
      help_1: 'Ok tuşları veya WASD zinciri yönlendirir, kaydırma da işe yarar.',
      help_2: 'Parlayan puanları topla, zincir büyür ve hızlanır.',
      help_3: 'Kenarlar açıktır, oyunu yalnızca kendi gövdene çarpmak bitirir.',
      help_4: 'Zorluk başlangıç hızını değiştirir.',
      nav_privacy: 'Gizlilik',
      nav_imprint: 'Künye',
      home: 'Ana sayfa',
      home_aria: 'Ana sayfaya git',
      rankings: 'Sıralama',
      rankings_aria: 'Sıralamaya git',
      aria_lang_group: 'Dil'
    }
  };
  function t(key) {
    var table = I18N[lang] || I18N.en;
    var entry = table[key];
    if (entry === undefined) entry = I18N.en[key]; // Fallback en
    return entry === undefined ? key : entry;
  }

  /* ---------- Lucide Bedien-Icons (ISC), Pfade verbatim ----------
     Zur Buildzeit eingebettet, kein Laufzeitnachladen, kein CDN. */
  function svg(inner) {
    return '<svg viewBox="0 0 24 24" class="lucide" aria-hidden="true" focusable="false">' + inner + '</svg>';
  }
  var ICON = {
    sun: svg('<circle cx="12" cy="12" r="4"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="m4.93 4.93 1.41 1.41"/><path d="m17.66 17.66 1.41 1.41"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="m6.34 17.66-1.41 1.41"/><path d="m19.07 4.93-1.41 1.41"/>'),
    moon: svg('<path d="M20.985 12.486a9 9 0 1 1-9.473-9.472c.405-.022.617.46.402.803a6 6 0 0 0 8.268 8.268c.344-.215.825-.004.803.401"/>'),
    monitor: svg('<rect width="20" height="14" x="2" y="3" rx="2"/><line x1="8" x2="16" y1="21" y2="21"/><line x1="12" x2="12" y1="17" y2="21"/>'),
    globe: svg('<circle cx="12" cy="12" r="10"/><path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20"/><path d="M2 12h20"/>')
  };
  var THEME_ICON = { auto: 'monitor', light: 'sun', dark: 'moon' };

  /* ---------- Sprachen: Anzeigename je Kuerzel (Sprachumschalter) ---------- */
  var LANGS = [
    { code: 'de', label: 'DE', name: 'Deutsch' },
    { code: 'en', label: 'EN', name: 'English' },
    { code: 'tr', label: 'TR', name: 'Türkçe' }
  ];

  /* ---------- DOM ---------- */
  var langbarEl     = document.getElementById('langbar');
  var themebarEl    = document.getElementById('themebar');
  var themeColorEl  = document.getElementById('themeColor');
  var themeFeedbackEl = document.getElementById('themeFeedback');
  var subtitleEl    = document.getElementById('subtitle');
  var diffRowEl     = document.getElementById('diffRow');
  var scoreEl       = document.getElementById('score');
  var bestEl        = document.getElementById('best');
  var canvas        = document.getElementById('playfield');
  var overlayEl     = document.getElementById('overlay');
  var overlayTitleEl = document.getElementById('overlayTitle');
  var overlayScoreEl = document.getElementById('overlayScore');
  var overlayBtn    = document.getElementById('overlayBtn');
  // Zusaetzlicher, neuer Bereich fuer das gemeinsame PuzzlePureScore System,
  // zwischen Punktestand und Neustart Button eingehaengt. Bestehende Overlay
  // Elemente werden weder entfernt noch der kombinierte overlayScore Text veraendert.
  var ppScoreEl     = document.createElement('div');
  if (overlayScoreEl && overlayScoreEl.after) overlayScoreEl.after(ppScoreEl);
  var pauseBtn      = document.getElementById('pauseBtn');
  var restartBtn    = document.getElementById('restartBtn');
  var dpadEl        = document.getElementById('dpad');
  var linkPrivacyEl = document.getElementById('linkPrivacy');
  var linkImprintEl = document.getElementById('linkImprint');

  var ctx = (canvas && canvas.getContext) ? canvas.getContext('2d') : null;

  /* ---------- Theme Zustand (geteilte Keys mit Portal und Spiel 1) ---------- */
  var THEME_KEY = 'dailycode:theme';
  var LANG_KEY = 'dailycode:lang';
  var DIFFICULTY_KEY = 'dailycode:drift:difficulty';
  var THEMES = ['auto', 'light', 'dark'];
  var hasStorage = storageOK();
  var theme = loadTheme();
  var lang = loadLang();
  var difficulty = loadDifficulty();
  var diffButtons = [];
  var systemDarkMQ = window.matchMedia('(prefers-color-scheme: dark)');
  var reduceMQ = window.matchMedia('(prefers-reduced-motion: reduce)');
  var reduceMotion = reduceMQ.matches;
  var themeToggleBtn = null;
  var langToggleBtn = null;
  var fbTimer = 0;

  function storageOK() {
    try {
      var k = '__dc_test__';
      window.localStorage.setItem(k, '1');
      window.localStorage.removeItem(k);
      return true;
    } catch (e) { return false; }
  }
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
  function loadLang() {
    if (hasStorage) {
      try {
        var v = window.localStorage.getItem(LANG_KEY);
        if (v === 'de' || v === 'en' || v === 'tr') return v;
      } catch (e) { /* kein Storage */ }
    }
    return 'de';
  }
  function saveLang(l) {
    if (!hasStorage) return;
    try { window.localStorage.setItem(LANG_KEY, l); } catch (e) { /* nur Sitzung */ }
  }
  function setLang(l) {
    if (l !== 'de' && l !== 'en' && l !== 'tr') return;
    lang = l;
    saveLang(l);
    document.documentElement.lang = lang;
    applyTexts();
    setFooterLinks();
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
    readColors();   // Canvas Farben an neues Theme angleichen
    render();       // sofort neu zeichnen, auch wenn pausiert
  }
  function setTheme(v) {
    if (THEMES.indexOf(v) === -1) return;
    theme = v;
    saveTheme(v);
    applyTheme();
  }
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

  /* ---------- Sprachumschalter ----------
     Weltkugel plus aktuelles Kuerzel, zyklisch DE -> EN -> TR -> DE. */
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
  function langName(c) {
    for (var i = 0; i < LANGS.length; i++) { if (LANGS[i].code === c) return LANGS[i].name; }
    return c;
  }

  /* ---------- Schwierigkeit: Wahl laden, speichern, anzeigen ----------
     Steuert nur das Starttempo (STEP_BY_DIFF oben), keine neue Spielidee.
     Mittel (2) entspricht dem bisherigen, immer gleichen Verhalten. Ein
     Wechsel startet immer einen frischen Lauf (wie der Neu Knopf), damit
     nie zwei Stufen innerhalb eines Laufs vermischt gewertet werden. */
  function loadDifficulty() {
    if (hasStorage) {
      try { var v = parseInt(window.localStorage.getItem(DIFFICULTY_KEY), 10); if ([1, 2, 3, 4].indexOf(v) !== -1) return v; } catch (e) {}
    }
    return 2;
  }
  function saveDifficulty(v) { if (!hasStorage) return; try { window.localStorage.setItem(DIFFICULTY_KEY, String(v)); } catch (e) {} }
  function buildDiffRow() {
    if (!diffRowEl) return;
    diffRowEl.setAttribute('aria-label', t('diff_group'));
    diffRowEl.innerHTML = '';
    diffButtons = [1, 2, 3, 4].map(function (n) {
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'diff-btn';
      b.textContent = t('diff_' + n);
      b.setAttribute('aria-pressed', String(difficulty === n));
      b.setAttribute('aria-label', t('aria_diff_' + n));
      b.addEventListener('click', function () { selectDifficulty(n); });
      diffRowEl.appendChild(b);
      return b;
    });
  }
  function refreshDiffButtons() {
    diffButtons.forEach(function (b, i) {
      var n = i + 1;
      b.textContent = t('diff_' + n);
      b.setAttribute('aria-pressed', String(difficulty === n));
      b.setAttribute('aria-label', t('aria_diff_' + n));
    });
  }
  function selectDifficulty(n) {
    if (n === difficulty) return;
    difficulty = n;
    saveDifficulty(n);
    refreshDiffButtons();
    restartGame();
  }

  /* ---------- Canvas Farben aus Tokens lesen (Theme Parität) ---------- */
  var COL = {};
  function cssVar(name) {
    try { return getComputedStyle(document.documentElement).getPropertyValue(name).trim(); }
    catch (e) { return ''; }
  }
  function readColors() {
    COL.field   = cssVar('--field-bg')   || '#0e1119';
    COL.grid    = cssVar('--field-grid') || 'rgba(255,255,255,.04)';
    COL.body    = cssVar('--chain-body') || '#6b8cff';
    COL.head    = cssVar('--chain-head') || '#a9c0ff';
    COL.food    = cssVar('--food')       || '#34d399';
    COL.foodGlow = cssVar('--food-glow') || 'transparent';
    COL.headGlow = cssVar('--head-glow') || 'transparent';
  }

  /* ---------- Spielzustand ---------- */
  var chain = [];                // Kopf an Index 0, Schwanz am Ende
  var occ = {};                  // Belegung schneller Nachschlag "x,y" -> true
  var dir = { x: 1, y: 0 };      // aktuell ausgefuehrte Richtung
  var pending = [];              // Richtungspuffer, max 2, gegen Doppeltick
  var food = null;
  var score = 0;
  var level = 0;
  var stepMs = STEP_BASE;
  var paused = false;
  var over = false;
  var won = false;
  var ppResult = null; // Ergebnis des gemeinsamen PuzzlePureScore Systems, gesetzt in gameOver()
  var lastPpPayload = null; // Payload des letzten recordResult() Aufrufs, fuer PuzzlePureRewards.trigger()
  var rewardsTriggered = false; // verhindert doppelte Toasts bei erneutem Rendern derselben Runde

  var rafId = 0;
  var lastTs = 0;
  var acc = 0;

  function keyOf(x, y) { return x + ',' + y; }

  function reset() {
    chain = [];
    occ = {};
    var cx = Math.floor(GRID / 2);
    var cy = Math.floor(GRID / 2);
    // Kette nach links auslaufend, Kopf zuerst, Start nach rechts.
    for (var i = 0; i < START_LEN; i++) {
      var seg = { x: cx - i, y: cy };
      chain.push(seg);
      occ[keyOf(seg.x, seg.y)] = true;
    }
    dir = { x: 1, y: 0 };
    pending = [];
    score = 0;
    level = 0;
    stepMs = STEP_BY_DIFF[difficulty] || STEP_BASE;
    paused = false;
    over = false;
    won = false;
    placeFood();
    updateSpeed();
    updateScore();
  }

  function placeFood() {
    // Freie Zellen sammeln, eine zufaellig waehlen.
    var free = [];
    for (var y = 0; y < GRID; y++) {
      for (var x = 0; x < GRID; x++) {
        if (!occ[keyOf(x, y)]) free.push({ x: x, y: y });
      }
    }
    if (free.length === 0) { food = null; return false; }
    var idx = Math.floor(Math.random() * free.length);
    food = free[idx];
    return true;
  }

  function updateSpeed() {
    level = Math.floor(score / POINTS_PER_LEVEL);
    var base = STEP_BY_DIFF[difficulty] || STEP_BASE;
    stepMs = Math.max(STEP_MIN, base - level * STEP_DEC);
  }

  function updateScore() {
    refreshScoreText();
    updateBest();
  }
  // Im Spielende Zustand traegt die Punkteanzeige zusaetzlich Sieg/Niederlage,
  // damit Screenreader Nutzer (aria-live) den Ausgang direkt mitbekommen.
  function refreshScoreText() {
    if (!scoreEl) return;
    scoreEl.textContent = over
      ? (won ? t('won_title') : t('over_title')) + ', ' + t('score') + ' ' + score
      : t('score') + ' ' + score;
  }

  /* ---------- Bestwert (einheitliches null-Muster, Vorbild grid9) ----------
     Score, hoeher ist besser. Kein gespeicherter Wert ergibt null, daher
     "noch keine" statt 0. hasStorage-Preflight, try/catch, Bereichspruefung.
     Vor Batch 3 gab es nur einen Bestwert insgesamt (oldBestKey). Damit
     dieser nicht verloren geht, wird er einmalig additiv (nur falls besser)
     in den Bestwert der Stufe Mittel uebernommen, siehe migrateOldBest().
     Der alte Schluessel bleibt unveraendert bestehen. */
  function oldBestKey() { return 'dailycode:drift:best'; }
  function bestKey(diff) { return 'dailycode:drift:best:' + diff; }
  function migrateOldBest() {
    if (!hasStorage) return;
    try {
      var oldV = window.localStorage.getItem(oldBestKey());
      if (oldV == null) return;
      var oldN = parseInt(oldV, 10);
      if (isNaN(oldN) || oldN < 0) return;
      var midKey = bestKey(2);
      var curV = window.localStorage.getItem(midKey);
      var curN = (curV == null) ? null : parseInt(curV, 10);
      if (curN == null || isNaN(curN) || oldN > curN) { window.localStorage.setItem(midKey, String(oldN)); }
    } catch (e) {}
  }
  function loadBestVal() {
    if (!hasStorage) return null;
    try { var v = window.localStorage.getItem(bestKey(difficulty)); if (v == null) return null; var n = parseInt(v, 10); return (isNaN(n) || n < 0) ? null : n; }
    catch (e) { return null; }
  }
  function saveBest(val) { if (!hasStorage) return; try { window.localStorage.setItem(bestKey(difficulty), String(val)); } catch (e) {} }
  function updateBest() {
    if (!bestEl) return;
    var v = loadBestVal();
    bestEl.textContent = t('lbl_best') + ' ' + ((v == null) ? t('best_none') : v);
  }

  /* ---------- Richtungseingabe: 180 Grad Sperre und Entprellung ----------
     Jede neue Richtung wird gegen die zuletzt GEPUFFERTE (oder die
     aktuelle) Richtung geprueft. Damit kann pro Tick nie eine
     Umkehr entstehen, auch nicht durch zwei schnelle Eingaben. */
  function enqueueDir(nx, ny) {
    if (over || paused) return;
    if (pending.length >= 2) return;                 // Puffer voll, ignorieren
    var ref = pending.length ? pending[pending.length - 1] : dir;
    if (nx === ref.x && ny === ref.y) return;        // gleiche Richtung, kein Nutzen
    if (nx === -ref.x && ny === -ref.y) return;      // 180 Grad verboten
    pending.push({ x: nx, y: ny });
  }

  /* ---------- Ein Schritt der Schrittlogik ---------- */
  function step() {
    if (pending.length) { dir = pending.shift(); }

    var head = chain[0];
    var nx = (head.x + dir.x + GRID) % GRID;          // Wrap-around X
    var ny = (head.y + dir.y + GRID) % GRID;          // Wrap-around Y

    var willEat = (food && nx === food.x && ny === food.y);

    // Selbstkollision: ohne Fressen verlaesst der Schwanz seine Zelle,
    // daher diese eine Zelle von der Pruefung ausnehmen.
    var checkLen = willEat ? chain.length : chain.length - 1;
    for (var i = 0; i < checkLen; i++) {
      if (chain[i].x === nx && chain[i].y === ny) { gameOver(false); return; }
    }

    var newHead = { x: nx, y: ny };
    chain.unshift(newHead);
    occ[keyOf(nx, ny)] = true;

    if (willEat) {
      score += 1;
      updateScore();
      updateSpeed();
      if (!placeFood()) { gameOver(true); return; }   // Feld voll: Sieg
    } else {
      var tail = chain.pop();
      // Schwanzzelle nur freigeben, wenn sie nicht weiter belegt ist.
      if (!stillOccupied(tail.x, tail.y)) { delete occ[keyOf(tail.x, tail.y)]; }
    }
  }

  // Pruefen, ob eine Koordinate noch von einem Segment belegt ist
  // (Kette kann sich in einer Zelle nicht doppeln, aber defensiv korrekt).
  function stillOccupied(x, y) {
    for (var i = 0; i < chain.length; i++) {
      if (chain[i].x === x && chain[i].y === y) return true;
    }
    return false;
  }

  /* ---------- Rendering ---------- */
  function sizeCanvas() {
    if (!canvas || !ctx) return;
    var cssW = canvas.clientWidth || 320;
    var dpr = window.devicePixelRatio || 1;
    var px = Math.max(1, Math.round(cssW * dpr));
    canvas.width = px;
    canvas.height = px;            // quadratisch (aspect-ratio 1/1 im CSS)
  }

  function render(nowTs) {
    if (!ctx) return;
    var size = canvas.width;       // quadratisch
    var cell = size / GRID;
    var glow = effectiveDark() && !reduceMotion;

    // Hintergrund
    ctx.fillStyle = COL.field;
    ctx.fillRect(0, 0, size, size);

    // Dezentes Raster
    ctx.strokeStyle = COL.grid;
    ctx.lineWidth = Math.max(1, cell * 0.02);
    ctx.beginPath();
    for (var g = 1; g < GRID; g++) {
      var p = Math.round(g * cell) + 0.5;
      ctx.moveTo(p, 0); ctx.lineTo(p, size);
      ctx.moveTo(0, p); ctx.lineTo(size, p);
    }
    ctx.stroke();

    // Sammelobjekt
    if (food) {
      var fr = cell * (reduceMotion ? 0.34 : (0.30 + 0.05 * (0.5 + 0.5 * Math.sin((nowTs || 0) / 280))));
      var fx = food.x * cell + cell / 2;
      var fy = food.y * cell + cell / 2;
      ctx.save();
      if (glow) { ctx.shadowColor = COL.foodGlow; ctx.shadowBlur = cell * 0.9; }
      ctx.fillStyle = COL.food;
      ctx.beginPath();
      ctx.arc(fx, fy, fr, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    // Kette: Schwanz zuerst, Kopf zuletzt (Kopf liegt oben)
    var pad = Math.max(1, cell * 0.10);
    var r = Math.max(2, cell * 0.22);
    for (var i = chain.length - 1; i >= 0; i--) {
      var s = chain[i];
      var isHead = (i === 0);
      ctx.save();
      if (isHead && glow) { ctx.shadowColor = COL.headGlow; ctx.shadowBlur = cell * 0.8; }
      ctx.fillStyle = isHead ? COL.head : COL.body;
      roundRect(s.x * cell + pad, s.y * cell + pad, cell - pad * 2, cell - pad * 2, r);
      ctx.fill();
      ctx.restore();
    }
  }

  function roundRect(x, y, w, h, r) {
    var rr = Math.min(r, w / 2, h / 2);
    ctx.beginPath();
    ctx.moveTo(x + rr, y);
    ctx.arcTo(x + w, y, x + w, y + h, rr);
    ctx.arcTo(x + w, y + h, x, y + h, rr);
    ctx.arcTo(x, y + h, x, y, rr);
    ctx.arcTo(x, y, x + w, y, rr);
    ctx.closePath();
  }

  /* ---------- Schleife: feste Schrittzeit, framerateunabhaengig ---------- */
  function frame(now) {
    if (!lastTs) lastTs = now;
    var dt = now - lastTs;
    lastTs = now;
    if (dt > 250) dt = 250;        // nach Tabwechsel keinen Riesensprung nachholen
    acc += dt;
    var guard = 0;
    while (acc >= stepMs && !over && !paused) {
      step();
      acc -= stepMs;
      if (++guard > 5) { acc = 0; break; }   // Spirale verhindern
    }
    render(now);
    if (rafId) { rafId = window.requestAnimationFrame(frame); }
  }

  function startLoop() {
    if (rafId || over || paused || document.hidden) return;
    lastTs = 0; acc = 0;
    rafId = window.requestAnimationFrame(frame);
  }
  function stopLoop() {
    if (rafId) { window.cancelAnimationFrame(rafId); rafId = 0; }
  }

  /* ---------- Zustaende: Pause, Spielende, Neustart ---------- */
  function setPauseLabels() {
    if (!pauseBtn) return;
    pauseBtn.textContent = paused ? t('resume') : t('pause');
    pauseBtn.setAttribute('aria-label', paused ? t('aria_resume') : t('aria_pause'));
  }

  function setOverlayTexts(title, scoreText, btnText) {
    if (overlayTitleEl) overlayTitleEl.textContent = title;
    if (overlayScoreEl) {
      overlayScoreEl.textContent = scoreText || '';
      overlayScoreEl.hidden = !scoreText;
    }
    if (overlayBtn) overlayBtn.textContent = btnText;
  }
  function showOverlay(title, scoreText, btnText) {
    setOverlayTexts(title, scoreText, btnText);
    if (overlayEl) overlayEl.hidden = false;
    // Fokus auf den Overlay Knopf, damit Tastatur/Screenreader Nutzer beim
    // Erscheinen (Pause oder Spielende) nicht am Hintergrund haengen bleiben.
    if (overlayBtn) overlayBtn.focus();
  }
  function hideOverlay() {
    if (overlayEl) overlayEl.hidden = true;
  }
  // Nur die sichtbaren Overlay Texte neu setzen (z.B. bei Sprachwechsel
  // waehrend Pause/Spielende offen ist), ohne den Fokus zu verschieben.
  function refreshOverlayTexts() {
    if (!overlayEl || overlayEl.hidden) return;
    if (over) {
      var best = loadBestVal();
      setOverlayTexts(won ? t('won_title') : t('over_title'),
        t('score') + ' ' + score + (best != null ? '  ·  ' + t('lbl_best') + ' ' + best : ''),
        t('over_restart'));
      renderPpScoreOverlay();
    } else if (paused) {
      setOverlayTexts(t('pause'), '', t('resume'));
      renderPpScoreOverlay();
    }
  }

  // Baut den gemeinsamen PuzzlePureScore Block nur bei echtem Spielende auf
  // (nicht bei blosser Pause), ergaenzt das Overlay, ersetzt nichts Bestehendes.
  function renderPpScoreOverlay() {
    if (!ppScoreEl) return;
    ppScoreEl.replaceChildren();
    if (over && ppResult && window.PuzzlePureScore) {
      var ppBlock = window.PuzzlePureScore.buildResultBlock(lang, ppResult);
      ppScoreEl.append(ppBlock);
      if (window.PuzzlePureRewards && !rewardsTriggered) {
        rewardsTriggered = true;
        window.PuzzlePureRewards.trigger({
          ppResult: ppResult,
          payload: lastPpPayload || {},
          lang: lang,
          cardEl: overlayEl,
          scoreLineEl: ppBlock.querySelector('.pp-score-line')
        });
      }
    }
  }

  function pauseGame() {
    if (over || paused) return;
    paused = true;
    stopLoop();
    setPauseLabels();
    renderPpScoreOverlay();
    showOverlay(t('pause'), '', t('resume'));
    render();
  }
  function resumeGame() {
    if (over || !paused) return;
    paused = false;
    hideOverlay();
    setPauseLabels();
    startLoop();
  }
  function togglePause() {
    if (over) return;
    if (paused) resumeGame(); else pauseGame();
  }

  function gameOver(isWin) {
    over = true;
    won = !!isWin;
    stopLoop();
    render();
    var prev = loadBestVal();
    if (prev == null || score > prev) saveBest(score);
    var best = loadBestVal();
    updateScore(); // aktualisiert Punkte- und Bestwertanzeige (over ist bereits true)
    // Serpix ist ein Endlosmodus ohne Sieg/Niederlage Konzept, daher zaehlt
    // jede beendete Runde als 'complete', auch das seltene volle Feld (won),
    // unveraendert aus Batch 1. difficulty kommt jetzt aus der vorab
    // gewaehlten Stufe (Batch 3), nicht mehr aus dem erreichten Tempo.
    // perfect nur beim seltenen vollen Feld.
    if (window.PuzzlePureScore) {
      lastPpPayload = {
        game: 'drift',
        difficulty: difficulty,
        outcome: 'complete',
        timeSeconds: null,
        parSeconds: null,
        mistakes: 0,
        hints: 0,
        perfect: won
      };
      ppResult = window.PuzzlePureScore.recordResult(lastPpPayload);
      rewardsTriggered = false;
    }
    renderPpScoreOverlay();
    showOverlay(won ? t('won_title') : t('over_title'),
      t('score') + ' ' + score + (best != null ? '  ·  ' + t('lbl_best') + ' ' + best : ''),
      t('over_restart'));
  }

  function restartGame() {
    reset();
    setPauseLabels();
    hideOverlay();
    render();
    startLoop();
  }

  /* ---------- Eingaben ---------- */
  var DIRS = {
    up:    { x: 0, y: -1 },
    down:  { x: 0, y: 1 },
    left:  { x: -1, y: 0 },
    right: { x: 1, y: 0 }
  };

  function onKeyDown(e) {
    var k = e.key;
    var dirName = null;
    if (k === 'ArrowUp' || k === 'w' || k === 'W') dirName = 'up';
    else if (k === 'ArrowDown' || k === 's' || k === 'S') dirName = 'down';
    else if (k === 'ArrowLeft' || k === 'a' || k === 'A') dirName = 'left';
    else if (k === 'ArrowRight' || k === 'd' || k === 'D') dirName = 'right';
    else if (k === 'p' || k === 'P') { e.preventDefault(); togglePause(); return; }
    else if (k === ' ' || k === 'Spacebar') {
      // Leertaste pausiert nur, wenn nicht ein Knopf den Fokus hat,
      // damit die Knopfaktivierung ungestoert bleibt.
      var tag = e.target && e.target.tagName;
      if (tag !== 'BUTTON' && tag !== 'SUMMARY' && tag !== 'A') { e.preventDefault(); togglePause(); }
      return;
    }
    if (dirName) {
      e.preventDefault();
      var d = DIRS[dirName];
      enqueueDir(d.x, d.y);
    }
  }

  function bindDpad() {
    if (!dpadEl) return;
    var btns = dpadEl.querySelectorAll('[data-dir]');
    for (var i = 0; i < btns.length; i++) {
      (function (btn) {
        var name = btn.getAttribute('data-dir');
        btn.addEventListener('click', function () {
          var d = DIRS[name];
          if (d) enqueueDir(d.x, d.y);
        });
      })(btns[i]);
    }
    applyDpadLabels();
  }
  // Getrennt von bindDpad(), damit ein Sprachwechsel die aria-labels
  // ohne erneute Event-Bindung auffrischen kann.
  function applyDpadLabels() {
    if (!dpadEl) return;
    var btns = dpadEl.querySelectorAll('[data-dir]');
    for (var i = 0; i < btns.length; i++) {
      btns[i].setAttribute('aria-label', t('dir_' + btns[i].getAttribute('data-dir')));
    }
  }

  /* ---------- Touch: Wischgesten auf dem Spielfeld ---------- */
  var touchStartX = 0, touchStartY = 0, touchActive = false;
  function bindSwipe() {
    if (!canvas) return;
    canvas.addEventListener('touchstart', function (e) {
      if (!e.touches || !e.touches.length) return;
      touchActive = true;
      touchStartX = e.touches[0].clientX;
      touchStartY = e.touches[0].clientY;
    }, { passive: true });
    canvas.addEventListener('touchmove', function (e) {
      // Scroll auf dem Feld unterbinden (touch-action:none deckt das ab,
      // dieser Guard sichert aeltere Engines zusaetzlich).
      if (touchActive && e.cancelable) e.preventDefault();
    }, { passive: false });
    canvas.addEventListener('touchend', function (e) {
      if (!touchActive) return;
      touchActive = false;
      var ch = (e.changedTouches && e.changedTouches.length) ? e.changedTouches[0] : null;
      if (!ch) return;
      var dx = ch.clientX - touchStartX;
      var dy = ch.clientY - touchStartY;
      if (Math.abs(dx) < SWIPE_MIN && Math.abs(dy) < SWIPE_MIN) return;
      if (Math.abs(dx) > Math.abs(dy)) {
        enqueueDir(dx > 0 ? 1 : -1, 0);
      } else {
        enqueueDir(0, dy > 0 ? 1 : -1);
      }
    }, { passive: true });
  }

  /* ---------- Sichtbarkeit: Canvas und Logik bei verstecktem Tab anhalten ---------- */
  function onVisibility() {
    if (document.hidden) {
      stopLoop();
    } else {
      if (!paused && !over) startLoop();
    }
  }

  /* ---------- reduced-motion live verfolgen (nur Zier betroffen) ---------- */
  function onReduceChange() {
    reduceMotion = reduceMQ.matches;
    render();
  }

  /* ---------- Statische Texte und Rechtslinks ---------- */
  function applyTexts() {
    if (subtitleEl) subtitleEl.textContent = t('subtitle');
    setText('navPrivacy', t('nav_privacy'));
    setText('navImprint', t('nav_imprint'));
    setText('homeLabel', t('home'));
    var homeLinkEl = document.getElementById('homeLink');
    if (homeLinkEl) homeLinkEl.setAttribute('aria-label', t('home_aria'));
    var rankingsLinkEl = document.getElementById('rankingsLink');
    if (rankingsLinkEl) rankingsLinkEl.setAttribute('aria-label', t('rankings_aria'));
    setText('rankingsLabel', t('rankings'));
    setText('helpSummary', t('help_summary'));
    setText('help1', t('help_1'));
    setText('help2', t('help_2'));
    setText('help3', t('help_3'));
    setText('restartBtn', t('restart'));
    if (restartBtn) restartBtn.setAttribute('aria-label', t('aria_restart'));
    if (canvas) canvas.setAttribute('aria-label', t('aria_field'));
    setText('help4', t('help_4'));
    setPauseLabels();
    applyDpadLabels();
    refreshThemeBar();
    refreshLangBar();
    if (diffRowEl) diffRowEl.setAttribute('aria-label', t('diff_group'));
    refreshDiffButtons();
    updateScore();
    refreshOverlayTexts();
  }
  function setText(id, val) {
    var el = document.getElementById(id);
    if (el) el.textContent = val;
  }
  function setFooterLinks() {
    var lang = loadLang();
    if (linkPrivacyEl) linkPrivacyEl.setAttribute('href', '../datenschutz-' + lang + '.html');
    if (linkImprintEl) linkImprintEl.setAttribute('href', '../impressum-' + lang + '.html');
  }

  /* ---------- Service Worker: nur https oder localhost, nie ueber file:// ---------- */
  function registerServiceWorker() {
    try {
      if (!('serviceWorker' in navigator)) return;
      var proto = location.protocol;
      var host = location.hostname;
      var secure = (proto === 'https:') ||
                   (proto === 'http:' && (host === 'localhost' || host === '127.0.0.1' || host === '[::1]'));
      if (!secure) return; // ueber file:// leise nichts tun, Spiel bleibt voll spielbar
      window.addEventListener('load', function () {
        try {
          navigator.serviceWorker.register('sw.js').catch(function () { /* still ignorieren */ });
        } catch (e) { /* nie crashen */ }
      });
    } catch (e) { /* nie crashen */ }
  }

  /* ---------- Start ---------- */
  function init() {
    migrateOldBest();
    buildThemeBar();
    buildLangBar();
    buildDiffRow();
    document.documentElement.lang = lang;
    applyTheme();         // setzt data-theme, Farben, erstes Render kommt nach reset
    applyTexts();
    setFooterLinks();
    bindDpad();
    bindSwipe();

    readColors();
    sizeCanvas();
    reset();
    render();

    // Eingaben
    window.addEventListener('keydown', onKeyDown);
    if (pauseBtn) pauseBtn.addEventListener('click', togglePause);
    if (restartBtn) restartBtn.addEventListener('click', restartGame);
    if (overlayBtn) overlayBtn.addEventListener('click', function () {
      if (over) restartGame(); else resumeGame();
    });

    // System Theme und reduced-motion live
    if (systemDarkMQ.addEventListener) systemDarkMQ.addEventListener('change', function () { if (theme === 'auto') applyTheme(); });
    else if (systemDarkMQ.addListener) systemDarkMQ.addListener(function () { if (theme === 'auto') applyTheme(); });
    if (reduceMQ.addEventListener) reduceMQ.addEventListener('change', onReduceChange);
    else if (reduceMQ.addListener) reduceMQ.addListener(onReduceChange);

    // Groesse und Sichtbarkeit
    var resizeTimer = 0;
    window.addEventListener('resize', function () {
      if (resizeTimer) window.clearTimeout(resizeTimer);
      resizeTimer = window.setTimeout(function () { sizeCanvas(); render(); }, 150);
    });
    document.addEventListener('visibilitychange', onVisibility);

    registerServiceWorker();
    startLoop();
  }

  init();
})();
