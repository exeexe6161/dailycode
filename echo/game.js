/* ============================================================
   dailycode  Viertes Spiel  (PuzzlePure Echo)
   Gedaechtnis-Paare mit Vorab-Ansicht. Zu Beginn jeder Stufe werden
   alle Symbole kurz gezeigt, dann verdeckt. Der Spieler deckt zwei
   Felder auf, gleiche bleiben offen. Symbole werden PRIMAER ueber die
   Form unterschieden (sechs Formen mal gefuellt oder Umriss), eine
   Tinte, damit das Spiel in Graustufen funktioniert.

   DOM Raster aus echten Knoepfen (native Fokussierung, Tastatur,
   44px Ziele). Kein Canvas. Vanilla JS, keine Libraries, keine
   externen Ressourcen, keine data-URI. Strikte CSP konform: keine
   Inline-Styles, Zustaende ueber Klassen, Rasterspalten ueber ein
   data-cols Attribut. Theme und Sprache teilen die bestehenden Keys
   (dailycode:theme, dailycode:lang). i18n der Spieltexte folgt als
   eigener Schritt, die Texte liegen hinter einem t() Muster.

   Lehre aus dem dritten Spiel: in init() erst Datenstrukturen und das
   Raster aufbauen, DANN Theme und der erste sichtbare Aufbau. Die
   Aufbau- und Aktualisierungsfunktionen sind zusaetzlich defensiv
   gegen einen noch leeren Zustand abgesichert.
   ============================================================ */
