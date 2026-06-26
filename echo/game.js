/* ============================================================
   dailycode  Viertes Spiel  (Arbeitstitel echo, kein Eigenname im Text)
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
  var PREVIEW_MIN = 1000;       // Untergrenze der Vorab-Ansicht (Konstante)
  var FLIP_BACK_MS = 850;       // wie lange ein Fehlpaar sichtbar bleibt
  var LEVEL_CLEAR_MS = 700;     // kurze Pause nach geschaffter Stufe
  var MISTAKES_START = 5;       // laufweites Fehlerbudget
  var MISTAKES_REFILL = 3;      // Nachschlag je geschaffter Stufe
  var MISTAKES_CAP = 9;         // Obergrenze des Budgets

  /* ---------- Sprache: minimaler t() Tisch (Deutsch) ---------- */
  var STR = {
    subtitle: 'Praege dir die Paare ein und finde sie wieder.',
    lbl_level: 'Stufe',
    lbl_lives: 'Fehler übrig',
    lbl_score: 'Punkte',
    msg_memorize: 'Einpraegen',
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
    aria_board: 'Spielfeld mit Karten. Mit den Pfeiltasten bewegen, mit Enter aufdecken.',
    aria_restart: 'Neu starten',
    aria_hidden: 'Verdecktes Feld',
    aria_found: 'gefunden',
    help_summary: 'Hilfe',
    help_1: 'Zu Beginn jeder Stufe siehst du kurz alle Symbole, dann werden sie verdeckt.',
    help_2: 'Tippe zwei Felder an oder bewege den Rahmen mit den Pfeiltasten und bestaetige mit Enter.',
    help_3: 'Zwei gleiche bleiben offen. Geht das Fehlerbudget auf null, ist die Runde vorbei.',
    nav_privacy: 'Datenschutz',
    nav_imprint: 'Impressum'
  };
  function t(key) { var v = STR[key]; return v === undefined ? key : v; }

  /* ---------- Symbole: sechs Formen (verbatim) mal zwei Varianten ---------- */
  var SHAPES = [
    '<circle cx="50" cy="50" r="34"/>',                                                                  // 0 Kreis
    '<polygon points="50,16 84,82 16,82"/>',                                                             // 1 Dreieck
    '<rect x="20" y="20" width="60" height="60" rx="8"/>',                                               // 2 Quadrat
    '<polygon points="50,12 88,50 50,88 12,50"/>',                                                       // 3 Raute
    '<polygon points="50,10 59.4,37.1 88,37.6 65.2,54.9 73.5,82.4 50,66 26.5,82.4 34.8,54.9 12,37.6 40.6,37.1"/>', // 4 Stern
    '<polygon points="50,10 84.6,30 84.6,70 50,90 15.4,70 15.4,30"/>'                                    // 5 Sechseck
  ];
  var SHAPE_NAMES = ['Kreis', 'Dreieck', 'Quadrat', 'Raute', 'Stern', 'Sechseck'];
  // Symbol-Id 0..11: shape = id % 6, variant = floor(id / 6) (0 gefuellt, 1 Umriss)
  function shapeOf(id) { return id % 6; }
  function variantOf(id) { return Math.floor(id / 6); }
  function symbolSVG(id) {
    var cls = variantOf(id) === 0 ? 'sym sym-solid' : 'sym sym-outline';
    return '<svg class="' + cls + '" viewBox="0 0 100 100" aria-hidden="true" focusable="false">' + SHAPES[shapeOf(id)] + '</svg>';
  }
  function symbolName(id) {
    return SHAPE_NAMES[shapeOf(id)] + ' ' + (variantOf(id) === 0 ? 'gefüllt' : 'Umriss');
  }

  /* ---------- Lucide Bedien-Icons (ISC) ---------- */
  function svg(inner) {
    return '<svg viewBox="0 0 24 24" class="lucide" aria-hidden="true" focusable="false">' + inner + '</svg>';
  }
  var ICON = {
    sun: svg('<circle cx="12" cy="12" r="4"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="m4.93 4.93 1.41 1.41"/><path d="m17.66 17.66 1.41 1.41"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="m6.34 17.66-1.41 1.41"/><path d="m19.07 4.93-1.41 1.41"/>'),
    moon: svg('<path d="M20.985 12.486a9 9 0 1 1-9.473-9.472c.405-.022.617.46.402.803a6 6 0 0 0 8.268 8.268c.344-.215.825-.004.803.401"/>'),
    monitor: svg('<rect width="20" height="14" x="2" y="3" rx="2"/><line x1="8" x2="16" y1="21" y2="21"/><line x1="12" x2="12" y1="17" y2="21"/>')
  };
  var THEME_ICON = { auto: 'monitor', light: 'sun', dark: 'moon' };

  /* ---------- DOM ---------- */
  var themebarEl    = document.getElementById('themebar');
  var themeColorEl  = document.getElementById('themeColor');
  var themeFeedbackEl = document.getElementById('themeFeedback');
  var subtitleEl    = document.getElementById('subtitle');
  var statusEl      = document.getElementById('status');
  var boardEl       = document.getElementById('board');
  var overlayEl     = document.getElementById('overlay');
  var overlayTitleEl = document.getElementById('overlayTitle');
  var overlayScoreEl = document.getElementById('overlayScore');
  var overlayBtn    = document.getElementById('overlayBtn');
  var restartBtn    = document.getElementById('restartBtn');
  var hudLevelEl    = document.getElementById('hudLevel');
  var hudLivesEl    = document.getElementById('hudLives');
  var hudScoreEl    = document.getElementById('hudScore');
  var linkPrivacyEl = document.getElementById('linkPrivacy');
  var linkImprintEl = document.getElementById('linkImprint');

  /* ---------- Theme Zustand (geteilte Keys) ---------- */
  var THEME_KEY = 'dailycode:theme';
  var LANG_KEY = 'dailycode:lang';
  var THEMES = ['auto', 'light', 'dark'];
  var hasStorage = storageOK();
  var theme = loadTheme();
  var systemDarkMQ = window.matchMedia('(prefers-color-scheme: dark)');
  var reduceMQ = window.matchMedia('(prefers-reduced-motion: reduce)');
  var themeToggleBtn = null;
  var fbTimer = 0;

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
    if (!themeToggleBtn) return;
    themeToggleBtn.innerHTML = ICON[THEME_ICON[theme]];
    themeToggleBtn.setAttribute('aria-label', t('theme_group') + ': ' + t('theme_' + theme));
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
  var best = 0;                 // Highscore-Logik vorbereitet, Persistenz spaeter
  var mistakes = MISTAKES_START;
  var pairsThisLevel = START_PAIRS;
  var foundPairs = 0;
  var firstPick = -1;
  var focusIndex = 0;

  function pairsForLevel(lvl) { return Math.min(MAX_PAIRS, START_PAIRS + (lvl - 1) * PAIRS_STEP); }
  function colsForPairs(p) { return (p <= 6) ? 3 : 4; }
  function previewMs(lvl) { return Math.max(PREVIEW_MIN, PREVIEW_BASE - (lvl - 1) * PREVIEW_STEP); }

  /* ---------- Highscore-Logik vorbereitet (Persistenz folgt spaeter) ---------- */
  function recordBest() { if (score > best) best = score; /* spaeter: lokal speichern */ }

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
  }
  function announce(msg) { if (statusEl) statusEl.textContent = msg; }

  /* ---------- Stufenablauf ---------- */
  function startLevel() {
    makeBoard();
    updateHud();
    // Vorab-Ansicht: alle Karten offen zeigen, Eingaben gesperrt.
    phase = 'preview';
    for (var i = 0; i < cards.length; i++) setCardState(i, 'up');
    announce(t('lbl_level') + ' ' + level + ', ' + t('msg_memorize'));
    tStart(previewMs(level), previewDone);
  }
  function previewDone() {
    for (var i = 0; i < cards.length; i++) {
      if (cards[i].state !== 'matched') setCardState(i, 'down');
    }
    phase = 'play';
    announce(t('msg_go'));
  }

  /* ---------- Karte aufdecken (einziger Eingang fuer Klick UND Tastatur) ----------
     Genau hier sitzt die lueckenlose Eingabesperre: ausserhalb von
     'play' wird nichts aufgedeckt, egal ob Klick, Tipp oder Enter. */
  function onActivate(i) {
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
      announce(t('msg_match'));
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
        updateHud();
        if (mistakes <= 0) { gameOver(); return; }
        announce(t('msg_nomatch'));
        phase = 'play';
      });
    }
  }

  function levelClear() {
    phase = 'levelclear';
    score += 50 * level;
    updateHud();
    announce(t('msg_levelup'));
    tStart(LEVEL_CLEAR_MS, function () {
      level += 1;
      mistakes = Math.min(MISTAKES_CAP, mistakes + MISTAKES_REFILL);
      startLevel();
    });
  }

  function gameOver() {
    phase = 'over';
    recordBest();
    showOverlay(t('over_title'), t('lbl_level') + ' ' + level + ', ' + t('lbl_score') + ' ' + score, t('over_restart'));
    announce(t('over_title') + ', ' + t('lbl_score') + ' ' + score);
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
    level = 1; score = 0; mistakes = MISTAKES_START;
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
    setText('navPrivacy', t('nav_privacy'));
    setText('navImprint', t('nav_imprint'));
    setText('helpSummary', t('help_summary'));
    setText('help1', t('help_1'));
    setText('help2', t('help_2'));
    setText('help3', t('help_3'));
    setText('restartBtn', t('restart'));
    if (restartBtn) restartBtn.setAttribute('aria-label', t('aria_restart'));
    if (boardEl) boardEl.setAttribute('aria-label', t('aria_board'));
  }
  function setText(id, val) { var el = document.getElementById(id); if (el) el.textContent = val; }
  function setFooterLinks() {
    var lang = loadLang();
    if (linkPrivacyEl) linkPrivacyEl.setAttribute('href', '../datenschutz-' + lang + '.html');
    if (linkImprintEl) linkImprintEl.setAttribute('href', '../impressum-' + lang + '.html');
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
    setFooterLinks();
    buildThemeBar();
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
