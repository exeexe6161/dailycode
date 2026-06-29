/* ============================================================
   dailycode  Zweites Spiel  (Arbeitstitel, kein Eigenname im Text)
   Eine wachsende Kette aus Segmenten zieht in Schrittrichtung ueber
   ein Raster. Durchlaessige Raender (Wrap-around), Niederlage nur bei
   Selbstkollision. Vanilla JS, keine Libraries, keine externen
   Ressourcen, keine data-URI. Strikte CSP konform: keine Inline-
   Styles im Markup, dynamische Werte nur ueber CSSOM und Canvas.
   Theme und Sprache teilen die bestehenden Keys (dailycode:theme,
   dailycode:lang). i18n der Spieltexte folgt als eigener Schritt,
   die Texte liegen bereits hinter einem t() Muster.
   ============================================================ */
(function () {
  'use strict';

  /* ---------- Spielkonstanten ----------
     Schrittzeit sinkt mit der Punktzahl stufenweise bis zu einer
     Obergrenze (STEP_MIN), darunter wird nicht weiter beschleunigt. */
  var GRID = 17;                 // Raster 17 x 17
  var STEP_BASE = 150;           // ms pro Schritt bei Punktzahl 0
  var STEP_MIN = 70;             // Obergrenze fuer das Tempo (untere ms Grenze)
  var STEP_DEC = 12;             // ms schneller je Stufe
  var POINTS_PER_LEVEL = 4;      // alle 4 Punkte eine Stufe schneller
  var START_LEN = 3;             // Anfangslaenge der Kette
  var SWIPE_MIN = 24;            // Mindestweg fuer eine Wischgeste in px

  /* ---------- Sprache: minimaler t() Tisch (Deutsch) ----------
     Bewusst eine Sprache in diesem Schritt. Migration spaeter:
     Tisch je Sprache erweitern, Aufruf bleibt t(key). */
  var STR = {
    subtitle: 'Lenke die wachsende Kette ueber das Feld.',
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
    help_summary: 'Hilfe',
    help_1: 'Pfeiltasten oder WASD steuern die Kette, Wischen geht auch.',
    help_2: 'Sammle die leuchtenden Punkte, die Kette waechst und wird schneller.',
    help_3: 'Die Raender sind offen, nur der Lauf in den eigenen Koerper beendet das Spiel.',
    nav_privacy: 'Datenschutz',
    nav_imprint: 'Impressum',
    back: 'Zurueck',
    back_aria: 'Zurueck zur Startseite'
  };
  function t(key) {
    var v = STR[key];
    return v === undefined ? key : v;
  }

  /* ---------- Lucide Bedien-Icons (ISC), Pfade verbatim ----------
     Zur Buildzeit eingebettet, kein Laufzeitnachladen, kein CDN. */
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
  var scoreEl       = document.getElementById('score');
  var bestEl        = document.getElementById('best');
  var canvas        = document.getElementById('playfield');
  var overlayEl     = document.getElementById('overlay');
  var overlayTitleEl = document.getElementById('overlayTitle');
  var overlayScoreEl = document.getElementById('overlayScore');
  var overlayBtn    = document.getElementById('overlayBtn');
  var pauseBtn      = document.getElementById('pauseBtn');
  var restartBtn    = document.getElementById('restartBtn');
  var dpadEl        = document.getElementById('dpad');
  var linkPrivacyEl = document.getElementById('linkPrivacy');
  var linkImprintEl = document.getElementById('linkImprint');

  var ctx = (canvas && canvas.getContext) ? canvas.getContext('2d') : null;

  /* ---------- Theme Zustand (geteilte Keys mit Portal und Spiel 1) ---------- */
  var THEME_KEY = 'dailycode:theme';
  var LANG_KEY = 'dailycode:lang';
  var THEMES = ['auto', 'light', 'dark'];
  var hasStorage = storageOK();
  var theme = loadTheme();
  var systemDarkMQ = window.matchMedia('(prefers-color-scheme: dark)');
  var reduceMQ = window.matchMedia('(prefers-reduced-motion: reduce)');
  var reduceMotion = reduceMQ.matches;
  var themeToggleBtn = null;
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
    stepMs = STEP_BASE;
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
    stepMs = Math.max(STEP_MIN, STEP_BASE - level * STEP_DEC);
  }

  function updateScore() {
    if (scoreEl) scoreEl.textContent = t('score') + ' ' + score;
    updateBest();
  }

  /* ---------- Bestwert (einheitliches null-Muster, Vorbild grid9) ----------
     Score, hoeher ist besser. Kein gespeicherter Wert ergibt null, daher
     "noch keine" statt 0. hasStorage-Preflight, try/catch, Bereichspruefung. */
  function bestKey() { return 'dailycode:drift:best'; }
  function loadBestVal() {
    if (!hasStorage) return null;
    try { var v = window.localStorage.getItem(bestKey()); if (v == null) return null; var n = parseInt(v, 10); return (isNaN(n) || n < 0) ? null : n; }
    catch (e) { return null; }
  }
  function saveBest(val) { if (!hasStorage) return; try { window.localStorage.setItem(bestKey(), String(val)); } catch (e) {} }
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

  function showOverlay(title, scoreText, btnText) {
    if (overlayTitleEl) overlayTitleEl.textContent = title;
    if (overlayScoreEl) {
      overlayScoreEl.textContent = scoreText || '';
      overlayScoreEl.hidden = !scoreText;
    }
    if (overlayBtn) overlayBtn.textContent = btnText;
    if (overlayEl) overlayEl.hidden = false;
  }
  function hideOverlay() {
    if (overlayEl) overlayEl.hidden = true;
  }

  function pauseGame() {
    if (over || paused) return;
    paused = true;
    stopLoop();
    setPauseLabels();
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
    updateBest();
    showOverlay(won ? t('won_title') : t('over_title'),
      t('score') + ' ' + score + (best != null ? '  ·  ' + t('lbl_best') + ' ' + best : ''),
      t('over_restart'));
    if (scoreEl) scoreEl.textContent = (won ? t('won_title') : t('over_title')) + ', ' + t('score') + ' ' + score;
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
        btn.setAttribute('aria-label', t('dir_' + name));
        btn.addEventListener('click', function () {
          var d = DIRS[name];
          if (d) enqueueDir(d.x, d.y);
        });
      })(btns[i]);
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
    setText('backLabel', t('back'));
    var backLinkEl = document.getElementById('backLink');
    if (backLinkEl) backLinkEl.setAttribute('aria-label', t('back_aria'));
    setText('helpSummary', t('help_summary'));
    setText('help1', t('help_1'));
    setText('help2', t('help_2'));
    setText('help3', t('help_3'));
    setText('restartBtn', t('restart'));
    if (restartBtn) restartBtn.setAttribute('aria-label', t('aria_restart'));
    if (canvas) canvas.setAttribute('aria-label', t('aria_field'));
    setPauseLabels();
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
    buildThemeBar();
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