(function () {
  'use strict';

  /* ---------- Spielkonstanten ---------- */
  var START_PAIRS = 6;          // Stufe 1
  var PAIRS_STEP = 2;           // mehr Paare je Stufe
  var MAX_PAIRS = 12;           // Obergrenze (sechs Formen mal zwei Varianten)
  var PREVIEW_BASE = 3000;      // ms Vorab-Ansicht bei Stufe 1
  var PREVIEW_STEP = 400;       // ms kuerzer je Stufe
  var PREVIEW_MIN = 1800;       // Untergrenze der Vorab-Ansicht (Konstante)
  var FLIP_BACK_MS = 850;       // wie lange ein Fehlpaar sichtbar bleibt
  var LEVEL_CLEAR_MS = 700;     // kurze Pause nach geschaffter Stufe
  var MISTAKES_START = 5;       // laufweites Fehlerbudget, Mittel (bisheriges Verhalten)
  var MISTAKES_REFILL = 3;      // Nachschlag je geschaffter Stufe, fuer alle Stufen gleich
  var MISTAKES_CAP = 9;         // Obergrenze des Budgets, fuer alle Stufen gleich

  /* Schwierigkeit ueber Startpaare, Vorschauzeit und Fehlerbudget der
     ersten Stufe. Mittel (2) entspricht exakt dem bisherigen Verhalten
     (START_PAIRS/PREVIEW_BASE/MISTAKES_START oben). PAIRS_STEP/PREVIEW_STEP/
     MISTAKES_REFILL/MISTAKES_CAP bleiben fuer alle Stufen gleich, nur der
     Startwert je Lauf unterscheidet sich, die Eskalation je Stufe bleibt
     identisch. Kein Timer, ruhiges Einpraegen bleibt Teil der Spielidee. */
  var DIFF_BASE = {
    1: { pairs: 4, preview: 3800, mistakes: 6 },
    2: { pairs: START_PAIRS, preview: PREVIEW_BASE, mistakes: MISTAKES_START },
    3: { pairs: 8, preview: 2400, mistakes: 4 },
    4: { pairs: 10, preview: PREVIEW_MIN, mistakes: 3 }
  };

  /* ---------- Sprachen: alle sichtbaren Strings und aria-labels ---------- */
  var LANGS = [
    { code: 'de', label: 'DE', name: 'Deutsch' },
    { code: 'en', label: 'EN', name: 'English' },
    { code: 'tr', label: 'TR', name: 'Türkçe' }
  ];

  var I18N = {
    de: {
      subtitle: 'Decke zwei Karten auf, merke dir die Paare und finde am Ende alle wieder.',
      lbl_level: 'Stufe',
      lbl_lives: 'Fehler übrig',
      lbl_score: 'Punkte',
      lbl_best: 'Bestwert',
      best_none: 'noch keine',
      msg_memorize: 'Einprägen',
      msg_go: 'Los, finde die Paare',
      msg_match: 'Paar gefunden',
      msg_nomatch: 'Kein Paar',
      msg_levelup: 'Stufe geschafft',
      over_title: 'Spiel vorbei',
      over_restart: 'Neu starten',
      restart: 'Neu',
      theme_group: 'Darstellung',
      theme_auto: 'Auto',
      theme_light: 'Hell',
      theme_dark: 'Dunkel',
      aria_lang_group: 'Sprache',
      aria_board: 'Spielfeld mit Karten. Mit den Pfeiltasten bewegen, mit Enter aufdecken.',
      aria_restart: 'Neu starten',
      aria_hidden: 'Verdecktes Feld',
      aria_found: 'gefunden',
      diff_group: 'Schwierigkeit',
      diff_1: 'Leicht', diff_2: 'Mittel', diff_3: 'Schwer', diff_4: 'Experte',
      aria_diff_1: 'Leicht wählen', aria_diff_2: 'Mittel wählen', aria_diff_3: 'Schwer wählen', aria_diff_4: 'Experte wählen',
      help_summary: 'So funktioniert es',
      help_1: 'Zu Beginn jeder Stufe siehst du kurz alle Symbole, dann werden sie verdeckt.',
      help_2: 'Tippe zwei Felder an oder bewege den Rahmen mit den Pfeiltasten und bestätige mit Enter.',
      help_3: 'Zwei gleiche bleiben offen. Geht das Fehlerbudget auf null, ist die Runde vorbei.',
      help_4: 'Die Schwierigkeit verändert Paare, Vorschau und Fehlerbudget.',
      nav_privacy: 'Datenschutz',
      nav_imprint: 'Impressum',
      home: 'Startseite',
      home_aria: 'Zur Startseite',
      rankings: 'Rangliste',
      rankings_aria: 'Zur Rangliste',
      sym_circle: 'Kreis',
      sym_triangle: 'Dreieck',
      sym_square: 'Quadrat',
      sym_diamond: 'Raute',
      sym_star: 'Stern',
      sym_hexagon: 'Sechseck',
      sym_solid: 'gefüllt',
      sym_outline: 'Umriss'
    },
    en: {
      subtitle: 'Reveal two cards, remember the pairs and find them all in the end.',
      lbl_level: 'Level',
      lbl_lives: 'Mistakes left',
      lbl_score: 'Points',
      lbl_best: 'Best',
      best_none: 'none yet',
      msg_memorize: 'Memorize',
      msg_go: 'Go, find the pairs',
      msg_match: 'Pair found',
      msg_nomatch: 'No match',
      msg_levelup: 'Level cleared',
      over_title: 'Game over',
      over_restart: 'Restart',
      restart: 'New',
      theme_group: 'Appearance',
      theme_auto: 'Auto',
      theme_light: 'Light',
      theme_dark: 'Dark',
      aria_lang_group: 'Language',
      aria_board: 'Game board with cards. Move with the arrow keys, reveal with Enter.',
      aria_restart: 'Restart',
      aria_hidden: 'Hidden card',
      aria_found: 'found',
      diff_group: 'Difficulty',
      diff_1: 'Easy', diff_2: 'Medium', diff_3: 'Hard', diff_4: 'Expert',
      aria_diff_1: 'Select easy', aria_diff_2: 'Select medium', aria_diff_3: 'Select hard', aria_diff_4: 'Select expert',
      help_summary: 'How it works',
      help_1: 'At the start of each level you briefly see all symbols, then they are hidden.',
      help_2: 'Tap two cards, or move the frame with the arrow keys and confirm with Enter.',
      help_3: 'Two matching cards stay open. When the mistake budget reaches zero, the round ends.',
      help_4: 'The difficulty changes pairs, preview and mistake budget.',
      nav_privacy: 'Privacy',
      nav_imprint: 'Imprint',
      home: 'Home',
      home_aria: 'Go to home',
      rankings: 'Rankings',
      rankings_aria: 'To the rankings',
      sym_circle: 'Circle',
      sym_triangle: 'Triangle',
      sym_square: 'Square',
      sym_diamond: 'Diamond',
      sym_star: 'Star',
      sym_hexagon: 'Hexagon',
      sym_solid: 'filled',
      sym_outline: 'outline'
    },
    tr: {
      subtitle: 'İki kart aç, çiftleri aklında tut ve sonunda hepsini bul.',
      lbl_level: 'Seviye',
      lbl_lives: 'Kalan hata',
      lbl_score: 'Puan',
      lbl_best: 'En iyi',
      best_none: 'henüz yok',
      msg_memorize: 'Ezberle',
      msg_go: 'Haydi, çiftleri bul',
      msg_match: 'Çift bulundu',
      msg_nomatch: 'Eşleşme yok',
      msg_levelup: 'Seviye tamamlandı',
      over_title: 'Oyun bitti',
      over_restart: 'Yeniden başlat',
      restart: 'Yeni',
      theme_group: 'Görünüm',
      theme_auto: 'Otomatik',
      theme_light: 'Açık',
      theme_dark: 'Koyu',
      aria_lang_group: 'Dil',
      aria_board: 'Kartlı oyun alanı. Ok tuşlarıyla hareket et, Enter ile aç.',
      aria_restart: 'Yeniden başlat',
      aria_hidden: 'Kapalı kart',
      aria_found: 'bulundu',
      diff_group: 'Zorluk',
      diff_1: 'Kolay', diff_2: 'Orta', diff_3: 'Zor', diff_4: 'Uzman',
      aria_diff_1: 'Kolay seç', aria_diff_2: 'Orta seç', aria_diff_3: 'Zor seç', aria_diff_4: 'Uzman seç',
      help_summary: 'Nasıl çalışır',
      help_1: 'Her seviyenin başında tüm simgeleri kısaca görürsün, sonra kapanırlar.',
      help_2: 'İki karta dokun veya çerçeveyi ok tuşlarıyla hareket ettirip Enter ile onayla.',
      help_3: 'Eşleşen iki kart açık kalır. Hata bütçesi sıfırlanınca tur biter.',
      help_4: 'Zorluk çiftleri, ön izlemeyi ve hata bütçesini değiştirir.',
      nav_privacy: 'Gizlilik',
      nav_imprint: 'Künye',
      home: 'Ana sayfa',
      home_aria: 'Ana sayfaya git',
      rankings: 'Sıralama',
      rankings_aria: 'Sıralamaya git',
      sym_circle: 'Daire',
      sym_triangle: 'Üçgen',
      sym_square: 'Kare',
      sym_diamond: 'Karo',
      sym_star: 'Yıldız',
      sym_hexagon: 'Altıgen',
      sym_solid: 'dolu',
      sym_outline: 'anahat'
    }
  };

  function t(key) {
    var table = I18N[lang] || I18N.en;
    var v = table[key];
    if (v === undefined) v = I18N.en[key]; // Fallback en
    return v === undefined ? key : v;
  }

  /* ---------- Symbole: sechs Formen (verbatim) mal zwei Varianten ---------- */
  var SHAPES = [
    '<circle cx="50" cy="50" r="34"/>',                                                                  // 0 Kreis
    '<polygon points="50,16 84,82 16,82"/>',                                                             // 1 Dreieck
    '<rect x="20" y="20" width="60" height="60" rx="8"/>',                                               // 2 Quadrat
    '<polygon points="50,12 88,50 50,88 12,50"/>',                                                       // 3 Raute
    '<polygon points="50,10 59.4,37.1 88,37.6 65.2,54.9 73.5,82.4 50,66 26.5,82.4 34.8,54.9 12,37.6 40.6,37.1"/>', // 4 Stern
    '<polygon points="50,10 84.6,30 84.6,70 50,90 15.4,70 15.4,30"/>'                                    // 5 Sechseck
  ];
  var SHAPE_KEYS = ['sym_circle', 'sym_triangle', 'sym_square', 'sym_diamond', 'sym_star', 'sym_hexagon'];
  // Symbol-Id 0..11: shape = id % 6, variant = floor(id / 6) (0 gefuellt, 1 Umriss)
  function shapeOf(id) { return id % 6; }
  function variantOf(id) { return Math.floor(id / 6); }
  function symbolSVG(id) {
    var cls = variantOf(id) === 0 ? 'sym sym-solid' : 'sym sym-outline';
    return '<svg class="' + cls + '" viewBox="0 0 100 100" aria-hidden="true" focusable="false">' + SHAPES[shapeOf(id)] + '</svg>';
  }
  function symbolName(id) {
    return t(SHAPE_KEYS[shapeOf(id)]) + ' ' + t(variantOf(id) === 0 ? 'sym_solid' : 'sym_outline');
  }

  /* ---------- Lucide Bedien-Icons (ISC) ---------- */
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

  /* ---------- DOM ---------- */
  var langbarEl     = document.getElementById('langbar');
  var themebarEl    = document.getElementById('themebar');
  var themeColorEl  = document.getElementById('themeColor');
  var themeFeedbackEl = document.getElementById('themeFeedback');
  var subtitleEl    = document.getElementById('subtitle');
  var diffRowEl     = document.getElementById('diffRow');
  var statusEl      = document.getElementById('status');
  var boardEl       = document.getElementById('board');
  var overlayEl     = document.getElementById('overlay');
  var overlayTitleEl = document.getElementById('overlayTitle');
  var overlayScoreEl = document.getElementById('overlayScore');
  var ppScoreMountEl = document.getElementById('ppScoreMount');
  var overlayBtn    = document.getElementById('overlayBtn');
  var restartBtn    = document.getElementById('restartBtn');
  var hudLevelEl    = document.getElementById('hudLevel');
  var hudLivesEl    = document.getElementById('hudLives');
  var hudScoreEl    = document.getElementById('hudScore');
  var hudBestEl     = document.getElementById('hudBest');
  var linkPrivacyEl = document.getElementById('linkPrivacy');
  var linkImprintEl = document.getElementById('linkImprint');

  /* ---------- Theme Zustand (geteilte Keys) ---------- */
  var THEME_KEY = 'dailycode:theme';
  var LANG_KEY = 'dailycode:lang';
  var DIFFICULTY_KEY = 'dailycode:echo:difficulty';
  var THEMES = ['auto', 'light', 'dark'];
  var hasStorage = storageOK();
  var theme = loadTheme();
  var lang = loadLang();
  var difficulty = loadDifficulty();
  var diffButtons = [];
  var systemDarkMQ = window.matchMedia('(prefers-color-scheme: dark)');
  var reduceMQ = window.matchMedia('(prefers-reduced-motion: reduce)');
  var themeToggleBtn = null;
  var langToggleBtn = null;
  var fbTimer = 0;
  var lastAnnounceKind = null; // fuer Neu-Ansage bei Sprachwechsel

  function storageOK() {
    try { var k = '__dc_test__'; window.localStorage.setItem(k, '1'); window.localStorage.removeItem(k); return true; }
    catch (e) { return false; }
  }
  function loadTheme() {
    if (hasStorage) { try { var v = window.localStorage.getItem(THEME_KEY); if (v === 'auto' || v === 'light' || v === 'dark') return v; } catch (e) {} }
    return 'auto';
  }
  function saveTheme(v) { if (!hasStorage) return; try { window.localStorage.setItem(THEME_KEY, v); } catch (e) {} }
  function loadLang() {
    if (hasStorage) { try { var v = window.localStorage.getItem(LANG_KEY); if (v === 'de' || v === 'en' || v === 'tr') return v; } catch (e) {} }
    return 'de';
  }
  function saveLang(l) { if (!hasStorage) return; try { window.localStorage.setItem(LANG_KEY, l); } catch (e) {} }
  function setLang(l) {
    if (!I18N[l]) return;
    lang = l;
    saveLang(l);
    relocalize();
  }
  function effectiveDark() { return theme === 'dark' || (theme === 'auto' && systemDarkMQ.matches); }
  function updateThemeColor() { if (themeColorEl) themeColorEl.setAttribute('content', effectiveDark() ? '#0a0c11' : '#f4f5f7'); }
  function applyTheme() {
    // Theme beruehrt das Spielfeld NICHT, daher unabhaengig von der
    // Brett-Initialisierung. Trotzdem laeuft makeBoard in init() davor.
    document.documentElement.setAttribute('data-theme', theme);
    updateThemeColor();
    refreshThemeBar();
  }
  function setTheme(v) { if (THEMES.indexOf(v) === -1) return; theme = v; saveTheme(v); applyTheme(); }
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
  function cycleTheme() { var i = THEMES.indexOf(theme); setTheme(THEMES[(i + 1) % THEMES.length]); showThemeFeedback(); }
  function showThemeFeedback() {
    if (!themeFeedbackEl) return;
    themeFeedbackEl.textContent = t('theme_' + theme);
    themeFeedbackEl.classList.add('show');
    if (fbTimer) window.clearTimeout(fbTimer);
    fbTimer = window.setTimeout(function () { themeFeedbackEl.classList.remove('show'); }, 2200);
  }
  function refreshThemeBar() {
    if (themebarEl) themebarEl.setAttribute('aria-label', t('theme_group'));
    if (!themeToggleBtn) return;
    themeToggleBtn.innerHTML = ICON[THEME_ICON[theme]];
    themeToggleBtn.setAttribute('aria-label', t('theme_group') + ': ' + t('theme_' + theme));
  }

  /* ---------- Sprachumschalter ---------- */
  // Weltkugel plus aktuelles Kuerzel, zyklisch DE -> EN -> TR -> DE.
  function langName(c) {
    for (var i = 0; i < LANGS.length; i++) { if (LANGS[i].code === c) return LANGS[i].name; }
    return c;
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
    showLangFeedback();
  }

  // Gleiche Rueckmeldung wie beim Theme Wechsel, damit Screenreader Nutzer
  // auch den Sprachwechsel per aria-live bestaetigt bekommen.
  function showLangFeedback() {
    if (!themeFeedbackEl) return;
    themeFeedbackEl.textContent = langName(lang);
    themeFeedbackEl.classList.add('show');
    if (fbTimer) window.clearTimeout(fbTimer);
    fbTimer = window.setTimeout(function () { themeFeedbackEl.classList.remove('show'); }, 2200);
  }
  function refreshLangBar() {
    if (langbarEl) langbarEl.setAttribute('aria-label', t('aria_lang_group'));
    if (!langToggleBtn) return;
    langToggleBtn.innerHTML = ICON.globe + '<span class="lang-code">' + lang.toUpperCase() + '</span>';
    langToggleBtn.setAttribute('aria-label', t('aria_lang_group') + ': ' + langName(lang));
  }

  /* ---------- Schwierigkeit: Wahl laden, speichern, anzeigen ----------
     Steuert Startpaare, Vorschauzeit und Fehlerbudget der ersten Stufe
     (DIFF_BASE oben), kein Timer. Mittel (2) entspricht dem bisherigen,
     immer gleichen Verhalten. Ein Wechsel startet immer einen frischen
     Lauf (wie der Neu Knopf), damit nie zwei Stufen innerhalb eines
     Laufs vermischt gewertet werden. */
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

  /* ---------- Pausierbarer Timer ----------
     Einer reicht, da die Phasen sich gegenseitig ausschliessen. Wird
     der Tab versteckt, friert die verbleibende Zeit ein (tPause), beim
     Zurueckkommen laeuft sie mit dem Rest weiter (tResume). So
     verstreicht insbesondere die Vorab-Ansicht im Hintergrund NICHT. */
  var T = { id: 0, cb: null, remaining: 0, startTs: 0, active: false };
  function nowMs() { return (window.performance && window.performance.now) ? window.performance.now() : Date.now(); }
  function tStart(ms, cb) { tCancel(); T.cb = cb; T.remaining = ms; tResume(); }
  function tResume() {
    if (T.active || T.cb == null) return;
    if (document.hidden) return;                 // im Hintergrund nicht starten
    T.startTs = nowMs();
    T.active = true;
    T.id = window.setTimeout(function () {
      T.active = false;
      var c = T.cb; T.cb = null; T.remaining = 0;
      if (c) c();
    }, Math.max(0, T.remaining));
  }
  function tPause() {
    if (!T.active) return;
    window.clearTimeout(T.id); T.id = 0;
    var el = nowMs() - T.startTs;
    T.remaining = Math.max(0, T.remaining - el);  // verbleibende Zeit einfrieren
    T.active = false;
  }
  function tCancel() { if (T.id) window.clearTimeout(T.id); T.id = 0; T.cb = null; T.active = false; T.remaining = 0; }

  /* ---------- Spielzustand ----------
     phase ist die EINZIGE Eingabeschranke: nur in 'play' darf eine
     Karte aufgedeckt werden. 'preview' und 'flip' sperren beide
     Eingabewege (Klick und Tastatur) ueber dieselbe Pruefung. */
  var phase = 'init';           // 'init' | 'preview' | 'play' | 'flip' | 'levelclear' | 'over'
  var cards = [];               // [{ id, state }]  state: 'down' | 'up' | 'matched'
  var cardEls = [];
  var cols = 3;
  var level = 1;
  var score = 0;
  var mistakes = (DIFF_BASE[difficulty] || DIFF_BASE[2]).mistakes;
  var wrongFlips = 0; // Zaehlt tatsaechlich gemachte Fehlversuche, fuer PuzzlePureScore Payload
  var ppResult = null;
  var lastPpPayload = null;
  var rewardsTriggered = false;
  var ppRoundId = window.PuzzlePureScore ? window.PuzzlePureScore.newRoundId('echo') : 'echo:' + Date.now();
  var pairsThisLevel = START_PAIRS;
  var foundPairs = 0;
  var firstPick = -1;
  var focusIndex = 0;

  function pairsForLevel(lvl) {
    var base = (DIFF_BASE[difficulty] || DIFF_BASE[2]).pairs;
    return Math.min(MAX_PAIRS, base + (lvl - 1) * PAIRS_STEP);
  }
  function colsForPairs(p) { return (p <= 6) ? 3 : 4; }
  function previewMs(lvl) {
    var base = (DIFF_BASE[difficulty] || DIFF_BASE[2]).preview;
    return Math.max(PREVIEW_MIN, base - (lvl - 1) * PREVIEW_STEP);
  }

  /* ---------- Bestwert (einheitliches null-Muster, Vorbild grid9) ----------
     Score, hoeher ist besser. Kein gespeicherter Wert ergibt null, daher
     "noch keine" statt 0. hasStorage-Preflight, try/catch, Bereichspruefung.
     Vor Batch 3 gab es nur einen Bestwert insgesamt (oldBestKey). Damit
     dieser nicht verloren geht, wird er einmalig additiv (nur falls besser)
     in den Bestwert der Stufe Mittel uebernommen, siehe migrateOldBest().
     Der alte Schluessel bleibt unveraendert bestehen. */
  function oldBestKey() { return 'dailycode:echo:best'; }
  function bestKey(diff) { return 'dailycode:echo:best:' + diff; }
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
    if (!hudBestEl) return;
    var v = loadBestVal();
    hudBestEl.textContent = (v == null) ? t('best_none') : String(v);
  }
  function recordBest() { var p = loadBestVal(); if (p == null || score > p) saveBest(score); updateBest(); }

  /* ---------- Brett aufbauen ---------- */
  function shuffle(arr) {
    for (var i = arr.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var tmp = arr[i]; arr[i] = arr[j]; arr[j] = tmp;
    }
    return arr;
  }

  function makeBoard() {
    pairsThisLevel = pairsForLevel(level);
    cols = colsForPairs(pairsThisLevel);

    // pairsThisLevel verschiedene Symbol-Ids aus dem Pool 0..11 waehlen,
    // jede genau zweimal, dann mischen.
    var pool = [];
    for (var s = 0; s < MAX_PAIRS; s++) pool.push(s);
    shuffle(pool);
    var chosen = pool.slice(0, pairsThisLevel);
    var deck = [];
    for (var p = 0; p < chosen.length; p++) { deck.push(chosen[p]); deck.push(chosen[p]); }
    shuffle(deck);

    cards = [];
    for (var d = 0; d < deck.length; d++) cards.push({ id: deck[d], state: 'down' });
    foundPairs = 0;
    firstPick = -1;
    focusIndex = 0;

    buildDOM();
  }

  function buildDOM() {
    if (!boardEl) return;
    boardEl.innerHTML = '';
    boardEl.setAttribute('data-cols', String(cols));
    cardEls = [];
    for (var i = 0; i < cards.length; i++) {
      (function (idx) {
        var btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'card';
        btn.setAttribute('data-i', String(idx));
        btn.tabIndex = (idx === 0) ? 0 : -1;
        btn.innerHTML =
          '<span class="card-face card-back"></span>' +
          '<span class="card-face card-front">' + symbolSVG(cards[idx].id) + '</span>';
        btn.addEventListener('click', function () { onActivate(idx); });
        boardEl.appendChild(btn);
        cardEls.push(btn);
      })(i);
    }
    setCursor();
    refreshAllAria();
  }

  // Defensiv: keine Annahme ueber Laenge, ueberspringt fehlende Knoepfe.
  function refreshAllAria() {
    for (var i = 0; i < cardEls.length; i++) setCardAria(i);
  }
  function setCardAria(i) {
    var el = cardEls[i]; if (!el) return;
    var card = cards[i]; if (!card) return;
    if (card.state === 'matched') el.setAttribute('aria-label', symbolName(card.id) + ', ' + t('aria_found'));
    else if (card.state === 'up') el.setAttribute('aria-label', symbolName(card.id));
    else el.setAttribute('aria-label', t('aria_hidden'));
    el.setAttribute('aria-pressed', String(card.state !== 'down'));
  }

  function setCardState(i, state) {
    var el = cardEls[i]; if (!el) return;
    cards[i].state = state;
    el.classList.toggle('is-up', state === 'up');
    el.classList.toggle('is-matched', state === 'matched');
    setCardAria(i);
  }

  function setCursor() {
    for (var i = 0; i < cardEls.length; i++) {
      var on = (i === focusIndex);
      cardEls[i].tabIndex = on ? 0 : -1;
      cardEls[i].classList.toggle('is-cursor', on);
    }
  }

  /* ---------- Anzeige ---------- */
  function updateHud() {
    if (hudLevelEl) hudLevelEl.textContent = String(level);
    if (hudLivesEl) hudLivesEl.textContent = String(mistakes);
    if (hudScoreEl) hudScoreEl.textContent = String(score);
    updateBest();
  }
  function announce(msg) { if (statusEl) statusEl.textContent = msg; }

  // Baut den Ansagetext je nach Ereignistyp aus dem AKTUELLEN Sprachstand.
  // lastAnnounceKind haelt den Typ fest, damit ein Sprachwechsel dieselbe
  // Ansage in der neuen Sprache neu rendern kann (siehe relocalize()).
  function statusText(kind) {
    switch (kind) {
      case 'memorize': return t('lbl_level') + ' ' + level + ', ' + t('msg_memorize');
      case 'go': return t('msg_go');
      case 'match': return t('msg_match');
      case 'nomatch': return t('msg_nomatch');
      case 'levelup': return t('msg_levelup');
      case 'over': return t('over_title') + ', ' + t('lbl_score') + ' ' + score;
      default: return '';
    }
  }
  function announceKind(kind) {
    lastAnnounceKind = kind;
    announce(statusText(kind));
  }

  /* ---------- Stufenablauf ---------- */
  function startLevel() {
    makeBoard();
    updateHud();
    // Vorab-Ansicht: alle Karten offen zeigen, Eingaben gesperrt.
    phase = 'preview';
    for (var i = 0; i < cards.length; i++) setCardState(i, 'up');
    announceKind('memorize');
    tStart(previewMs(level), previewDone);
  }
  function previewDone() {
    for (var i = 0; i < cards.length; i++) {
      if (cards[i].state !== 'matched') setCardState(i, 'down');
    }
    phase = 'play';
    announceKind('go');
  }

  /* ---------- Karte aufdecken (einziger Eingang fuer Klick UND Tastatur) ----------
     Genau hier sitzt die lueckenlose Eingabesperre: ausserhalb von
     'play' wird nichts aufgedeckt, egal ob Klick, Tipp oder Enter. */
  function onActivate(i) {
    // Cursor auf die tatsaechlich aktivierte Karte synchronisieren, auch bei
    // Mausklick/Touch, sonst startet die Pfeiltasten-Navigation danach von
    // einer veralteten Position aus weiter.
    if (focusIndex !== i) { focusIndex = i; setCursor(); }
    if (phase !== 'play') return;            // gesperrt waehrend preview, flip, levelclear, over
    var card = cards[i];
    if (!card || card.state !== 'down') return; // schon offen oder gefunden
    if (i === firstPick) return;             // Doppelaufdeckung derselben Karte verhindern

    setCardState(i, 'up');

    if (firstPick === -1) { firstPick = i; return; }

    // zweite Karte: auswerten
    var a = cards[firstPick], b = cards[i];
    if (a.id === b.id) {
      setCardState(firstPick, 'matched');
      setCardState(i, 'matched');
      firstPick = -1;
      foundPairs += 1;
      score += 10 * level;
      updateHud();
      announceKind('match');
      if (foundPairs >= pairsThisLevel) levelClear();
    } else {
      // Fehlpaar: sperren, kurz zeigen, dann beide zu. Budget minus eins.
      phase = 'flip';
      var firstIdx = firstPick;
      firstPick = -1;
      tStart(FLIP_BACK_MS, function () {
        setCardState(firstIdx, 'down');
        setCardState(i, 'down');
        mistakes -= 1;
        wrongFlips += 1;
        updateHud();
        if (mistakes <= 0) { gameOver(); return; }
        announceKind('nomatch');
        phase = 'play';
      });
    }
  }

  function levelClear() {
    phase = 'levelclear';
    score += 50 * level;
    updateHud();
    announceKind('levelup');
    tStart(LEVEL_CLEAR_MS, function () {
      level += 1;
      mistakes = Math.min(MISTAKES_CAP, mistakes + MISTAKES_REFILL);
      startLevel();
    });
  }

  // Baut den Overlay Inhalt aus dem AKTUELLEN Sprachstand. Wird bei
  // Spielende UND bei Sprachwechsel waehrend offenem Overlay aufgerufen.
  function renderOverlayTexts() {
    var best = loadBestVal();
    showOverlay(t('over_title'), t('lbl_level') + ' ' + level + ', ' + t('lbl_score') + ' ' + score + (best != null ? ', ' + t('lbl_best') + ' ' + best : ''), t('over_restart'));
  }

  function gameOver() {
    phase = 'over';
    recordBest();
    renderOverlayTexts();
    announceKind('over');
    // Endlosmodus ohne Sieg/Niederlage Konzept, daher 'complete'. mistakes
    // ist die tatsaechliche Anzahl Fehlversuche dieser Runde (wrongFlips),
    // perfect nur bei keinem einzigen Fehlversuch. Kein Zeitbonus, das
    // Spiel ist bewusst nicht zeitkritisch (nur die Vorschau ist getaktet).
    // difficulty kommt aus der vorab gewaehlten Stufe (Batch 3).
    if (window.PuzzlePureScore) {
      lastPpPayload = { game: 'echo', roundId: ppRoundId, difficulty: difficulty, outcome: 'complete', timeSeconds: null, parSeconds: null, mistakes: wrongFlips, hints: 0, perfect: wrongFlips === 0, rawGameScore: score, gameScoreMode: 'max' };
      ppResult = window.PuzzlePureScore.recordResult(lastPpPayload);
      rewardsTriggered = false;
    }
    if (ppScoreMountEl) {
      ppScoreMountEl.replaceChildren();
      if (ppResult && window.PuzzlePureScore) {
        var ppBlock = window.PuzzlePureScore.buildResultBlock(lang, ppResult);
        ppScoreMountEl.append(ppBlock);
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
  }

  function showOverlay(title, scoreText, btnText) {
    if (overlayTitleEl) overlayTitleEl.textContent = title;
    if (overlayScoreEl) { overlayScoreEl.textContent = scoreText || ''; overlayScoreEl.hidden = !scoreText; }
    if (overlayBtn) overlayBtn.textContent = btnText;
    if (overlayEl) overlayEl.hidden = false;
  }
  function hideOverlay() { if (overlayEl) overlayEl.hidden = true; }

  function restartGame() {
    tCancel();
    ppRoundId = window.PuzzlePureScore ? window.PuzzlePureScore.newRoundId('echo') : 'echo:' + Date.now();
    level = 1; score = 0; mistakes = (DIFF_BASE[difficulty] || DIFF_BASE[2]).mistakes; wrongFlips = 0;
    hideOverlay();
    startLevel();
  }

  /* ---------- Tastatur: Cursor bewegen und aufdecken ---------- */
  function isCardFocused() {
    var el = document.activeElement;
    return el && el.classList && el.classList.contains('card');
  }
  function moveCursor(dr, dc) {
    if (!cardEls.length) return;
    var rows = Math.ceil(cards.length / cols);
    var r = Math.floor(focusIndex / cols);
    var c = focusIndex % cols;
    r = Math.max(0, Math.min(rows - 1, r + dr));
    c = Math.max(0, Math.min(cols - 1, c + dc));
    var ni = r * cols + c;
    if (ni >= cards.length) ni = cards.length - 1;  // teilbare Raster, defensiv dennoch
    focusIndex = ni;
    setCursor();
    if (cardEls[focusIndex]) cardEls[focusIndex].focus();
  }
  function onKeyDown(e) {
    var k = e.key;
    if (k === 'ArrowUp' || k === 'w' || k === 'W') { if (allowCursorKeys()) { e.preventDefault(); moveCursor(-1, 0); } }
    else if (k === 'ArrowDown' || k === 's' || k === 'S') { if (allowCursorKeys()) { e.preventDefault(); moveCursor(1, 0); } }
    else if (k === 'ArrowLeft' || k === 'a' || k === 'A') { if (allowCursorKeys()) { e.preventDefault(); moveCursor(0, -1); } }
    else if (k === 'ArrowRight' || k === 'd' || k === 'D') { if (allowCursorKeys()) { e.preventDefault(); moveCursor(0, 1); } }
    else if (k === 'Enter' || k === ' ' || k === 'Spacebar') {
      // Bestaetigung nur, wenn der Fokus auf einer Karte liegt, damit
      // Steuerknoepfe (Neu, Theme, Overlay) normal bedienbar bleiben.
      if (isCardFocused()) { e.preventDefault(); onActivate(focusIndex); }
    }
  }
  // Pfeiltasten nur fuer den Kartencursor, wenn nicht ein anderes
  // Bedienelement den Fokus hat (z.B. Theme-Knopf).
  function allowCursorKeys() {
    var el = document.activeElement;
    if (!el || el === document.body) return true;
    if (el.classList && el.classList.contains('card')) return true;
    return false;
  }

  /* ---------- Sichtbarkeit: laufenden Timer (auch die Vorab-Ansicht) anhalten ---------- */
  function onVisibility() {
    if (document.hidden) tPause();
    else tResume();
  }
  function onReduceChange() { /* CSS uebernimmt das Abschalten der Uebergaenge */ }

  /* ---------- Statische Texte und Rechtslinks ---------- */
  function applyTexts() {
    if (subtitleEl) subtitleEl.textContent = t('subtitle');
    setText('lblLevel', t('lbl_level'));
    setText('lblLives', t('lbl_lives'));
    setText('lblScore', t('lbl_score'));
    setText('lblBest', t('lbl_best'));
    setText('navPrivacy', t('nav_privacy'));
    setText('navImprint', t('nav_imprint'));
    setText('homeLabel', t('home'));
    var homeLinkEl = document.getElementById('homeLink');
    if (homeLinkEl) homeLinkEl.setAttribute('aria-label', t('home_aria'));
    setText('rankingsLabel', t('rankings'));
    var rankingsLinkEl = document.getElementById('rankingsLink');
    if (rankingsLinkEl) rankingsLinkEl.setAttribute('aria-label', t('rankings_aria'));
    setText('helpSummary', t('help_summary'));
    setText('help1', t('help_1'));
    setText('help2', t('help_2'));
    setText('help3', t('help_3'));
    setText('help4', t('help_4'));
    setText('restartBtn', t('restart'));
    if (restartBtn) restartBtn.setAttribute('aria-label', t('aria_restart'));
    if (boardEl) boardEl.setAttribute('aria-label', t('aria_board'));
    if (diffRowEl) diffRowEl.setAttribute('aria-label', t('diff_group'));
    refreshDiffButtons();
  }
  function setText(id, val) { var el = document.getElementById(id); if (el) el.textContent = val; }
  function setFooterLinks() {
    if (linkPrivacyEl) linkPrivacyEl.setAttribute('href', '../datenschutz-' + lang + '.html');
    if (linkImprintEl) linkImprintEl.setAttribute('href', '../impressum-' + lang + '.html');
  }

  /* ---------- Neu Lokalisieren bei Sprachwechsel ----------
     Aktualisiert alle sichtbaren Texte SOFORT, auch mitten im Spiel:
     Karten-Aria-Labels, HUD (inkl. Bestwert-Text), letzte Ansage und ein
     offenes Spielende-Overlay. */
  function relocalize() {
    document.documentElement.lang = lang;
    applyTexts();
    refreshLangBar();
    refreshThemeBar();
    setFooterLinks();
    refreshAllAria();
    updateHud();
    if (lastAnnounceKind) announce(statusText(lastAnnounceKind));
    if (phase === 'over') renderOverlayTexts();
  }

  /* ---------- Service Worker: nur https oder localhost, nie ueber file:// ---------- */
  function registerServiceWorker() {
    try {
      if (!('serviceWorker' in navigator)) return;
      var proto = location.protocol, host = location.hostname;
      var secure = (proto === 'https:') ||
                   (proto === 'http:' && (host === 'localhost' || host === '127.0.0.1' || host === '[::1]'));
      if (!secure) return;
      window.addEventListener('load', function () {
        try { navigator.serviceWorker.register('sw.js').catch(function () {}); } catch (e) {}
      });
    } catch (e) {}
  }

  /* ---------- Start ----------
     Reihenfolge penibel: Theme und Texte zuerst (beruehren das Brett
     nicht), dann die Listener, DANN das Brett aufbauen und sichtbar
     machen (startLevel). Kein sichtbarer Aufbau greift auf ein noch
     nicht existierendes Brett zu. */
  function init() {
    migrateOldBest();
    document.documentElement.lang = lang;
    setFooterLinks();
    buildLangBar();
    buildThemeBar();
    buildDiffRow();
    applyTheme();
    applyTexts();

    window.addEventListener('keydown', onKeyDown);
    if (restartBtn) restartBtn.addEventListener('click', restartGame);
    if (overlayBtn) overlayBtn.addEventListener('click', function () { if (phase === 'over') restartGame(); });

    if (systemDarkMQ.addEventListener) systemDarkMQ.addEventListener('change', function () { if (theme === 'auto') applyTheme(); });
    else if (systemDarkMQ.addListener) systemDarkMQ.addListener(function () { if (theme === 'auto') applyTheme(); });
    if (reduceMQ.addEventListener) reduceMQ.addEventListener('change', onReduceChange);
    else if (reduceMQ.addListener) reduceMQ.addListener(onReduceChange);

    document.addEventListener('visibilitychange', onVisibility);

    registerServiceWorker();

    // Datenstruktur und Raster aufbauen, dann erste Vorab-Ansicht.
    startLevel();
  }

  init();
})();
